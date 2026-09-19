"use client";

// Ported from bencho Notify (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A subscribe toggle: the bell rings, and the label cross-fades to the
 * confirmation while the pill widens elastically to fit it.
 *
 * It is a toggle button (aria-pressed), so its accessible name stays the
 * resting label — "Notify me, pressed" — and the confirmation is announced
 * once through a polite live region instead. The label clip's width is the
 * measured width of whichever label is showing, transitioned with an
 * overshoot; the ring is a hoisted keyframe keyed to each press, so it plays on
 * turning on and never on first paint.
 *
 * Why not Toast: the bencho block is a single button whose label changes, not
 * a stack of notifications, so there is nothing for a toast to hold.
 */

const PREFIX = "dowel-notify-button";

const STYLES = `
@keyframes ${PREFIX}-ring{0%{transform:rotate(0)}11%{transform:rotate(-17deg)}27%{transform:rotate(14deg)}44%{transform:rotate(-9deg)}61%{transform:rotate(6deg)}78%{transform:rotate(-3deg)}100%{transform:rotate(0)}}
[data-slot=notify-button-bell]{transform-origin:50% 16%}
[data-slot=notify-button-bell][data-ring]{animation:${PREFIX}-ring calc(820ms * var(--motion-scale,1)) ease-out}
`;

const notifyButtonVariants = cva(
  cn(
    "h-11 gap-2.5 rounded-full bg-card px-5 text-[0.84375rem] font-normal text-card-foreground",
    "hover:bg-card data-[state=on]:bg-muted",
    "transition-[background-color,box-shadow,scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
    "motion-safe:active:scale-[0.96]",
  ),
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. It hides when on. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)] data-[state=on]:shadow-none",
        false: "",
      },
    },
    defaultVariants: { stroke: true },
  },
);

const labelLayer = cn(
  "col-start-1 row-start-1 w-max justify-self-start",
  "transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
  "data-[state=hidden]:opacity-0",
);

export interface NotifyButtonProps
  extends
    Omit<ButtonProps, "children" | "asChild" | "variant">,
    VariantProps<typeof notifyButtonVariants> {
  /** Resting label, and the button's accessible name. */
  label?: ReactNode;
  /** Shown while on. */
  activeLabel?: ReactNode;
  /** The glyph that rings. Defaults to a bell. */
  icon?: ReactNode;
  /** Announced when turned on. Defaults to `activeLabel` when it is text. */
  announcement?: string;
  /** Controlled state. */
  pressed?: boolean;
  /** Initial state when uncontrolled. */
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

function Bell() {
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
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    </svg>
  );
}

/** A "notify me" toggle whose bell rings and whose label grows into the confirmation. */
export function NotifyButton({
  className,
  stroke,
  label = "Notify me",
  activeLabel = "You’ll be notified",
  icon,
  announcement,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  onClick,
  size = "md",
  ...props
}: NotifyButtonProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultPressed);
  const pressed = pressedProp ?? uncontrolled;
  const [rings, setRings] = useState(0);
  const [announced, setAnnounced] = useState("");
  const clipRef = useRef<HTMLSpanElement | null>(null);
  const restRef = useRef<HTMLSpanElement | null>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  // The clip is exactly as wide as the label on show, so the pill grows and
  // shrinks with it. Measured after layout, written straight to the DOM.
  useLayoutEffect(() => {
    const showing = pressed ? activeRef.current : restRef.current;
    const width = showing?.offsetWidth ?? 0;
    if (clipRef.current && width > 0) clipRef.current.style.width = `${String(width)}px`;
  }, [pressed, label, activeLabel]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const next = !pressed;
    if (pressedProp === undefined) setUncontrolled(next);
    onPressedChange?.(next);
    if (next) {
      setRings((count) => count + 1);
      setAnnounced(announcement ?? (typeof activeLabel === "string" ? activeLabel : "On"));
    } else {
      setAnnounced("");
    }
  }

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Button
        data-slot="notify-button"
        data-state={pressed ? "on" : "off"}
        aria-pressed={pressed}
        variant="secondary"
        size={size}
        className={cn(notifyButtonVariants({ stroke }), className)}
        onClick={handleClick}
        {...props}
      >
        <span
          key={rings}
          data-slot="notify-button-bell"
          data-ring={pressed && rings > 0 ? "" : undefined}
          aria-hidden="true"
          className="grid place-items-center"
        >
          {icon ?? <Bell />}
        </span>
        <span
          ref={clipRef}
          data-slot="notify-button-label"
          className={cn(
            "grid h-[1.125rem] items-center overflow-hidden",
            "transition-[width] duration-[var(--duration-slower)] ease-[var(--ease-overshoot)]",
          )}
        >
          <span
            ref={restRef}
            data-state={pressed ? "hidden" : "visible"}
            className={labelLayer}
          >
            {label}
          </span>
          <span
            ref={activeRef}
            aria-hidden="true"
            data-state={pressed ? "visible" : "hidden"}
            className={labelLayer}
          >
            {activeLabel}
          </span>
        </span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </>
  );
}

export { notifyButtonVariants };
