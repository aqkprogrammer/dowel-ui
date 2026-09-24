"use client";

// Ported from bencho Inline confirm (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A destructive button that asks before it acts, in place.
 *
 * idle → asking → done → idle. The pill's width follows its content: each
 * phase is measured (the content is `w-max`, so it is never squeezed by the
 * shell) and the shell's inline size transitions to it with an overshoot,
 * clipping the content while it resizes. Content swaps instantly; the springy
 * width is the whole animation, exactly as in the source.
 *
 * Added over the source, which it lists as missing: focus follows the phase
 * (Keep, the safe answer, when asking; Undo once done; the trigger again when
 * it resets), Escape cancels asking, and "Deleted" is announced politely. The
 * undo window pauses while keyboard focus is inside it, so nobody loses it
 * mid-reach (WCAG 2.2.1).
 *
 * `variant="icon"` is a Dowel addition, inspired by the Rare UI delete-button
 * pattern (no code referenced): a compact round bin. Asking lifts the bin's lid
 * about its hinge and slides a small panel out beside it, a check to confirm
 * and a cross to back out; the cross, the bin again, or Escape backs out and
 * the lid settles shut with a little overshoot. Confirming shrinks the bin away
 * and draws a check in its place (a stroke-dashoffset transition), then offers
 * the same timed Undo in the panel — or, with `undoWindow={0}`, rests on the
 * check. The pill's width never changes, so there is nothing to measure: the
 * panel is positioned beside the bin and moves by transform and opacity, and
 * the default variant is untouched. Focus follows the same rules — the cross
 * when asking, Undo once done (the bin itself when there is no undo), the bin
 * when it resets — and the bin is a disclosure for the panel (aria-expanded).
 */

const PREFIX = "dowel-inline-confirm";

/*
 * The fuse is a clock, not decoration: its duration is the undo window itself,
 * so it deliberately does not run through --motion-scale (a sped-up fuse would
 * lie about the time left). Under reduced motion it stays drawn and still.
 */
const STYLES = `
@keyframes ${PREFIX}-fuse{from{transform:scaleX(1)}to{transform:scaleX(0)}}
[data-slot=inline-confirm-fuse]{transform-origin:left;animation:${PREFIX}-fuse var(--inline-confirm-window,4s) linear both}
[data-slot=inline-confirm-fuse]:dir(rtl){transform-origin:right}
[data-slot=inline-confirm][data-paused] [data-slot=inline-confirm-fuse]{animation-play-state:paused}
@media (prefers-reduced-motion: reduce){[data-slot=inline-confirm-fuse]{animation:none}}
`;

const inlineConfirmVariants = cva(
  cn(
    "relative inline-flex h-11 max-w-full shrink-0 overflow-hidden bg-card text-sm text-card-foreground",
    "transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
  ),
  {
    variants: {
      shape: {
        pill: "rounded-full",
        rounded: "rounded-xl",
        square: "rounded-md",
      },
      /** A hairline ring on the pill — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
      /** `icon` is a round bin that asks from a panel beside it. */
      variant: {
        default: "",
        icon: "w-11 overflow-visible",
      },
    },
    defaultVariants: { shape: "pill", stroke: true, variant: "default" },
  },
);

/** Every segment is a Button, flattened to fill the pill edge to edge. */
const segment = cn(
  "h-full rounded-none px-4 font-normal",
  "focus-visible:ring-offset-0 focus-visible:ring-inset",
);

export type InlineConfirmPhase = "idle" | "asking" | "done";

export interface InlineConfirmProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof inlineConfirmVariants> {
  /** The trigger's text, e.g. "Delete file". Also names the group. */
  label?: ReactNode;
  /** Leading icon on the trigger. Defaults to a bin; `null` removes it. The icon variant draws its own bin. */
  icon?: ReactNode;
  /** The safe answer, focused when asking. The icon variant's cross is named by it. */
  cancelLabel?: ReactNode;
  /** The destructive answer. The icon variant's check is named by it. */
  confirmLabel?: ReactNode;
  /** Shown once confirmed. */
  doneLabel?: ReactNode;
  undoLabel?: ReactNode;
  /** Announced when confirmed. Defaults to `doneLabel` when it is text. */
  announcement?: string;
  /**
   * Milliseconds the undo stays available. It pauses while keyboard focus is
   * inside. With the icon variant, `0` skips the undo and rests on the check.
   */
  undoWindow?: number;
  /** Called when the destructive answer is chosen. */
  onConfirm?: () => void;
  /** Called when Undo is pressed within the window. */
  onUndo?: () => void;
  /** Called on every phase change. */
  onPhaseChange?: (phase: InlineConfirmPhase) => void;
  /** Disables the trigger. */
  disabled?: boolean;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const BIN = "M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v6m4-6v6";
const CHECK = "m5 13 4 4L19 7";
const CROSS = "M18 6 6 18M6 6l12 12";
const UNDO = "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11";

/*
 * The icon variant's bin, in three parts keyed off the svg's data-phase. The
 * lid turns about the hinge at its far end (fill-box origin), lifting on an ease-out
 * and settling shut on an overshoot; done shrinks lid and body away while the
 * check draws itself along its length.
 */
const lidClass = cn(
  "origin-bottom-right [transform-box:fill-box]",
  "transition-[rotate,translate,scale,opacity] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
  "group-data-[phase=asking]/inline-confirm-bin:translate-y-[-1.5px] group-data-[phase=asking]/inline-confirm-bin:rotate-[22deg]",
  "group-data-[phase=asking]/inline-confirm-bin:duration-[var(--duration-normal)] group-data-[phase=asking]/inline-confirm-bin:ease-[var(--ease-out-quint)]",
  "group-data-[phase=done]/inline-confirm-bin:scale-50 group-data-[phase=done]/inline-confirm-bin:opacity-0",
  "group-data-[phase=done]/inline-confirm-bin:duration-[var(--duration-fast)]",
);

const bodyClass = cn(
  "origin-center [transform-box:fill-box]",
  "transition-[scale,opacity] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "group-data-[phase=done]/inline-confirm-bin:scale-50 group-data-[phase=done]/inline-confirm-bin:opacity-0",
  "group-data-[phase=done]/inline-confirm-bin:duration-[var(--duration-fast)] group-data-[phase=done]/inline-confirm-bin:ease-[var(--ease-in-quint)]",
);

const checkClass = cn(
  "text-success opacity-0 [stroke-dasharray:1] [stroke-dashoffset:1]",
  "transition-[stroke-dashoffset,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "group-data-[phase=done]/inline-confirm-bin:opacity-100 group-data-[phase=done]/inline-confirm-bin:[stroke-dashoffset:0]",
  "group-data-[phase=done]/inline-confirm-bin:delay-[var(--duration-fast)] group-data-[phase=done]/inline-confirm-bin:duration-[var(--duration-slow)]",
);

/** The panel beside the bin: slides out from behind it, and back a little faster. */
const panelClass = cn(
  "absolute inset-y-0 start-full ms-2 flex items-center gap-0.5 rounded-[inherit] bg-card p-1.5 shadow-md ring-1 ring-border",
  "invisible origin-left -translate-x-2 scale-90 opacity-0 rtl:origin-right rtl:translate-x-2",
  "transition-[opacity,translate,scale,visibility] duration-[var(--duration-fast)] ease-[var(--ease-in-quint)]",
  "data-[state=open]:visible data-[state=open]:translate-x-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
  "data-[state=open]:duration-[var(--duration-normal)] data-[state=open]:ease-[var(--ease-overshoot)]",
  // Visibility only waits on the way out. Opening, it must flip at once, or
  // the cross is still hidden when focus is sent to it.
  "data-[state=open]:transition-[opacity,translate,scale]",
);

function Bin({ phase }: { phase: InlineConfirmPhase }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="inline-confirm-bin"
      data-phase={phase}
      className="group/inline-confirm-bin size-5 overflow-visible"
    >
      <path className={bodyClass} d="m19 6-1 14H6L5 6m5 5v6m4-6v6" />
      <path data-slot="inline-confirm-lid" className={lidClass} d="M3 6h18M9 6V4h6v2" />
      <path
        data-slot="inline-confirm-check"
        className={checkClass}
        stroke="currentColor"
        pathLength={1}
        d={CHECK}
      />
    </svg>
  );
}

/** A button that turns into Keep / Delete, then into Deleted / Undo. */
export function InlineConfirm({
  className,
  shape,
  stroke,
  variant,
  label = "Delete file",
  icon,
  cancelLabel = "Keep",
  confirmLabel = "Delete",
  doneLabel = "Deleted",
  undoLabel = "Undo",
  announcement,
  undoWindow = 4000,
  onConfirm,
  onUndo,
  onPhaseChange,
  disabled,
  onPointerDown,
  onFocus,
  onBlur,
  style,
  ref,
  ...props
}: InlineConfirmProps) {
  const labelId = useId();
  const panelId = useId();
  const iconic = variant === "icon";
  const hasUndo = !iconic || undoWindow > 0;
  const [phase, setPhaseState] = useState<InlineConfirmPhase>("idle");
  // What the icon variant's panel shows. It keeps showing it while it slides away.
  const [held, setHeld] = useState<"asking" | "done">("asking");
  const panelOpen = phase === "asking" || (phase === "done" && hasUndo);
  const [announced, setAnnounced] = useState("");
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const faceRef = useRef<HTMLButtonElement | null>(null);
  const keepRef = useRef<HTMLButtonElement | null>(null);
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const focusNext = useRef<"face" | "keep" | "undo" | null>(null);
  // Whether the pointer put focus here. Keyboard focus inside the control
  // pauses the undo window; the programmatic focus that follows a click does
  // not, or a mouse user would never see it burn down.
  const pointer = useRef(false);
  const remaining = useRef(undoWindow);

  const setPhase = useCallback(
    (next: InlineConfirmPhase, focus: "face" | "keep" | "undo" | null) => {
      focusNext.current = focus;
      setPhaseState(next);
      if (next === "asking") setHeld("asking");
      else if (next === "done" && hasUndo) setHeld("done");
      onPhaseChange?.(next);
    },
    [onPhaseChange, hasUndo],
  );

  // Width follows content. Written to the DOM rather than state: it is a
  // measurement of what just rendered, and a re-render would be one frame late.
  // The icon variant's size is its class; the panel sits outside it.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (iconic) return;
    const width = contentRef.current?.scrollWidth ?? 0;
    if (root && width > 0) root.style.width = `${String(width)}px`;
  }, [phase, label, cancelLabel, confirmLabel, doneLabel, undoLabel, iconic]);

  // Focus follows the phase — but only when the user moved it there.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "face") faceRef.current?.focus();
    else if (target === "keep") keepRef.current?.focus();
    else if (target === "undo") undoRef.current?.focus();
  }, [phase]);

  // The undo window: counts down, and pauses while keyboard focus is inside.
  useEffect(() => {
    if (phase !== "done" || paused || !hasUndo) return;
    const started = Date.now();
    const timer = setTimeout(() => {
      const hadFocus = rootRef.current?.contains(document.activeElement) ?? false;
      setAnnounced("");
      setPhase("idle", hadFocus ? "face" : null);
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [phase, paused, hasUndo, setPhase]);

  function confirm() {
    remaining.current = undoWindow;
    onConfirm?.();
    setAnnounced(announcement ?? (typeof doneLabel === "string" ? doneLabel : "Done"));
    setPhase("done", hasUndo ? "undo" : "face");
  }

  function undo() {
    onUndo?.();
    setAnnounced("");
    setPhase("idle", "face");
  }

  // On each segment rather than the group: the group itself is not interactive.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    pointer.current = false;
    if (event.defaultPrevented || event.key !== "Escape" || phase !== "asking") return;
    event.preventDefault();
    setPhase("idle", "face");
  }

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="group"
      aria-labelledby={labelId}
      data-slot="inline-confirm"
      data-phase={phase}
      data-variant={iconic ? "icon" : "default"}
      data-paused={paused || undefined}
      className={cn(inlineConfirmVariants({ shape, stroke, variant }), className)}
      style={
        { ...style, "--inline-confirm-window": `${String(undoWindow)}ms` } as CSSProperties
      }
      onPointerDown={(event) => {
        onPointerDown?.(event);
        pointer.current = true;
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setPaused(!pointer.current);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.currentTarget.contains(event.relatedTarget)) return;
        pointer.current = false;
        setPaused(false);
      }}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span id={labelId} hidden>
        {label}
      </span>
      {iconic ? (
        <>
          <Button
            ref={faceRef}
            variant="ghost"
            size="icon"
            data-slot="inline-confirm-trigger"
            aria-expanded={phase === "done" ? undefined : phase === "asking"}
            aria-controls={phase === "done" ? undefined : panelId}
            aria-disabled={phase === "done" || undefined}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              "size-full rounded-[inherit] hover:bg-foreground/6",
              "aria-disabled:pointer-events-auto aria-disabled:cursor-default aria-disabled:opacity-100 aria-disabled:hover:bg-transparent",
              phase === "asking" && "text-destructive hover:text-destructive",
            )}
            onClick={() => {
              if (phase === "idle") setPhase("asking", "keep");
              else if (phase === "asking") setPhase("idle", "face");
            }}
          >
            <Bin phase={phase} />
            <span className="sr-only">{phase === "done" ? doneLabel : label}</span>
          </Button>
          <div
            id={panelId}
            data-slot="inline-confirm-panel"
            data-state={panelOpen ? "open" : "closed"}
            inert={!panelOpen}
            className={panelClass}
          >
            {held === "done" && phase !== "asking" ? (
              <Button
                ref={undoRef}
                variant="ghost"
                size="sm"
                data-slot="inline-confirm-undo"
                onKeyDown={handleKeyDown}
                className="relative h-8 gap-1.5 rounded-[inherit] px-3 text-[0.8125rem] font-normal hover:bg-foreground/6"
                onClick={undo}
              >
                <Glyph d={UNDO} />
                {undoLabel}
                <i
                  aria-hidden="true"
                  data-slot="inline-confirm-fuse"
                  className="absolute inset-x-3 bottom-0.5 h-[1.5px] rounded-full bg-foreground/35"
                />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  data-slot="inline-confirm-confirm"
                  onKeyDown={handleKeyDown}
                  className="rounded-[inherit] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={confirm}
                >
                  <Glyph d={CHECK} />
                  <span className="sr-only">{confirmLabel}</span>
                </Button>
                <Button
                  ref={keepRef}
                  variant="ghost"
                  size="icon-sm"
                  data-slot="inline-confirm-cancel"
                  onKeyDown={handleKeyDown}
                  className="rounded-[inherit] text-muted-foreground hover:bg-foreground/6"
                  onClick={() => {
                    setPhase("idle", "face");
                  }}
                >
                  <Glyph d={CROSS} />
                  <span className="sr-only">{cancelLabel}</span>
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <div
          ref={contentRef}
          data-slot="inline-confirm-content"
          className="flex h-full w-max min-w-full items-stretch"
        >
          {phase === "idle" ? (
            <Button
              ref={faceRef}
              variant="ghost"
              data-slot="inline-confirm-trigger"
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={cn(segment, "w-full gap-2 hover:bg-foreground/6")}
              onClick={() => {
                setPhase("asking", "keep");
              }}
            >
              {icon === undefined ? <Glyph d={BIN} /> : icon}
              {label}
            </Button>
          ) : null}
          {phase === "asking" ? (
            <>
              <Button
                ref={keepRef}
                variant="ghost"
                data-slot="inline-confirm-cancel"
                onKeyDown={handleKeyDown}
                className={cn(segment, "flex-1 hover:bg-foreground/6")}
                onClick={() => {
                  setPhase("idle", "face");
                }}
              >
                {cancelLabel}
              </Button>
              <span
                aria-hidden="true"
                data-slot="inline-confirm-seam"
                className="my-auto h-5 w-px shrink-0 bg-foreground/12"
              />
              <Button
                variant="ghost"
                data-slot="inline-confirm-confirm"
                onKeyDown={handleKeyDown}
                className={cn(
                  segment,
                  "flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive",
                )}
                onClick={confirm}
              >
                {confirmLabel}
              </Button>
            </>
          ) : null}
          {phase === "done" ? (
            <>
              <span
                data-slot="inline-confirm-done"
                className="flex items-center gap-1.5 ps-3.5 pe-3 text-muted-foreground [&_svg]:size-4"
              >
                <Glyph d={CHECK} />
                {doneLabel}
              </span>
              <Button
                ref={undoRef}
                variant="ghost"
                data-slot="inline-confirm-undo"
                onKeyDown={handleKeyDown}
                className={cn(
                  segment,
                  "relative ms-auto gap-1.5 bg-foreground/5 text-[0.8125rem] hover:bg-foreground/10",
                )}
                onClick={undo}
              >
                <Glyph d={UNDO} />
                {undoLabel}
                <i
                  aria-hidden="true"
                  data-slot="inline-confirm-fuse"
                  className="absolute inset-x-0 bottom-0 h-[1.5px] bg-foreground/35"
                />
              </Button>
            </>
          ) : null}
        </div>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { inlineConfirmVariants };
