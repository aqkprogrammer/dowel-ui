"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing, focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A list row that slides toward the inline start to reveal its actions.
 *
 * One number drives everything: the reveal, how far the row has moved aside.
 * The row is translated by it, and the action tray at the inline end is
 * exactly that wide, its buttons flexing to fill it — so as the row slides the
 * buttons grow out of a sliver, and dragging past the full width stretches
 * them wider (with rubber-band resistance) instead of opening a gap. Let go
 * and the row springs open or shut on an overshoot ease, the buttons stretching
 * past their size and settling with it. While a finger or pointer is down the
 * reveal follows it in pixels with no transition; at rest it is either 0 or
 * the tray's natural width in `em`, so it needs no measuring until a drag.
 *
 * Direction: the reveal is a magnitude and the translation is multiplied by
 * `--swipe-actions-dir`, which flips in RTL, where the actions sit at the left
 * and the row slides right. The drag reads the computed direction when it
 * starts.
 *
 * Accessibility: dragging is a shortcut, never the only way. The actions are
 * ordinary buttons, always in the tab order: focusing one opens the row so
 * it is visible, and focus leaving the row closes it again. Escape closes the
 * row and returns focus to it. Choosing an action calls its `onSelect` and
 * closes the row. The root is a group, named by `aria-label` if you give one.
 * The spring runs on `--motion-scale`, so under reduced motion the row snaps
 * open and shut.
 */

const PREFIX = "dowel-swipe-actions";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** Tray geometry, in em: each button, the gap between buttons, and the tray's padding. */
const BUTTON_EM = 2.25;
const GAP_EM = 0.4;
const PAD_EM = 0.5;

/** How much of a drag past either end is let through. */
const RESISTANCE = 0.35;
/** Pixels a pointer must travel before a press becomes a drag. */
const SLOP = 4;

const STYLES = `
[data-slot=swipe-actions-row],[data-slot=swipe-actions-tray]{transition-property:translate,width;transition-duration:${scaled(480)};transition-timing-function:var(--ease-overshoot)}
[data-slot=swipe-actions][data-dragging] :is([data-slot=swipe-actions-row],[data-slot=swipe-actions-tray]){transition:none}
`;

const swipeActionsVariants = cva(
  cn(
    "relative isolate overflow-hidden rounded-[1.1em] bg-muted text-foreground select-none",
    "[--swipe-actions-dir:1] rtl:[--swipe-actions-dir:-1]",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "text-[0.75rem]",
        md: "text-[1rem]",
        lg: "text-[1.25rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const actionVariants = cva(
  cn(
    "grid h-[2.25em] min-w-0 flex-1 place-items-center overflow-hidden rounded-[0.7em]",
    "[&_svg]:size-[1em] [&_svg]:shrink-0",
    "transition-[background-color,scale] duration-[var(--duration-fast)] motion-safe:active:scale-95",
    focusRingInset,
  ),
  {
    variants: {
      tone: {
        contrast: "bg-foreground text-background",
        neutral: "bg-foreground/15 text-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface SwipeAction {
  /** Stable key. */
  id: string;
  /** The button's accessible name. */
  label: string;
  /** A glyph shown on the button; the label is used as visible text without one. */
  icon?: ReactNode;
  /** `contrast` is the bright primary action, `neutral` a quiet one. */
  tone?: "contrast" | "neutral" | "destructive";
  onSelect?: () => void;
}

export interface SwipeActionsProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof swipeActionsVariants> {
  /** The actions revealed at the inline end, in order. */
  actions: SwipeAction[];
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Drag {
  pointerId: number;
  x: number;
  base: number;
  width: number;
  dir: number;
  dragging: boolean;
}

/** A row that drags toward the start to reveal action buttons, then snaps open or shut. */
export function SwipeActions({
  className,
  size,
  actions,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  style,
  onBlur,
  ref,
  ...props
}: SwipeActionsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);

  const trayEm =
    actions.length * BUTTON_EM + Math.max(0, actions.length - 1) * GAP_EM + PAD_EM * 2;

  function setOpen(next: boolean) {
    if (next === open) return;
    if (!controlled) setUncontrolled(next);
    onOpenChange?.(next);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !rootRef.current) return;
    const computed = getComputedStyle(rootRef.current);
    const width = trayEm * (Number.parseFloat(computed.fontSize) || 16);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      base: open ? width : 0,
      width,
      dir: computed.direction === "rtl" ? -1 : 1,
      dragging: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    const delta = event.clientX - current.x;
    if (!current.dragging) {
      if (Math.abs(delta) < SLOP) return;
      current.dragging = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    let next = current.base - delta * current.dir;
    if (next > current.width) next = current.width + (next - current.width) * RESISTANCE;
    if (next < 0) next *= RESISTANCE;
    setReveal(next);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.dragging) {
      setOpen((reveal ?? current.base) > current.width / 2);
      setReveal(null);
    } else if (open && event.type === "pointerup") {
      // A tap on an open row closes it.
      setOpen(false);
    }
  }

  function handleTrayFocus() {
    setOpen(true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    setOpen(false);
    rootRef.current?.focus();
  }

  function select(action: SwipeAction) {
    action.onSelect?.();
    setOpen(false);
    rootRef.current?.focus();
  }

  const shown =
    reveal === null ? (open ? "var(--swipe-actions-width)" : "0px") : `${String(reveal)}px`;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="group"
      tabIndex={-1}
      data-slot="swipe-actions"
      data-state={open ? "open" : "closed"}
      data-dragging={reveal === null ? undefined : ""}
      className={cn(swipeActionsVariants({ size }), className)}
      style={
        {
          "--swipe-actions-width": `${String(trayEm)}em`,
          "--swipe-actions-reveal": shown,
          ...style,
        } as CSSProperties
      }
      onBlur={handleBlur}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="swipe-actions-tray"
        className="absolute inset-y-0 end-0 flex items-center gap-[0.4em] overflow-hidden px-[0.5em]"
        style={{ width: "max(0px, var(--swipe-actions-reveal))" }}
        onFocus={handleTrayFocus}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-slot="swipe-actions-action"
            aria-label={action.icon ? action.label : undefined}
            className={actionVariants({ tone: action.tone })}
            onClick={() => {
              select(action);
            }}
            onKeyDown={handleKeyDown}
          >
            {action.icon ?? (
              <span className="truncate text-[0.6em] font-semibold">{action.label}</span>
            )}
          </button>
        ))}
      </div>
      <div
        data-slot="swipe-actions-row"
        className="relative flex touch-pan-y items-center gap-[0.75em] bg-muted px-[0.75em] py-[0.7em]"
        style={{
          translate: "calc(var(--swipe-actions-reveal) * -1 * var(--swipe-actions-dir)) 0",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {children}
      </div>
    </div>
  );
}

export { actionVariants as swipeActionVariants, swipeActionsVariants };
