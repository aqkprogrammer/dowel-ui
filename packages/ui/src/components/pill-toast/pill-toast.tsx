"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A compact pill toast: "✓ Saved to Photos".
 *
 * Opening drops the pill in from above: it starts small, blurred and
 * transparent, overshoots a touch below its resting place and settles.
 * After `duration` it dismisses upward the way it came, blurring out, and
 * unmounts when that animation ends. Hovering or focusing it holds the
 * timer, so nobody loses a message they are reading. Both animations are
 * hoisted keyframes on --motion-scale; under reduced motion the pill simply
 * appears and disappears.
 *
 * The icon sits in a small disc in the accent colour,
 * `--pill-toast-accent`, which defaults to the foreground so it reads as a
 * neutral tick. Re-tint it from a class:
 * `className="[--pill-toast-accent:var(--color-info)]"`.
 *
 * Announcing: the root is a polite live region (role="status") that is
 * always mounted, and the message is inserted into it when the toast opens,
 * which is what makes screen readers read it. The region stays empty while
 * closed. The component is positioned by you (it is inline), so put it
 * wherever the toast should drop to: usually absolutely, at the top centre.
 */

const PREFIX = "dowel-pill-toast";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
.${PREFIX} [data-part=pill][data-state=open]{animation:${PREFIX}-in ${scaled(520)} var(--ease-out-quint) both}
.${PREFIX} [data-part=pill][data-state=closed]{animation:${PREFIX}-out ${scaled(320)} var(--ease-in-quint) both}
@keyframes ${PREFIX}-in{0%{opacity:0;transform:translateY(-110%) scale(.82);filter:blur(6px)}60%{opacity:1;transform:translateY(8%) scale(1.03);filter:blur(0)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes ${PREFIX}-out{0%{opacity:1;transform:none;filter:blur(0)}100%{opacity:0;transform:translateY(-90%) scale(.9);filter:blur(4px)}}
`;

const pillToastVariants = cva(
  cn(
    "inline-flex items-center gap-2 rounded-full border border-border bg-popover font-medium whitespace-nowrap",
    "text-popover-foreground shadow-lg",
  ),
  {
    variants: {
      size: {
        sm: "h-7 ps-1 pe-3 text-2xs [&_[data-part=icon]]:size-5",
        md: "h-9 ps-1.5 pe-4 text-xs [&_[data-part=icon]]:size-6",
        lg: "h-11 ps-2 pe-5 text-sm [&_[data-part=icon]]:size-7",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[60%]"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export interface PillToastProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof pillToastVariants> {
  /** Controlled open state. Reopen it (false, then true) to show it again. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when it opens or auto-dismisses. */
  onOpenChange?: (open: boolean) => void;
  /** How long it stays, in milliseconds, before dismissing itself. `Infinity` keeps it. */
  duration?: number;
  /** The message. */
  children: ReactNode;
  /** The glyph in the accent disc. Defaults to a tick. */
  icon?: ReactNode;
  /** Classes for the pill itself (the root is the live region around it). */
  pillClassName?: string;
}

/** A compact pill toast that drops in, overshoots, and dismisses upward on its own. */
export function PillToast({
  className,
  pillClassName,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  duration = 2000,
  children,
  icon,
  size,
  ...props
}: PillToastProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;

  // Mounted for as long as the exit animation runs after `open` turns false.
  const [present, setPresent] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setPresent(true);
  }

  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!open || held || !Number.isFinite(duration)) return;
    const timer = setTimeout(() => {
      if (!controlled) setUncontrolled(false);
      onOpenChange?.(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [open, held, duration, controlled, onOpenChange]);

  // A native listener rather than onAnimationEnd: React resolves that prop to a
  // vendor-prefixed event name wherever AnimationEvent is missing. React 19
  // runs the returned cleanup when the element leaves.
  const listenForExitEnd = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const onEnd = (event: Event) => {
      if (event.target === element && element.dataset.state === "closed") setPresent(false);
    };
    element.addEventListener("animationend", onEnd);
    return () => {
      element.removeEventListener("animationend", onEnd);
    };
  }, []);

  // Backstop for environments that never fire animationend.
  useEffect(() => {
    if (open || !present) return;
    const timer = setTimeout(() => setPresent(false), 1000);
    return () => clearTimeout(timer);
  }, [open, present]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="pill-toast"
      data-state={open ? "open" : "closed"}
      className={cn(PREFIX, "pointer-events-none inline-flex", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {present ? (
        <div
          data-part="pill"
          data-state={open ? "open" : "closed"}
          className={cn("pointer-events-auto", pillToastVariants({ size }), pillClassName)}
          ref={listenForExitEnd}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <span
            data-part="icon"
            aria-hidden="true"
            className="grid shrink-0 place-items-center rounded-full bg-[var(--pill-toast-accent,var(--color-foreground))] text-background"
          >
            {icon ?? <Check />}
          </span>
          <span>{children}</span>
        </div>
      ) : null}
    </div>
  );
}

export { pillToastVariants };
