"use client";

// Ported from bencho Slide to confirm (MIT, © 2026 Lorenzo Cabra) and SmoothUI Power Off Slide (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { Direction } from "radix-ui";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A track with a grip you slide to the end to confirm.
 *
 * `motion` is here for one reason (ADR 0014): a grip released before the end
 * springs back carrying the velocity of the drag, which a CSS transition cannot
 * know. Everything else is CSS driven by two custom properties written on the
 * root as the grip moves — `--slide-x` (px travelled) and `--slide-p`
 * (progress 0–1) — so the label, the arrow and the wash follow without a
 * React render per frame.
 *
 * The drag is never the only way through. The grip is a real button: press and
 * hold Enter or Space (or hold the pointer still on it) and it travels across
 * over `holdDuration`, confirming when it arrives; letting go early sends it
 * back. The result is announced through a polite live region.
 */

const PREFIX = "dowel-slide-to-confirm";

/* Keyframes and [data-slot]/[data-state] selectors only (the sheet is unlayered). */
const STYLES = `
@keyframes ${PREFIX}-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@keyframes ${PREFIX}-press{0%,100%{scale:1}40%{scale:.98}}
[data-slot=slide-to-confirm-shimmer]{background-image:linear-gradient(90deg,var(--color-muted-foreground) 0%,var(--color-muted-foreground) 38%,var(--color-foreground) 50%,var(--color-muted-foreground) 62%,var(--color-muted-foreground) 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:${PREFIX}-shimmer calc(2000ms * var(--motion-scale)) linear infinite}
[data-slot=slide-to-confirm][data-variant=confirm][data-state=confirmed]{animation:${PREFIX}-press calc(400ms * var(--motion-scale)) var(--ease-out-quint)}
`;

/** Released past this share of the travel, a drag confirms. */
const CONFIRM_AT = 0.95;
/** Pointer travel that turns a press into a drag. */
const DRAG_SLOP = 4;
/** A pointer held still this long starts the hold. */
const POINTER_HOLD_DELAY = 180;
/** Grip inset from the track edge, both sides (px). */
const INSET = 8;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Maps Speed (0–100) to a near-critically damped spring. */
export function slideSpring(speed: number) {
  const stiffness = 200 + Math.min(100, Math.max(0, speed)) * 8;
  return { type: "spring" as const, stiffness, damping: 2 * Math.sqrt(stiffness) * 0.92 };
}

const slideToConfirmVariants = cva(
  "relative isolate h-14 w-70 max-w-full touch-none text-foreground select-none",
  {
    variants: {
      /** `confirm` is bencho's wash-and-morph; `power` is SmoothUI's power-off slide. */
      variant: {
        confirm: "bg-card",
        power: "border border-border bg-secondary",
      },
      /** `dark` renders the block with the dark token set whatever the page theme. */
      fill: {
        light: "",
        dark: "dark",
      },
      /** A 1px inset hairline on the track. */
      stroke: {
        true: "ring-1 ring-border ring-inset",
        false: "",
      },
    },
    defaultVariants: { variant: "confirm", fill: "light", stroke: false },
  },
);

const DEFAULTS = {
  confirm: { label: "Slide to confirm", confirmedLabel: "Confirmed", resetAfter: 1100 },
  power: { label: "Slide to power off", confirmedLabel: "Shutting down…", resetAfter: 2000 },
} as const;

type Phase = "idle" | "dragging" | "holding" | "confirmed";

export interface SlideToConfirmProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof slideToConfirmVariants> {
  /** Called once each time the slide completes. */
  onConfirm?: () => void;
  /** Names the grip and shows on the track. Defaults per variant. */
  label?: string;
  /** Shown and announced once confirmed ("Confirmed" / "Shutting down…"). */
  confirmedLabel?: string;
  /** Instructions linked to the grip with aria-describedby. */
  hint?: string;
  disabled?: boolean;
  /** Milliseconds before it resets itself; `null` stays confirmed. 1100 (confirm) / 2000 (power). */
  resetAfter?: number | null;
  /** How long Enter, Space or a still pointer must be held to confirm (ms). Default 1000. */
  holdDuration?: number;
  /** Spring speed for the snap-back and morph, 0–100. Default 50. */
  speed?: number;
  /** Track radius in px, 0–28. The grip and wash use corner − 4. Default 28. */
  corner?: number;
}

/** A slide-to-confirm track whose grip also confirms on a press-and-hold. */
export function SlideToConfirm({
  className,
  style,
  variant,
  fill,
  stroke,
  onConfirm,
  label,
  confirmedLabel,
  hint = "Drag to the end, or press and hold Enter or Space.",
  disabled = false,
  resetAfter,
  holdDuration = 1000,
  speed = 50,
  corner = 28,
  ...props
}: SlideToConfirmProps) {
  const kind = variant ?? "confirm";
  const defaults = DEFAULTS[kind];
  const name = label ?? defaults.label;
  const done = confirmedLabel ?? defaults.confirmedLabel;
  const reset = resetAfter === undefined ? defaults.resetAfter : resetAfter;

  const [phase, setPhaseState] = useState<Phase>("idle");
  const [announcement, setAnnouncement] = useState("");
  const [domRtl, setDomRtl] = useState(false);
  const rtl = Direction.useDirection() === "rtl" || domRtl;
  const reduceMotion = usePrefersReducedMotion();
  const hintId = `${PREFIX}-${useId().replace(/:/g, "")}`;

  const grip = useRef<HTMLButtonElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const travel = useRef(0);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const timers = useRef<{ hold?: number; delay?: number; reset?: number }>({});
  const pointer = useRef<{ id: number; x: number; from: number; moved: boolean } | null>(null);
  const heldKey = useRef<string | null>(null);
  // Handlers read the latest props without re-subscribing.
  const latest = useRef({ onConfirm, reset, reduceMotion, speed, holdDuration, kind, done });
  useLayoutEffect(() => {
    latest.current = { onConfirm, reset, reduceMotion, speed, holdDuration, kind, done };
  });

  const offset = useMotionValue(0);
  const mirrored = useTransform(offset, (value) => -value);

  useMotionValueEvent(offset, "change", (value) => {
    const root = grip.current?.parentElement;
    if (!root) return;
    const progress = travel.current > 0 ? Math.min(1, Math.max(0, value / travel.current)) : 0;
    root.style.setProperty("--slide-x", `${String(value)}px`);
    root.style.setProperty("--slide-p", String(progress));
  });

  useLayoutEffect(() => {
    if (grip.current?.closest("[dir]")?.getAttribute("dir") === "rtl") setDomRtl(true);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      window.clearTimeout(pending.hold);
      window.clearTimeout(pending.delay);
      window.clearTimeout(pending.reset);
      animation.current?.stop();
    };
  }, []);

  function setPhase(next: Phase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  function measure() {
    const element = grip.current;
    const root = element?.parentElement;
    if (!element || !root) return;
    if (element.closest("[dir]")?.getAttribute("dir") === "rtl") setDomRtl(true);
    const width = root.getBoundingClientRect().width - element.getBoundingClientRect().width;
    travel.current = Math.max(0, width - INSET);
  }

  /** Springs (or, under reduced motion, jumps) the grip to `target`. */
  function settle(target: number, velocity = 0) {
    animation.current?.stop();
    animation.current = null;
    if (latest.current.reduceMotion) {
      offset.set(target);
      return;
    }
    animation.current = animate(offset, target, {
      ...slideSpring(latest.current.speed),
      velocity,
    });
  }

  function confirm() {
    window.clearTimeout(timers.current.hold);
    window.clearTimeout(timers.current.delay);
    const { kind: current, reset: after } = latest.current;
    setPhase("confirmed");
    setAnnouncement(latest.current.done);
    latest.current.onConfirm?.();
    // The confirm grip grows into a full pill from the start; the power knob parks at the end.
    settle(current === "confirm" ? 0 : travel.current);
    if (after !== null) {
      timers.current.reset = window.setTimeout(() => {
        setPhase("idle");
        setAnnouncement("");
        settle(0);
      }, after);
    }
  }

  function startHold() {
    if (disabled || phaseRef.current !== "idle") return;
    measure();
    setPhase("holding");
    const { holdDuration: total } = latest.current;
    const progress = travel.current > 0 ? offset.get() / travel.current : 0;
    const remaining = Math.max(0, total * (1 - progress));
    animation.current?.stop();
    // Linear and paced by the person holding, like a drag: feedback, not decoration.
    animation.current = animate(offset, travel.current, {
      duration: remaining / 1000,
      ease: "linear",
    });
    timers.current.hold = window.setTimeout(confirm, remaining);
  }

  function release(velocity = 0) {
    window.clearTimeout(timers.current.hold);
    window.clearTimeout(timers.current.delay);
    setPhase("idle");
    settle(0, velocity);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0 || phaseRef.current !== "idle") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    measure();
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      from: offset.get(),
      moved: false,
    };
    timers.current.delay = window.setTimeout(startHold, POINTER_HOLD_DELAY);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const press = pointer.current;
    if (!press || press.id !== event.pointerId) return;
    const dx = (event.clientX - press.x) * (rtl ? -1 : 1);
    if (!press.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      // Movement turns the press into a drag, taking over from any hold.
      window.clearTimeout(timers.current.delay);
      window.clearTimeout(timers.current.hold);
      animation.current?.stop();
      press.moved = true;
      press.from = offset.get();
      press.x = event.clientX;
      setPhase("dragging");
      return;
    }
    offset.set(Math.min(travel.current, Math.max(0, press.from + dx)));
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const press = pointer.current;
    if (!press || press.id !== event.pointerId) return;
    pointer.current = null;
    window.clearTimeout(timers.current.delay);
    const current = phaseRef.current;
    if (current === "dragging") {
      const reached = travel.current > 0 && offset.get() / travel.current >= CONFIRM_AT;
      if (reached && event.type === "pointerup") confirm();
      else release(offset.getVelocity());
    } else if (current === "holding") {
      release();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.repeat || heldKey.current) return;
    heldKey.current = event.key;
    startHold();
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== heldKey.current) return;
    event.preventDefault();
    heldKey.current = null;
    if (phaseRef.current === "holding") release();
  }

  function handleBlur() {
    heldKey.current = null;
    if (phaseRef.current === "holding") release();
  }

  const inner = Math.max(0, corner - 4);
  const confirmed = phase === "confirmed";
  const rootStyle: CSSProperties = { borderRadius: `${String(corner)}px`, ...style };

  return (
    <MotionConfig reducedMotion="user">
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="slide-to-confirm"
        data-variant={kind}
        data-state={phase}
        data-disabled={disabled || undefined}
        className={cn(
          slideToConfirmVariants({ variant: kind, fill, stroke }),
          disabled && "opacity-55",
          className,
        )}
        style={rootStyle}
        {...props}
      >
        {kind === "confirm" ? (
          <span
            aria-hidden="true"
            data-slot="slide-to-confirm-wash"
            className="absolute inset-y-1 start-1 bg-foreground"
            style={{
              borderRadius: `${String(inner)}px`,
              width: "calc(3rem + var(--slide-x, 0px))",
            }}
          />
        ) : null}
        <span
          aria-hidden="true"
          data-slot="slide-to-confirm-label"
          className={cn(
            "pointer-events-none absolute inset-y-0 flex items-center justify-center text-sm font-medium tracking-tight",
            kind === "confirm" ? "inset-x-0 text-foreground/45" : "inset-x-0 ps-8",
          )}
          style={{
            opacity:
              kind === "power" && confirmed
                ? 0
                : "clamp(0, calc(1 - 2 * var(--slide-p, 0)), 1)",
          }}
        >
          <span data-slot={kind === "power" ? "slide-to-confirm-shimmer" : undefined}>
            {name}
          </span>
        </span>
        {kind === "power" ? (
          <span
            aria-hidden="true"
            data-slot="slide-to-confirm-status"
            className={cn(
              "pointer-events-none absolute inset-x-0 inset-y-0 flex items-center justify-center pe-14 text-sm font-medium",
              "transition-opacity duration-[var(--duration-normal)]",
              !confirmed && "opacity-0",
            )}
          >
            {done}
          </span>
        ) : null}
        <motion.button
          ref={grip}
          type="button"
          aria-label={name}
          aria-describedby={hintId}
          disabled={disabled}
          aria-disabled={confirmed || undefined}
          data-slot="slide-to-confirm-grip"
          data-state={phase}
          className={cn(
            "absolute start-1 top-1 z-10 flex h-12 w-12 items-center justify-center overflow-hidden",
            "cursor-grab data-[state=confirmed]:cursor-default data-[state=dragging]:cursor-grabbing",
            kind === "confirm"
              ? cn(
                  "bg-foreground text-card data-[state=confirmed]:w-[calc(100%-0.5rem)]",
                  "transition-[width] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
                )
              : "bg-card text-destructive shadow-md",
            focusRing,
          )}
          style={{ x: rtl ? mirrored : offset, borderRadius: `${String(inner)}px` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={handleBlur}
        >
          {kind === "confirm" ? (
            <>
              <span
                aria-hidden="true"
                data-slot="slide-to-confirm-arrow"
                className={cn(
                  "col-start-1 row-start-1 flex transition-opacity duration-[var(--duration-fast)]",
                  confirmed && "opacity-0",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={cn("size-5", mirrorForDirection)}
                  style={{ opacity: "clamp(0, calc((1 - var(--slide-p, 0)) / 0.4), 1)" }}
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
              <span
                aria-hidden="true"
                data-slot="slide-to-confirm-done"
                className={cn(
                  "absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap",
                  "transition-[opacity,scale] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                  confirmed
                    ? "scale-100 opacity-100 delay-[calc(180ms*var(--motion-scale))]"
                    : "scale-70 opacity-0",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="size-4"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {done}
              </span>
            </>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              data-slot="slide-to-confirm-power"
              className="size-7"
            >
              <path d="M12 2v10" />
              <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
            </svg>
          )}
        </motion.button>
        <span id={hintId} className="sr-only">
          {hint}
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </MotionConfig>
  );
}

export { slideToConfirmVariants };
