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
    },
    defaultVariants: { shape: "pill", stroke: true },
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
  /** Leading icon on the trigger. Defaults to a bin; `null` removes it. */
  icon?: ReactNode;
  /** The safe answer, focused when asking. */
  cancelLabel?: ReactNode;
  /** The destructive answer. */
  confirmLabel?: ReactNode;
  /** Shown once confirmed. */
  doneLabel?: ReactNode;
  undoLabel?: ReactNode;
  /** Announced when confirmed. Defaults to `doneLabel` when it is text. */
  announcement?: string;
  /** Milliseconds the undo stays available. It pauses while keyboard focus is inside. */
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
const UNDO = "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11";

/** A button that turns into Keep / Delete, then into Deleted / Undo. */
export function InlineConfirm({
  className,
  shape,
  stroke,
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
  const [phase, setPhaseState] = useState<InlineConfirmPhase>("idle");
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
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

  // Width follows content. Written to the DOM rather than state: it is a
  // measurement of what just rendered, and a re-render would be one frame late.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const width = contentRef.current?.scrollWidth ?? 0;
    if (root && width > 0) root.style.width = `${String(width)}px`;
  }, [phase, label, cancelLabel, confirmLabel, doneLabel, undoLabel]);

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
    if (phase !== "done" || paused) return;
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
  }, [phase, paused, setPhase]);

  function confirm() {
    remaining.current = undoWindow;
    onConfirm?.();
    setAnnounced(announcement ?? (typeof doneLabel === "string" ? doneLabel : "Done"));
    setPhase("done", "undo");
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
      data-paused={paused || undefined}
      className={cn(inlineConfirmVariants({ shape, stroke }), className)}
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
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { inlineConfirmVariants };
