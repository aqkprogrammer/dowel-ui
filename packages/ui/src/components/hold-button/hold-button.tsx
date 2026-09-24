"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A button that only confirms once it has been held.
 *
 * Pressing — pointer down, or Enter/Space held — sweeps an ink layer across
 * the button from the reading start; letting go early drains it back, and
 * pressing again carries on from wherever the drain had got to. When the ink
 * reaches the end the icon turns into a tick, the label into `confirmedLabel`,
 * the button settles with a small pulse and `onConfirm` fires once.
 *
 * The ink is a copy of the button's face in the inverse colours, clipped by a
 * `clip-path` inset that reads `--hold-progress`, so the label changes colour
 * exactly where the ink has reached it. One clock drives both the picture and
 * the decision: a requestAnimationFrame loop turns elapsed time into progress,
 * writes it to that custom property (no React render per frame), and confirms
 * when it reaches 1 — the sweep can never finish before or after the action.
 * That duration is the hold itself, a clock rather than decoration, so it is
 * not scaled by `--motion-scale`.
 *
 * Reduced motion still requires the full hold. The ink then moves in quarter
 * steps with no sweep between them, and the label shows the percentage held.
 *
 * Accessibility: the name is the resting label throughout; "Press and hold to
 * confirm" is attached with aria-describedby, and the confirmation is announced
 * once through a polite live region. A confirmed button is aria-disabled (it
 * has done its job) until `resetAfter` returns it to rest. A click on its own —
 * including the synthetic click some screen readers send in browse mode — does
 * nothing: holding Enter or Space in focus/forms mode, or a long press, is the
 * way through.
 */

const PREFIX = "dowel-hold-button";

const STYLES = `
@keyframes ${PREFIX}-settle{0%{transform:scale(1)}35%{transform:scale(1.05)}70%{transform:scale(.99)}100%{transform:scale(1)}}
[data-slot=hold-button][data-state=confirmed]{animation:${PREFIX}-settle calc(460ms * var(--motion-scale,1)) var(--ease-out-quint)}
[data-slot=hold-button-ink]{clip-path:inset(0 calc(100% - var(--hold-progress,0) * 100%) 0 0)}
[data-slot=hold-button-ink]:dir(rtl){clip-path:inset(0 0 0 calc(100% - var(--hold-progress,0) * 100%))}
`;

/** Milliseconds a full button takes to drain; a partial one drains in proportion. */
const DRAIN = 420;

const REDUCE = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCE);
      query.addEventListener("change", notify);
      return () => {
        query.removeEventListener("change", notify);
      };
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

const holdButtonVariants = cva(
  cn(
    "relative isolate touch-none overflow-hidden [-webkit-touch-callout:none]",
    // Confirmed is aria-disabled, but it is done rather than unavailable: no dimming.
    "aria-disabled:opacity-100 data-[state=confirmed]:cursor-default",
  ),
  {
    variants: {
      /** The resting face, and the colour of the ink that sweeps over it. */
      variant: {
        default: "",
        destructive: "text-destructive hover:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const INK = {
  default: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
} as const;

const percent = new Intl.NumberFormat(undefined, { style: "percent" });

type Phase = "idle" | "holding" | "draining" | "confirmed";

export interface HoldButtonProps
  extends
    Omit<ButtonProps, "children" | "asChild" | "loading" | "variant">,
    VariantProps<typeof holdButtonVariants> {
  /** Resting label, and the button's accessible name. */
  label?: ReactNode;
  /** Shown once confirmed. */
  confirmedLabel?: ReactNode;
  /** Glyph beside the label; a tick replaces it on confirmation. */
  icon?: ReactNode;
  /** Milliseconds the button must be held. Default 1200. */
  holdDuration?: number;
  /** Called once when a hold completes. */
  onConfirm?: () => void;
  /** Called when a hold begins. */
  onHoldStart?: () => void;
  /** Called when a hold is let go before it completes. */
  onHoldCancel?: () => void;
  /** Milliseconds after confirming before it returns to rest. Omit to stay confirmed. */
  resetAfter?: number;
  /** Instructions attached with aria-describedby. */
  hint?: string;
  /** Announced on confirmation. Defaults to `confirmedLabel` when it is text. */
  announcement?: string;
}

function Stopwatch() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2 1.5M9.5 3h5M12 3v3" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const layer = cn(
  "col-start-1 row-start-1 flex items-center justify-center",
  "transition-[opacity,scale,rotate,filter] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "data-[state=hidden]:scale-50 data-[state=hidden]:opacity-0 data-[state=hidden]:ease-[var(--ease-out-quint)]",
);

const text = cn(
  "col-start-1 row-start-1 text-center whitespace-nowrap",
  "transition-[opacity,scale,filter] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  "data-[state=hidden]:scale-95 data-[state=hidden]:opacity-0 data-[state=hidden]:blur-[2px]",
);

interface FaceProps {
  icon: ReactNode;
  label: ReactNode;
  confirmedLabel: ReactNode;
  confirmed: boolean;
  /** The stepped percentage shown under reduced motion, or null. */
  progress: string | null;
  /** The copy inside the ink: everything in it is already hidden. */
  copy?: boolean;
}

/** Icon and label stacks. Every state shares one grid cell, so nothing reflows. */
function Face({ icon, label, confirmedLabel, confirmed, progress, copy = false }: FaceProps) {
  const labelShown = !confirmed && progress === null;
  return (
    <>
      <span aria-hidden="true" className="grid">
        <span
          data-slot={copy ? undefined : "hold-button-icon"}
          data-state={confirmed ? "hidden" : "visible"}
          className={cn(layer, "data-[state=hidden]:-rotate-45")}
        >
          {icon}
        </span>
        <span
          data-slot={copy ? undefined : "hold-button-tick"}
          data-state={confirmed ? "visible" : "hidden"}
          className={cn(layer, "data-[state=hidden]:rotate-45")}
        >
          <Tick />
        </span>
      </span>
      <span className="grid">
        <span
          data-slot={copy ? undefined : "hold-button-label"}
          data-state={labelShown ? "visible" : "hidden"}
          className={text}
        >
          {label}
        </span>
        <span
          aria-hidden="true"
          data-slot={copy ? undefined : "hold-button-confirmed-label"}
          data-state={confirmed ? "visible" : "hidden"}
          className={text}
        >
          {confirmedLabel}
        </span>
        <span
          aria-hidden="true"
          data-slot={copy ? undefined : "hold-button-progress"}
          data-state={progress === null ? "hidden" : "visible"}
          className={cn(text, "tabular-nums")}
        >
          {progress}
        </span>
      </span>
    </>
  );
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** A button that fills as it is held and confirms only when the hold completes. */
export function HoldButton({
  className,
  variant,
  size = "md",
  label = "Hold to confirm",
  confirmedLabel = "Confirmed",
  icon,
  holdDuration = 1200,
  onConfirm,
  onHoldStart,
  onHoldCancel,
  resetAfter,
  hint = "Press and hold to confirm.",
  announcement,
  disabled = false,
  type = "button",
  "aria-describedby": describedBy,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onBlur,
  onContextMenu,
  ...props
}: HoldButtonProps) {
  const kind = variant ?? "default";
  const reduced = usePrefersReducedMotion();
  const hintId = `${PREFIX}-${useId().replace(/[^\w-]/g, "")}`;
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [quarters, setQuarters] = useState(0);
  const [announced, setAnnounced] = useState("");

  const ink = useRef<HTMLSpanElement | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const progress = useRef(0);
  const clock = useRef<{
    mode: "fill" | "drain";
    from: number;
    at: number;
    span: number;
  } | null>(null);
  const frame = useRef(0);
  const resetTimer = useRef<number | undefined>(undefined);
  const heldKey = useRef<string | null>(null);
  const pointerHeld = useRef(false);

  const spoken =
    announcement ?? (typeof confirmedLabel === "string" ? confirmedLabel : "Confirmed");
  // Handlers and the frame loop read the latest props without re-subscribing.
  const settings = {
    holdDuration,
    onConfirm,
    onHoldStart,
    onHoldCancel,
    resetAfter,
    reduced,
    spoken,
    disabled,
  };
  const latest = useRef(settings);
  useLayoutEffect(() => {
    latest.current = settings;
  });

  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  function paint(value: number) {
    progress.current = value;
    const steps = Math.floor(value * 4 + 1e-9);
    const shown = latest.current.reduced ? steps / 4 : value;
    ink.current?.style.setProperty("--hold-progress", String(Math.round(shown * 1e4) / 1e4));
    if (latest.current.reduced) setQuarters(steps);
  }

  function stopClock() {
    clock.current = null;
    cancelAnimationFrame(frame.current);
  }

  function tick() {
    const current = clock.current;
    if (!current) return;
    // Becoming disabled mid-hold lets go at once: a disabled button never
    // receives the pointerup or keyup that would otherwise end the hold.
    if (latest.current.disabled) {
      pointerHeld.current = false;
      heldKey.current = null;
      stopClock();
      if (phaseRef.current === "holding") latest.current.onHoldCancel?.();
      paint(0);
      setPhase("idle");
      return;
    }
    const now = performance.now();
    if (current.mode === "fill") {
      const value = Math.min(
        1,
        current.from + (now - current.at) / Math.max(1, latest.current.holdDuration),
      );
      paint(value);
      if (value >= 1) {
        complete();
        return;
      }
    } else {
      const t = current.span > 0 ? Math.min(1, (now - current.at) / current.span) : 1;
      paint(current.from * (1 - easeOut(t)));
      if (t >= 1) {
        stopClock();
        setPhase("idle");
        return;
      }
    }
    frame.current = requestAnimationFrame(tick);
  }

  function run(mode: "fill" | "drain", span = 0) {
    cancelAnimationFrame(frame.current);
    clock.current = { mode, from: progress.current, at: performance.now(), span };
    frame.current = requestAnimationFrame(tick);
  }

  function complete() {
    stopClock();
    paint(1);
    setPhase("confirmed");
    setAnnounced(latest.current.spoken);
    latest.current.onConfirm?.();
    const after = latest.current.resetAfter;
    if (after !== undefined) {
      resetTimer.current = window.setTimeout(() => {
        setAnnounced("");
        drain();
      }, after);
    }
  }

  function drain() {
    if (latest.current.reduced || progress.current <= 0) {
      stopClock();
      paint(0);
      setPhase("idle");
      return;
    }
    setPhase("draining");
    run("drain", DRAIN * Math.max(progress.current, 0.25));
  }

  function startHold() {
    if (disabled || phaseRef.current === "confirmed" || phaseRef.current === "holding") return;
    setPhase("holding");
    paint(progress.current);
    latest.current.onHoldStart?.();
    run("fill");
  }

  function release() {
    if (phaseRef.current !== "holding") return;
    latest.current.onHoldCancel?.();
    drain();
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    pointerHeld.current = true;
    startHold();
  }

  function handlePointerEnd(
    event: PointerEvent<HTMLButtonElement>,
    handler: ((event: PointerEvent<HTMLButtonElement>) => void) | undefined,
  ) {
    handler?.(event);
    if (!pointerHeld.current) return;
    pointerHeld.current = false;
    release();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.key !== "Enter" && event.key !== " ") return;
    // The hold is the activation; a key's native click would be a second one.
    event.preventDefault();
    if (event.repeat || heldKey.current) return;
    heldKey.current = event.key;
    startHold();
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyUp?.(event);
    if (event.key !== heldKey.current) return;
    event.preventDefault();
    heldKey.current = null;
    release();
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    onBlur?.(event);
    heldKey.current = null;
    release();
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
    onContextMenu?.(event);
    // A long press on touch opens the context menu; mid-hold it would steal the press.
    if (phaseRef.current === "holding") event.preventDefault();
  }

  const confirmed = phase === "confirmed";
  const progressText =
    reduced && phase === "holding" ? percent.format(Math.min(quarters, 4) / 4) : null;
  const glyph = icon ?? <Stopwatch />;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Button
        data-slot="hold-button"
        data-state={phase}
        data-variant={kind}
        type={type}
        variant="secondary"
        size={size}
        disabled={disabled}
        aria-disabled={confirmed || undefined}
        aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId}
        className={cn(holdButtonVariants({ variant: kind }), className)}
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => {
          handlePointerEnd(event, onPointerUp);
        }}
        onPointerLeave={(event) => {
          handlePointerEnd(event, onPointerLeave);
        }}
        onPointerCancel={(event) => {
          handlePointerEnd(event, onPointerCancel);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        onContextMenu={handleContextMenu}
        {...props}
      >
        <Face
          icon={glyph}
          label={label}
          confirmedLabel={confirmedLabel}
          confirmed={confirmed}
          progress={progressText}
        />
        <span
          ref={ink}
          aria-hidden="true"
          data-slot="hold-button-ink"
          className={cn(
            "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center gap-[inherit]",
            INK[kind],
          )}
        >
          <Face
            icon={glyph}
            label={label}
            confirmedLabel={confirmedLabel}
            confirmed={confirmed}
            progress={progressText}
            copy
          />
        </span>
      </Button>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </>
  );
}

export { holdButtonVariants };
