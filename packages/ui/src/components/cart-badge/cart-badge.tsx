"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A bag with a count, and a "+" that throws things into it.
 *
 * Pressing "+" launches a dot from the button toward the bag's badge on an
 * arc: the dot rides two nested layers, the outer moving it across linearly
 * and the inner moving it up and back down with an ease-out then ease-in, so
 * the two together trace a parabola. When the dot lands (its animationend) the
 * badge takes the new number and pops through an overshoot. The count itself
 * changes at the press — `onCountChange` and `onAdd` fire immediately — but
 * the badge holds the old number until the dot arrives, so cause and effect
 * read in order. Several quick presses launch several dots, each landing on
 * its own number.
 *
 * The geometry is in `em` and fixed, so the arc needs no measuring. The
 * horizontal throw is multiplied by `--cart-badge-dir`, which flips in RTL,
 * where the bag sits at the right and the throw runs the other way.
 *
 * Accessibility: "+" is a real button named by `addLabel`. The bag drawing and
 * the badge digits are aria-hidden; a polite live region states the count in
 * words ("3 items in bag") and changes only when a dot lands, so it does not
 * chatter. Under reduced motion the flight and pop collapse to their final
 * frames, and the number updates at once.
 */

const PREFIX = "dowel-cart-badge";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-across{from{transform:translateX(calc(3.275em * var(--cart-badge-dir, 1)))}to{transform:translateX(0)}}
@keyframes ${PREFIX}-arc{0%{transform:translateY(1.475em) scale(1);animation-timing-function:cubic-bezier(.2,.6,.4,1)}45%{transform:translateY(-1.2em) scale(1.1);animation-timing-function:cubic-bezier(.6,0,.8,.4)}100%{transform:translateY(0) scale(.7)}}
@keyframes ${PREFIX}-pop{0%{scale:.4}45%{scale:1.3}70%{scale:.9}100%{scale:1}}
[data-slot=cart-badge-flight]{animation:${PREFIX}-across ${scaled(520)} linear both}
[data-slot=cart-badge-flight]>span{animation:${PREFIX}-arc ${scaled(520)} both}
[data-slot=cart-badge-count][data-animate]{animation:${PREFIX}-pop ${scaled(420)} var(--ease-out-quint) both}
`;

const cartBadgeVariants = cva(
  "relative inline-flex items-center gap-[1.5em] [--cart-badge-dir:1] rtl:[--cart-badge-dir:-1]",
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

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[1.5em]"
    >
      <path d="M5.5 8h13l-1 12.5h-11L5.5 8Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-[1.25em]"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface CartBadgeProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof cartBadgeVariants> {
  /** Controlled count. */
  count?: number;
  /** Initial count when uncontrolled. */
  defaultCount?: number;
  /** Called with the requested count when "+" is pressed. */
  onCountChange?: (count: number) => void;
  /** Called when "+" is pressed, before the dot lands. */
  onAdd?: () => void;
  /** The accessible name of the "+" button. */
  addLabel?: string;
  /** Words for the live region. Defaults to "3 items in bag". */
  formatStatus?: (count: number) => string;
  /** Disables the "+" button. */
  disabled?: boolean;
}

/** How long a dot may take to land before it is treated as landed anyway. */
const LANDING_FALLBACK_MS = 2000;

/**
 * One dot in flight. A native animationend listener rather than
 * onAnimationEnd: React picks a vendor-prefixed event name wherever
 * AnimationEvent is missing, and would never hear it. The timer is a fallback
 * for an animation that never runs (an element that is not rendered).
 */
function FlyingDot({ onLand }: { onLand: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const land = useRef(onLand);
  useEffect(() => {
    land.current = onLand;
  });

  useEffect(() => {
    const element = ref.current;
    let done = false;
    const finish = (event?: Event) => {
      if (done || (event && event.target !== element)) return;
      done = true;
      land.current();
    };
    const timer = window.setTimeout(finish, LANDING_FALLBACK_MS);
    element?.addEventListener("animationend", finish);
    return () => {
      window.clearTimeout(timer);
      element?.removeEventListener("animationend", finish);
    };
  }, []);

  return (
    <span
      ref={ref}
      data-slot="cart-badge-flight"
      className="pointer-events-none absolute start-[2.975em] top-[0.025em]"
    >
      <span className="block size-[0.5em] rounded-full bg-foreground shadow" />
    </span>
  );
}

interface Flight {
  id: number;
  target: number;
}

function defaultStatus(count: number): string {
  return `${String(count)} ${count === 1 ? "item" : "items"} in bag`;
}

/** A bag tile with a count badge and a "+" button that flies a dot into the bag. */
export function CartBadge({
  className,
  size,
  count: countProp,
  defaultCount = 0,
  onCountChange,
  onAdd,
  addLabel = "Add to bag",
  formatStatus = defaultStatus,
  disabled,
  ...props
}: CartBadgeProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultCount);
  const controlled = countProp !== undefined;
  const count = controlled ? countProp : uncontrolled;

  const [flights, setFlights] = useState<Flight[]>([]);
  const [landed, setLanded] = useState(count);
  const nextId = useRef(0);
  const shown = flights.length > 0 ? landed : count;

  // A change in the shown number pops the badge, derived during render.
  const [previous, setPrevious] = useState(shown);
  const [pops, setPops] = useState(0);
  if (previous !== shown) {
    setPrevious(shown);
    setPops(pops + 1);
  }

  function handleAdd() {
    const target = count + 1;
    if (flights.length === 0) setLanded(count);
    nextId.current += 1;
    const id = nextId.current;
    setFlights((current) => [...current, { id, target }]);
    if (!controlled) setUncontrolled(target);
    onCountChange?.(target);
    onAdd?.();
  }

  function handleLand(flight: Flight) {
    setLanded(flight.target);
    setFlights((current) => current.filter((item) => item.id !== flight.id));
  }

  return (
    <div
      data-slot="cart-badge"
      className={cn(cartBadgeVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="cart-badge-bag"
        className="relative grid size-[3.5em] place-items-center rounded-[1.1em] border border-foreground/5 bg-muted text-foreground shadow-sm"
      >
        <BagIcon />
        {shown > 0 ? (
          <span
            key={pops}
            data-slot="cart-badge-count"
            data-value={shown}
            data-animate={pops > 0 ? "" : undefined}
            className="absolute -end-[0.35em] -top-[0.35em] grid h-[1.25em] min-w-[1.25em] place-items-center rounded-full bg-foreground px-[0.3em] text-[0.75em] leading-none font-bold text-background tabular-nums shadow"
          >
            {shown}
          </span>
        ) : null}
        {flights.map((flight) => (
          <FlyingDot
            key={flight.id}
            onLand={() => {
              handleLand(flight);
            }}
          />
        ))}
      </span>
      <button
        type="button"
        data-slot="cart-badge-add"
        aria-label={addLabel}
        disabled={disabled}
        className={cn(
          "grid size-[3em] place-items-center rounded-[0.9em] bg-foreground text-background shadow-sm",
          "transition-[scale,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] motion-safe:active:scale-90",
          focusRing,
          disabledStyles,
        )}
        onClick={handleAdd}
      >
        <PlusIcon />
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {formatStatus(shown)}
      </span>
    </div>
  );
}

export { cartBadgeVariants };
