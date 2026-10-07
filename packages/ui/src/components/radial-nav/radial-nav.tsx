"use client";

// Original design (pattern inspired by Animate UI Radial Nav; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Navigation laid out on a ring around a hub.
 *
 * The items sit evenly around a circle, the first at the top, going clockwise
 * (anticlockwise in right-to-left). Between them and the hub runs a faint
 * track, and on it an indicator — an arc of light on the track with a glow
 * behind the active item and a notch on the hub's rim pointing at it — that
 * rotates to the active item on a spring. It always takes the short way round:
 * the rotation is unbounded, and each change adds the smallest signed turn
 * to where it is, so going from the last item to the first steps forward one
 * place instead of unwinding the whole ring. The arc also stretches with the
 * spring's speed, so a long jump smears a little and then gathers itself.
 *
 * The hub shows the active item's icon and label, cross-fading through a blur
 * as it changes. Items swell and glow on hover and keyboard focus, and show a
 * small caption. Positions are pure CSS — each item is translated from the
 * centre by cos/sin of its angle times a radius derived from the `size`
 * variant in rem — so the ring scales with the type and needs no measuring.
 *
 * Semantics: a <nav> around a real list. With `href` each item is a link and
 * the active one has aria-current="page"; without, they are toggle buttons and
 * the active one is aria-pressed. One Tab stop, a roving tabindex: arrow keys
 * move around the ring (Right/Down forward, Left/Up back, swapped right to
 * left), Home and End jump to the first and last. The ring, the indicator and
 * the hub are aria-hidden: the active item is already named by aria-current
 * or aria-pressed, and set apart by colour and fill. Nothing animates on first
 * paint, and under reduced motion the indicator jumps.
 */

const radialNavVariants = cva(
  cn(
    "relative isolate size-(--radial-nav-size) shrink-0 rounded-full",
    "[--radial-nav-radius:calc(var(--radial-nav-size)*0.38)]",
  ),
  {
    variants: {
      /** The ring's diameter and its items' size, in rem. */
      size: {
        sm: "text-xs [--radial-nav-item:2.5rem] [--radial-nav-size:14rem] [&_[data-slot=radial-nav-item]_svg]:size-4",
        md: "text-sm [--radial-nav-item:3rem] [--radial-nav-size:18rem] [&_[data-slot=radial-nav-item]_svg]:size-5",
        lg: "text-base [--radial-nav-item:3.5rem] [--radial-nav-size:22rem] [&_[data-slot=radial-nav-item]_svg]:size-6",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const itemClass = cn(
  "group/radial-nav-item relative grid size-full place-items-center rounded-full",
  "border border-border bg-card text-muted-foreground shadow-sm",
  "transition-[scale,box-shadow,color,background-color,border-color] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "hover:text-foreground motion-safe:hover:scale-115 motion-safe:focus-visible:scale-115",
  "hover:shadow-[0_0_1.25rem_color-mix(in_oklab,var(--color-primary)_45%,transparent)]",
  "focus-visible:shadow-[0_0_1.25rem_color-mix(in_oklab,var(--color-primary)_45%,transparent)]",
  "data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  focusRing,
);

/** Track radius, in the indicator's 0–100 viewBox. Matches --radial-nav-radius (0.38 of the size). */
const TRACK = 38;
/** The hub's radius in the same units: it is 40% of the ring. */
const HUB = 20;

const TURN = { stiffness: 210, damping: 21, mass: 0.9 };

const round = (value: number) => Math.round(value * 1e4) / 1e4;

/** A point on the track, `degrees` clockwise from straight up. */
function onTrack(degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [round(50 + TRACK * Math.sin(radians)), round(50 - TRACK * Math.cos(radians))];
}

/** The indicator arc: centred on straight up, `half` degrees either side. */
export function radialNavArc(half: number): string {
  const [x1, y1] = onTrack(-half);
  const [x2, y2] = onTrack(half);
  return `M${String(x1)} ${String(y1)}A${String(TRACK)} ${String(TRACK)} 0 0 1 ${String(x2)} ${String(y2)}`;
}

/** `to` expressed as the rotation nearest `from`: the short way round. */
export function radialNavNearest(from: number, to: number): number {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
}

export interface RadialNavItem {
  id: string;
  /** The item's accessible name, its hover caption, and what the hub shows while it is active. */
  label: string;
  /** Decorative icon. */
  icon: ReactNode;
  /** Makes the item a link. */
  href?: string;
}

export interface RadialNavProps
  extends
    Omit<ComponentPropsWithRef<"nav">, "defaultValue" | "children">,
    VariantProps<typeof radialNavVariants> {
  /** The items, clockwise from the top. */
  items: RadialNavItem[];
  /** Controlled active item id. */
  value?: string;
  /** Uncontrolled initial active item id. Defaults to the first. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/** Navigation on a ring around a hub, with an indicator that springs the short way round. */
export function RadialNav({
  className,
  size,
  items,
  value,
  defaultValue,
  onValueChange,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RadialNavProps) {
  const [uncontrolled, setUncontrolled] = useState(() => defaultValue ?? items[0]?.id);
  const activeId = value ?? uncontrolled;
  const active = items.findIndex((item) => item.id === activeId);
  const activeItem = items[active];
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [rtl, setRtl] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const count = Math.max(1, items.length);
  const step = 360 / count;
  const sign = rtl ? -1 : 1;
  const desired = sign * Math.max(0, active) * step;

  const rotation = useSpring(desired, TURN);
  const placed = useRef(desired);
  const placedSign = useRef(sign);
  const shown = useMotionValue(active === -1 ? 0 : 1);
  const velocity = useVelocity(rotation);
  const base = Math.min(step * 0.32, 26);
  const arc = useTransform(velocity, (speed) =>
    radialNavArc(base + Math.min(Math.abs(speed) / 720, 1) * 14),
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setRtl(getComputedStyle(root).direction === "rtl");
  }, []);

  // The indicator heads for the active item the short way round: placed
  // without motion at first, on a spring after that.
  useLayoutEffect(() => {
    shown.set(active === -1 ? 0 : 1);
    if (active === -1) return;
    const target = radialNavNearest(placed.current, desired);
    placed.current = target;
    // Discovering the direction is a re-layout, not a move: it jumps too.
    const flipped = placedSign.current !== sign;
    placedSign.current = sign;
    if (reduced || flipped) rotation.jump(target);
    else rotation.set(target);
  }, [active, desired, sign, reduced, rotation, shown]);

  const setRoot = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const tabStop = focusIndex ?? (active === -1 ? 0 : active);

  function select(index: number) {
    const item = items[index];
    if (!item || index === active) return;
    if (value === undefined) setUncontrolled(item.id);
    onValueChange?.(item.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = index + 1;
        break;
      case "ArrowUp":
        next = index - 1;
        break;
      case "ArrowRight":
        next = index + sign;
        break;
      case "ArrowLeft":
        next = index - sign;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    itemRefs.current[(next + items.length) % items.length]?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <nav
        ref={setRoot}
        data-slot="radial-nav"
        aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Main")}
        aria-labelledby={ariaLabelledBy}
        className={cn(radialNavVariants({ size }), className)}
        {...props}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          data-slot="radial-nav-track"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <circle
            cx="50"
            cy="50"
            r={TRACK}
            fill="none"
            strokeWidth="0.5"
            className="stroke-border"
          />
          <circle
            cx="50"
            cy="50"
            r={HUB + 4}
            fill="none"
            strokeWidth="0.3"
            strokeDasharray="0.6 1.8"
            className="stroke-muted-foreground/40"
          />
        </svg>

        <motion.div
          aria-hidden="true"
          data-slot="radial-nav-indicator"
          className="pointer-events-none absolute inset-0"
          style={{ rotate: rotation, opacity: shown }}
        >
          <span
            data-slot="radial-nav-glow"
            className="absolute top-[12%] left-1/2 size-(--radial-nav-item) -translate-x-1/2 -translate-y-1/2 scale-150 rounded-full bg-primary/30 blur-xl"
          />
          <svg
            focusable="false"
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full overflow-visible"
          >
            <motion.path
              data-slot="radial-nav-arc"
              d={arc}
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="stroke-primary"
            />
            <path
              data-slot="radial-nav-notch"
              d={`M47.5 ${String(50 - HUB + 0.6)}L50 ${String(50 - HUB - 3.2)}L52.5 ${String(50 - HUB + 0.6)}Z`}
              className="fill-primary"
            />
          </svg>
        </motion.div>

        <div
          aria-hidden="true"
          data-slot="radial-nav-hub"
          className={cn(
            "absolute inset-0 m-auto grid size-[40%] place-items-center overflow-hidden rounded-full",
            "border border-border bg-card text-card-foreground shadow-md",
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {activeItem ? (
              <motion.div
                key={activeItem.id}
                data-slot="radial-nav-hub-content"
                className="col-start-1 row-start-1 flex flex-col items-center gap-1 px-2 text-center [&_svg]:size-[1.6em] [&_svg]:text-primary"
                initial={{ opacity: 0, scale: 0.6, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.25, y: -6, filter: "blur(6px)" }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                {activeItem.icon}
                <span className="max-w-full truncate font-medium">{activeItem.label}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <ul data-slot="radial-nav-list" className="absolute inset-0">
          {items.map((item, index) => {
            const degrees = index * step;
            const radians = (degrees * Math.PI) / 180;
            const x = round(sign * Math.sin(radians));
            const y = round(-Math.cos(radians));
            const isActive = index === active;
            const shared = {
              ref: (node: HTMLElement | null) => {
                itemRefs.current[index] = node;
              },
              "data-slot": "radial-nav-item",
              "data-state": isActive ? "active" : "inactive",
              tabIndex: index === tabStop ? 0 : -1,
              className: itemClass,
              onClick: (event: MouseEvent<HTMLElement>) => {
                if (event.defaultPrevented) return;
                select(index);
              },
              onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                handleKeyDown(event, index);
              },
              onFocus: () => {
                setFocusIndex(index);
              },
            };
            const content = (
              <>
                <span aria-hidden="true" className="grid place-items-center">
                  {item.icon}
                </span>
                <span className="sr-only">{item.label}</span>
                <span
                  aria-hidden="true"
                  data-slot="radial-nav-caption"
                  className={cn(
                    "pointer-events-none absolute top-full left-1/2 mt-1.5 w-max -translate-x-1/2 rounded-md px-1.5 py-0.5",
                    "bg-popover text-[0.6875rem] font-medium text-popover-foreground shadow-sm",
                    "translate-y-1 opacity-0 transition-[opacity,translate] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
                    "group-hover/radial-nav-item:translate-y-0 group-hover/radial-nav-item:opacity-100",
                    "group-focus-visible/radial-nav-item:translate-y-0 group-focus-visible/radial-nav-item:opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </>
            );
            return (
              <li
                key={item.id}
                data-slot="radial-nav-row"
                className="absolute inset-0 m-auto size-(--radial-nav-item) hover:z-10 has-focus-visible:z-10"
                style={{
                  translate: `calc(${String(x)} * var(--radial-nav-radius)) calc(${String(y)} * var(--radial-nav-radius))`,
                }}
              >
                {item.href !== undefined ? (
                  <a href={item.href} aria-current={isActive ? "page" : undefined} {...shared}>
                    {content}
                  </a>
                ) : (
                  <button type="button" aria-pressed={isActive} {...shared}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </MotionConfig>
  );
}

export { radialNavVariants };
