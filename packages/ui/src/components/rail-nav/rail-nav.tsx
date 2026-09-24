"use client";

// Original design (pattern inspired by Rare UI Bounce sidebar and Hook Sidebar; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A vertical list of navigation rows with one spring-driven marker for the
 * active row. Two source items share the mechanism, so they are one component
 * with an `indicator` axis (ADR 0014, "families, not copies"):
 *
 * - `bounce` — a small round marker in the start gutter. It rides a spring
 *   tuned to overshoot, and deforms by its own speed: it stretches along the
 *   travel and narrows across it, then settles round. The deformation is read
 *   off the spring's velocity every frame, so the squash always agrees with
 *   the motion instead of being a keyframe guessed to line up with it.
 * - `hook` — a rail down the start edge, from the top of the list to the
 *   active row, where a rounded corner turns it into the row. It is one SVG
 *   path whose end point rides the spring, so the dash pattern stays anchored
 *   at the top and extending the rail reveals dashes rather than stretching
 *   them. Hovering or focusing another row draws a second, neutral rail of
 *   the same shape underneath, to that row; where it overlaps the accent rail
 *   it is hidden, so what shows is the part beyond where the accent rail ends.
 *
 * Both measure the active row's centre (its offset within the track) and hand
 * it to a spring. Nothing animates on first paint; resizes re-place without
 * animating; reduced motion jumps. The SVG is mirrored in right-to-left, and
 * every inset is logical, so the rail runs down the start edge either way.
 *
 * Headings are rows the marker never lands on, and they are not focusable.
 * Every selectable row is a real link (`href`) or button, all in the Tab
 * order; arrow keys, Home and End also move between them.
 */

const railNavVariants = cva("flex flex-col gap-2 text-sm", {
  variants: {
    /** The shape of the active marker. */
    indicator: {
      bounce: "[--rail-nav-gutter:1.125rem]",
      hook: "[--rail-nav-gutter:1.75rem]",
    },
  },
  defaultVariants: { indicator: "bounce" },
});

const itemClass = cn(
  "flex w-full items-center rounded-md py-1.5 ps-(--rail-nav-gutter) pe-2 text-start text-muted-foreground",
  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:text-foreground data-[state=active]:text-foreground",
  focusRing,
  disabledStyles,
);

/** A marker that overshoots visibly, and one that barely does. */
const BOUNCE_SPRING = { stiffness: 420, damping: 20, mass: 0.9 };
const HOOK_SPRING = { stiffness: 320, damping: 26 };
const HOVER_SPRING = { stiffness: 380, damping: 34 };

/** Pixels per second at which the bounce marker reaches its full stretch. */
const FULL_STRETCH_SPEED = 1200;

/** Hook geometry, in px: the rail's x, the corner's radius, and where the hook ends. */
const RAIL_X = 1;
const HOOK_RADIUS = 8;
const HOOK_END = 18;

const round = (value: number) => Math.round(value * 100) / 100;

/** The rail from the top of the list down to `y`, turning into the row there. */
export function railNavHookPath(y: number): string {
  const bottom = Math.max(0, y);
  const radius = Math.min(HOOK_RADIUS, bottom);
  return (
    `M${String(RAIL_X)} 0V${String(round(bottom - radius))}` +
    `A${String(radius)} ${String(radius)} 0 0 0 ${String(RAIL_X + radius)} ${String(round(bottom))}` +
    `H${String(HOOK_END)}`
  );
}

/** A row's vertical centre within the track, or null when it is not rendered. */
function centreOf(rows: (HTMLLIElement | null)[], index: number): number | null {
  const row = index >= 0 ? rows[index] : undefined;
  return row ? row.offsetTop + row.offsetHeight / 2 : null;
}

export type RailNavItem =
  | string
  | { label: ReactNode; href?: string; disabled?: boolean; heading?: false }
  | { label: ReactNode; heading: true };

interface Row {
  label: ReactNode;
  href: string | undefined;
  heading: boolean;
  disabled: boolean;
}

function toRow(item: RailNavItem): Row {
  if (typeof item === "string") {
    return { label: item, href: undefined, heading: false, disabled: false };
  }
  if (item.heading)
    return { label: item.label, href: undefined, heading: true, disabled: true };
  return {
    label: item.label,
    href: item.href,
    heading: false,
    disabled: item.disabled ?? false,
  };
}

export interface RailNavProps
  extends
    Omit<ComponentPropsWithRef<"nav">, "defaultValue" | "color">,
    VariantProps<typeof railNavVariants> {
  /**
   * The rows, in order. A string or `{ label }` is a button, `href` makes it a
   * link, and `{ label, heading: true }` is a group label the marker skips.
   */
  items: RailNavItem[];
  /** A title shown above the list. It also names the navigation. */
  label?: ReactNode;
  /** Index (into `items`) of the active row, when controlled. */
  value?: number;
  /** Index of the row active at first, when uncontrolled. Defaults to the first selectable row. */
  defaultValue?: number;
  /** Called with the index of a newly selected row. */
  onValueChange?: (index: number) => void;
  /** Any CSS colour for the active marker. Defaults to the primary token. */
  color?: string;
  /** Draw the hook rail as dashes. Only applies to `indicator="hook"`. */
  dashed?: boolean;
}

/** A vertical navigation list whose active marker springs between rows. */
export function RailNav({
  className,
  style,
  items,
  indicator,
  label,
  value,
  defaultValue,
  onValueChange,
  color,
  dashed = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RailNavProps) {
  const rows = items.map(toRow);
  const hook = indicator === "hook";
  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? rows.findIndex((row) => !row.heading && !row.disabled),
  );
  const selected = value ?? uncontrolled;
  const current = rows[selected] && !rows[selected].heading ? selected : -1;
  const [pointed, setPointed] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const hovered = pointed ?? focused;
  const reduced = useReducedMotion() ?? false;
  const titleId = useId();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const placed = useRef(false);
  const latest = useRef({ current, hovered });

  const shown = useMotionValue(0);
  const accentY = useSpring(0, hook ? HOOK_SPRING : BOUNCE_SPRING);
  const hoverY = useSpring(0, HOVER_SPRING);
  const velocity = useVelocity(accentY);
  const stretch = useTransform(velocity, (v) => Math.min(Math.abs(v) / FULL_STRETCH_SPEED, 1));
  const scaleY = useTransform(stretch, (s) => 1 + s * 0.9);
  const scaleX = useTransform(stretch, (s) => 1 - s * 0.35);
  const accentPath = useTransform(accentY, railNavHookPath);
  const hoverPath = useTransform(hoverY, railNavHookPath);

  useLayoutEffect(() => {
    latest.current = { current, hovered };
  });

  // The accent follows the active row: placed without motion the first time,
  // on a spring after that.
  useLayoutEffect(() => {
    const y = centreOf(rowRefs.current, current);
    if (y === null) {
      shown.set(0);
      return;
    }
    if (placed.current && !reduced) {
      accentY.set(y);
    } else {
      accentY.jump(y);
      hoverY.jump(y);
    }
    placed.current = true;
    shown.set(1);
  }, [current, items, reduced, accentY, hoverY, shown]);

  // The neutral rail heads for the hovered row, and back under the accent when
  // nothing is hovered, so it retracts rather than vanishing in place.
  useLayoutEffect(() => {
    const y = centreOf(rowRefs.current, hovered ?? current);
    if (y === null || !placed.current) return;
    if (reduced) hoverY.jump(y);
    else hoverY.set(y);
  }, [hovered, current, reduced, hoverY]);

  // A reflow moves rows under a still marker: follow them without animating.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      const accent = centreOf(rowRefs.current, latest.current.current);
      if (accent === null) return;
      accentY.jump(accent);
      hoverY.jump(
        centreOf(rowRefs.current, latest.current.hovered ?? latest.current.current) ?? accent,
      );
    });
    observer.observe(track);
    return () => {
      observer.disconnect();
    };
  }, [accentY, hoverY]);

  function select(index: number, event: MouseEvent<HTMLElement>) {
    if (rows[index]?.disabled) {
      event.preventDefault();
      return;
    }
    if (index === current) return;
    if (value === undefined) setUncontrolled(index);
    onValueChange?.(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const track = trackRef.current;
    if (!track || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const targets = [
      ...track.querySelectorAll<HTMLElement>(
        '[data-slot="rail-nav-item"]:not(:disabled):not([aria-disabled="true"])',
      ),
    ];
    const at = targets.indexOf(event.currentTarget);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? targets.length - 1
          : (at + (event.key === "ArrowDown" ? 1 : -1) + targets.length) % targets.length;
    event.preventDefault();
    targets[next]?.focus();
  }

  const neutralVisible = hovered !== null && hovered !== current && current >= 0;

  return (
    <MotionConfig reducedMotion="user">
      <nav
        data-slot="rail-nav"
        data-indicator={hook ? "hook" : "bounce"}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (label && !ariaLabel ? titleId : undefined)}
        className={cn(railNavVariants({ indicator }), className)}
        style={
          { "--rail-nav-accent": color ?? "var(--color-primary)", ...style } as CSSProperties
        }
        {...props}
      >
        {label ? (
          <p
            id={titleId}
            data-slot="rail-nav-label"
            className="ps-(--rail-nav-gutter) text-xs font-medium text-muted-foreground"
          >
            {label}
          </p>
        ) : null}
        <div
          ref={trackRef}
          data-slot="rail-nav-track"
          className="relative"
          onPointerLeave={() => {
            setPointed(null);
          }}
        >
          {hook ? (
            <svg
              aria-hidden="true"
              focusable="false"
              data-slot="rail-nav-rail"
              width={HOOK_END + 2}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray={dashed ? "3 3" : undefined}
              strokeLinecap={dashed ? "butt" : "round"}
              className={cn(
                "pointer-events-none absolute inset-y-0 start-0 h-full overflow-visible",
                mirrorForDirection,
              )}
            >
              <motion.path
                data-slot="rail-nav-rail-hover"
                data-state={neutralVisible ? "visible" : "hidden"}
                d={hoverPath}
                className={cn(
                  "stroke-muted-foreground/35 opacity-0 data-[state=visible]:opacity-100",
                  "transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                )}
              />
              <motion.path
                data-slot="rail-nav-rail-accent"
                d={accentPath}
                className="stroke-(--rail-nav-accent)"
                style={{ opacity: shown }}
              />
            </svg>
          ) : (
            <motion.span
              aria-hidden="true"
              data-slot="rail-nav-marker"
              className="pointer-events-none absolute start-0.5 top-0 size-1.5 -translate-y-1/2 rounded-full bg-(--rail-nav-accent)"
              style={{ y: accentY, scaleX, scaleY, opacity: shown }}
            />
          )}
          <ul data-slot="rail-nav-list" className="flex flex-col gap-0.5">
            {rows.map((row, index) => {
              const key = String(index);
              if (row.heading) {
                return (
                  <li
                    key={key}
                    ref={(node) => {
                      rowRefs.current[index] = node;
                    }}
                    data-slot="rail-nav-heading"
                    className="ps-(--rail-nav-gutter) pt-3 pb-1 text-xs font-medium text-muted-foreground first:pt-0"
                  >
                    {row.label}
                  </li>
                );
              }
              const active = index === current;
              const shared = {
                "data-slot": "rail-nav-item",
                "data-state": active ? "active" : "inactive",
                className: itemClass,
                onClick: (event: MouseEvent<HTMLElement>) => {
                  select(index, event);
                },
                onKeyDown: handleKeyDown,
                onPointerEnter: () => {
                  if (!row.disabled) setPointed(index);
                },
                onFocus: () => {
                  setFocused(index);
                },
                onBlur: () => {
                  setFocused(null);
                },
              };
              return (
                <li
                  key={key}
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  data-slot="rail-nav-row"
                >
                  {row.href !== undefined ? (
                    <a
                      href={row.href}
                      aria-current={active ? "page" : undefined}
                      aria-disabled={row.disabled || undefined}
                      {...shared}
                    >
                      {row.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={row.disabled}
                      aria-current={active ? "true" : undefined}
                      {...shared}
                    >
                      {row.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </MotionConfig>
  );
}

export { railNavVariants };
