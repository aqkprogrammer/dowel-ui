"use client";

// Original design (pattern inspired by Rare UI Gooey nav; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A segmented bar whose selected item comes away from the rest: a gap opens
 * on each side of it, so it stands as its own tile, while the other items
 * close up into one continuous piece.
 *
 * The whole shape is driven by one spring: the selection's position, as a
 * continuous index. Each seam between two tiles is open (1) while that
 * position sits on either side of it and closes linearly over one index
 * beyond, and everything else is derived from the seams — a tile's offset is
 * the open seams before it, re-centred on the total, and its corners along a
 * seam round in proportion to how open that seam is. So a closed seam has
 * square corners and the tiles read as one piece, an open one has full
 * corners, and between the two the corners and the gap move together. On a
 * long jump the opening travels across the bar and heals behind itself, which
 * is the melt; between neighbours it is a straight hand-over.
 *
 * Only `translate` and corner radii change, never layout: the list reserves
 * one separation of padding on each side, which is exactly as far as a tile
 * can travel, so the bar never changes size and nothing around it reflows.
 * Offsets are written as CSS variables and turned into logical translation
 * and logical corners, so the bar mirrors in right-to-left without measuring
 * anything. Tiles overlap by a pixel so a closed seam never shows a hairline
 * of the background through anti-aliasing.
 *
 * Items are links (aria-current="page") or buttons (aria-current="true"), all
 * in the Tab order, with arrow keys, Home and End as a shortcut between them.
 * Under reduced motion the spring jumps.
 */

const gooeyNavVariants = cva(
  cn(
    "relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "translate-x-[calc(var(--gooey-nav-x,0)*1px)] rtl:translate-x-[calc(var(--gooey-nav-x,0)*-1px)]",
    "rounded-s-[calc(var(--gooey-nav-rs,0)*1px)] rounded-e-[calc(var(--gooey-nav-re,0)*1px)]",
    "transition-[color,background-color] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
    "data-[state=active]:z-[1]",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      /** Padding, text and icon size; also picks the default separation and radius. */
      size: {
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        md: "h-10 gap-2 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-5 text-base [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** Separation and radius, in px, that keep each size in proportion. */
const SHAPE = {
  xs: { separation: 14, radius: 8 },
  sm: { separation: 16, radius: 10 },
  md: { separation: 20, radius: 12 },
  lg: { separation: 24, radius: 14 },
} as const;

const INACTIVE = "bg-muted text-muted-foreground hover:text-foreground";
const SPRING = { stiffness: 320, damping: 26 };

/** How open the seam after tile `k` is when the selection is at `position`. */
export function gooeyNavSeam(k: number, position: number): number {
  const distance = position < k ? k - position : position > k + 1 ? position - k - 1 : 0;
  return Math.max(0, 1 - distance);
}

/** Tile `index`'s offset, in separations, with the open gaps centred on the bar. */
export function gooeyNavOffset(index: number, count: number, position: number): number {
  let before = 0;
  let total = 0;
  for (let k = 0; k < count - 1; k += 1) {
    const open = gooeyNavSeam(k, position);
    total += open;
    if (k < index) before += open;
  }
  return before - total / 2;
}

export type GooeyNavItem =
  string | { label: ReactNode; href?: string; icon?: ReactNode; disabled?: boolean };

interface TileProps {
  index: number;
  count: number;
  position: MotionValue<number>;
  separation: number;
  radius: number;
}

/** The three values a tile moves by, derived from the shared position. */
function useTile({ index, count, position, separation, radius }: TileProps): MotionStyle {
  const x = useTransform(position, (p) => gooeyNavOffset(index, count, p) * separation);
  const start = useTransform(position, (p) =>
    index === 0 ? radius : gooeyNavSeam(index - 1, p) * radius,
  );
  const end = useTransform(position, (p) =>
    index === count - 1 ? radius : gooeyNavSeam(index, p) * radius,
  );
  return { "--gooey-nav-x": x, "--gooey-nav-rs": start, "--gooey-nav-re": end } as MotionStyle;
}

interface GooeyNavTileProps extends TileProps {
  item: GooeyNavItem;
  active: boolean;
  className: string;
  onSelect: (index: number, event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

function GooeyNavTile({
  item,
  active,
  className,
  onSelect,
  onKeyDown,
  ...tile
}: GooeyNavTileProps) {
  const style = useTile(tile);
  const { label, href, icon, disabled } =
    typeof item === "string"
      ? { label: item, href: undefined, icon: null, disabled: false }
      : item;
  const shared = {
    "data-slot": "gooey-nav-item",
    "data-state": active ? "active" : "inactive",
    className,
    style,
    onClick: (event: MouseEvent<HTMLElement>) => {
      onSelect(tile.index, event);
    },
    onKeyDown,
  };
  const content = (
    <>
      {icon ? (
        <span aria-hidden="true" className="contents">
          {icon}
        </span>
      ) : null}
      {label}
    </>
  );
  return (
    <li className="flex not-first:-ms-px">
      {href !== undefined ? (
        <motion.a
          href={href}
          aria-current={active ? "page" : undefined}
          aria-disabled={disabled || undefined}
          {...shared}
        >
          {content}
        </motion.a>
      ) : (
        <motion.button
          type="button"
          disabled={disabled}
          aria-current={active ? "true" : undefined}
          {...shared}
        >
          {content}
        </motion.button>
      )}
    </li>
  );
}

export interface GooeyNavProps
  extends
    Omit<ComponentPropsWithRef<"nav">, "defaultValue">,
    VariantProps<typeof gooeyNavVariants> {
  /** The items. A string is a button, `href` makes a link, `icon` renders before the label. */
  items: GooeyNavItem[];
  /** Index of the selected item, when controlled. */
  value?: number;
  /** Index selected at first, when uncontrolled. */
  defaultValue?: number;
  /** Called with the index of a newly selected item. */
  onValueChange?: (index: number) => void;
  /** Gap in px that opens on each side of the selected item. Defaults by size: 14, 16, 20, 24. */
  separation?: number;
  /** Radius in px of the bar's ends and of every open gap. Defaults by size: 8, 10, 12, 14. */
  radius?: number;
  /** Classes for the selected tile. */
  activeClassName?: string;
  /** Classes for every tile, before `activeClassName`. */
  itemClassName?: string;
}

/** A segmented nav bar whose selected item lifts out of the group while the rest close up behind it. */
export function GooeyNav({
  className,
  items,
  value,
  defaultValue = 0,
  onValueChange,
  size,
  separation,
  radius,
  activeClassName = "bg-primary text-primary-foreground",
  itemClassName,
  ...props
}: GooeyNavProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const active = value ?? uncontrolled;
  const shape = SHAPE[size ?? "md"];
  const gap = separation ?? shape.separation;
  const corner = radius ?? shape.radius;
  const reduced = useReducedMotion() ?? false;
  // Starts where the selection is, so nothing moves on first paint.
  const position = useSpring(active, SPRING);

  useEffect(() => {
    if (reduced) position.jump(active);
    else position.set(active);
  }, [active, reduced, position]);

  function select(index: number, event: MouseEvent<HTMLElement>) {
    const item = items[index];
    if (typeof item === "object" && item.disabled) {
      event.preventDefault();
      return;
    }
    if (index === active) return;
    if (value === undefined) setUncontrolled(index);
    onValueChange?.(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    const list = event.currentTarget.closest('[data-slot="gooey-nav-list"]');
    if (!list || !keys.includes(event.key)) return;
    const targets = [
      ...list.querySelectorAll<HTMLElement>(
        '[data-slot="gooey-nav-item"]:not(:disabled):not([aria-disabled="true"])',
      ),
    ];
    const at = targets.indexOf(event.currentTarget);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? targets.length - 1
          : (at + step + targets.length) % targets.length;
    event.preventDefault();
    targets[next]?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <nav
        data-slot="gooey-nav"
        className={cn("inline-flex max-w-full overflow-x-auto overscroll-x-contain", className)}
        {...props}
      >
        <ul
          data-slot="gooey-nav-list"
          className="flex w-max py-1"
          style={{ paddingInline: gap }}
        >
          {items.map((item, index) => (
            <GooeyNavTile
              key={index}
              item={item}
              index={index}
              count={items.length}
              position={position}
              separation={gap}
              radius={corner}
              active={index === active}
              className={cn(
                gooeyNavVariants({ size }),
                index !== active && INACTIVE,
                itemClassName,
                index === active && activeClassName,
              )}
              onSelect={select}
              onKeyDown={handleKeyDown}
            />
          ))}
        </ul>
      </nav>
    </MotionConfig>
  );
}

export { gooeyNavVariants };
