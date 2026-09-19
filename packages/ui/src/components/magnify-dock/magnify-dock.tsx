"use client";

// Ported from bencho Magnifying dock (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Direction } from "radix-ui";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A macOS-style dock: the item under the pointer grows and lifts, its
 * neighbours rise less, and a small label pill appears above it.
 *
 * Magnification is discrete per item, not continuous in x: the lens item is
 * distance 0, its neighbours 1, 2, … and each takes a share of the effect from
 * a cos² falloff. Nothing carries velocity, so this is plain CSS: each glyph
 * transitions its transform on a springy cubic-bezier, and the global
 * reduced-motion rule (via --motion-scale) turns every move into a jump.
 *
 * The lens follows the hovered item *or* the keyboard-focused one, so arrow
 * keys give the same feedback a pointer does. The dock is a toolbar with a
 * roving tab stop; the active item is the current page (aria-current).
 */

const SPRING = "cubic-bezier(.24,1.2,.32,1)";
const TIP_SPRING = "cubic-bezier(.28,1.3,.36,1)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Share of the effect at distance `d` from the lens: cos²(π·d / 2(reach+1)). */
export function magnifyFalloff(distance: number, reach: number) {
  const r = Math.round(clamp(reach, 0, 4));
  if (distance > r) return 0;
  return Math.cos((Math.PI * distance) / (2 * (r + 1))) ** 2;
}

export interface MagnifyDockItem {
  value: string;
  /** Names the item and fills its tooltip. */
  label: string;
  /** Decorative glyph, hidden from assistive technology. */
  icon: ReactNode;
  /** Renders a link instead of a button. */
  href?: string;
  disabled?: boolean;
}

const magnifyDockVariants = cva(
  "relative inline-flex items-end gap-2.5 rounded-[1.625rem] px-4 py-3 shadow-sm",
  {
    variants: {
      /** Dock tone. `light` is the card surface; `dark` inverts it. */
      fill: {
        light: "bg-card text-card-foreground",
        dark: "bg-foreground text-background",
      },
    },
    defaultVariants: { fill: "light" },
  },
);

export interface MagnifyDockProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "children">,
    VariantProps<typeof magnifyDockVariants> {
  items: MagnifyDockItem[];
  /** The active item (controlled). */
  value?: string;
  /** The active item at first (uncontrolled). */
  defaultValue?: string;
  /** Called when an item is activated. */
  onValueChange?: (value: string) => void;
  /** Scale of the lens item, 1–2. */
  magnify?: number;
  /** How far the lens item rises, 0–22 px. */
  lift?: number;
  /** How many neighbours on each side are affected, 0–4. */
  reach?: number;
  /** 1px inset hairline around the dock. */
  stroke?: boolean;
}

/** A dock of icon buttons or links that magnify on hover and keyboard focus. */
export function MagnifyDock({
  className,
  items,
  value,
  defaultValue,
  onValueChange,
  magnify = 1.32,
  lift = 8,
  reach = 2,
  fill,
  stroke = false,
  onKeyDown,
  onPointerLeave,
  onBlur,
  onPointerDown,
  ...props
}: MagnifyDockProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const active = value ?? uncontrolled;
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [stop, setStop] = useState<number | null>(null);
  const pressing = useRef(false);
  const direction = Direction.useDirection();
  const scale = clamp(magnify, 1, 2);
  const rise = clamp(lift, 0, 22);
  const dark = fill === "dark";

  const enabled = items.flatMap((item, index) => (item.disabled ? [] : [index]));
  const activeIndex = items.findIndex((item) => item.value === active && !item.disabled);
  // The roving tab stop: last focused, else the active item, else the first enabled.
  const tabStop =
    stop !== null && enabled.includes(stop)
      ? stop
      : activeIndex >= 0
        ? activeIndex
        : enabled[0];
  const lens = hovered ?? focused;

  function select(item: MagnifyDockItem) {
    if (item.disabled) return;
    if (value === undefined) setUncontrolled(item.value);
    onValueChange?.(item.value);
  }

  function focusItem(root: HTMLElement, index: number) {
    root.querySelector<HTMLElement>(`[data-index="${String(index)}"]`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || enabled.length === 0) return;
    const from = Number((event.target as HTMLElement).dataset.index);
    if (Number.isNaN(from)) return;
    const rtl =
      direction === "rtl" ||
      event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    const position = enabled.indexOf(from);
    const last = enabled.length - 1;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let to: number | undefined;
    if (event.key === forward) to = enabled[position >= last ? 0 : position + 1];
    else if (event.key === back) to = enabled[position <= 0 ? last : position - 1];
    else if (event.key === "Home") to = enabled[0];
    else if (event.key === "End") to = enabled[last];
    if (to === undefined) return;
    event.preventDefault();
    focusItem(event.currentTarget, to);
  }

  function handleFocus(index: number) {
    setStop(index);
    // Pointer focus is already under the lens (or leaving it); only keyboard
    // and programmatic focus move the lens, like :focus-visible.
    setFocused(pressing.current ? null : index);
  }

  return (
    <div
      role="toolbar"
      aria-label={props["aria-labelledby"] ? undefined : "Dock"}
      aria-orientation="horizontal"
      data-slot="magnify-dock"
      className={cn(
        magnifyDockVariants({ fill }),
        stroke && "ring-1 ring-border ring-inset",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        pressing.current = true;
        // Focus lands between pointerdown and the next task.
        setTimeout(() => {
          pressing.current = false;
        }, 0);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(null);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null);
      }}
      {...props}
    >
      {items.map((item, index) => {
        const distance = lens === null ? Infinity : Math.abs(index - lens);
        const f = magnifyFalloff(distance, reach);
        const y = Math.round(rise * f * 100) / 100;
        const s = Math.round((1 + (scale - 1) * f) * 1000) / 1000;
        const isActive = index === activeIndex;
        const opacity = distance === 0 || isActive ? 1 : distance === 1 && f > 0 ? 0.66 : 0.42;
        const shared = {
          "data-index": index,
          "data-slot": "magnify-dock-item",
          "data-lens": distance === 0 ? "" : undefined,
          "data-near": distance === 1 && f > 0 ? "" : undefined,
          "aria-label": item.label,
          "aria-current": isActive ? ("page" as const) : undefined,
          tabIndex: item.disabled ? -1 : index === tabStop ? 0 : -1,
          className: cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-[0.625rem]",
            focusRing,
            "disabled:pointer-events-none aria-disabled:pointer-events-none",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
          ),
          style: {
            opacity: item.disabled ? 0.2 : opacity,
            transition: `opacity calc(180ms * var(--motion-scale)) ease`,
          },
          onPointerEnter: () => setHovered(index),
          onFocus: () => handleFocus(index),
        };
        const content = (
          <>
            <span
              aria-hidden="true"
              data-slot="magnify-dock-glyph"
              className="flex origin-bottom"
              style={{
                transform: `translateY(${String(-y)}px) scale(${String(s)})`,
                transition: `transform calc(320ms * var(--motion-scale)) ${SPRING}`,
              }}
            >
              {item.icon}
            </span>
            <span
              aria-hidden="true"
              data-slot="magnify-dock-dot"
              className="absolute inset-x-0 bottom-[3px] mx-auto size-[3px] rounded-full bg-current"
              style={{
                opacity: isActive ? 0.55 : 0,
                scale: isActive ? 1 : 0.4,
                transition: `opacity calc(360ms * var(--motion-scale)) ${SPRING}, scale calc(360ms * var(--motion-scale)) ${SPRING}`,
              }}
            />
            <span
              aria-hidden="true"
              data-slot="magnify-dock-tip"
              data-on={distance === 0 ? "" : undefined}
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-full mx-auto mb-2 w-max rounded-full px-[9px] py-[5px]",
                "font-mono text-[0.5rem] leading-none tracking-[0.06em] whitespace-nowrap uppercase",
                dark ? "bg-background text-foreground" : "bg-foreground text-background",
              )}
              style={{
                opacity: distance === 0 ? 1 : 0,
                translate: `0 ${distance === 0 ? "0" : "4px"}`,
                transition: `opacity calc(180ms * var(--motion-scale)) ease, translate calc(260ms * var(--motion-scale)) ${TIP_SPRING}`,
              }}
            >
              {item.label}
            </span>
          </>
        );

        if (item.href) {
          return (
            <a
              key={item.value}
              {...shared}
              href={item.disabled ? undefined : item.href}
              role={item.disabled ? "link" : undefined}
              aria-disabled={item.disabled || undefined}
              onClick={(event) => {
                if (item.disabled) {
                  event.preventDefault();
                  return;
                }
                select(item);
              }}
            >
              {content}
            </a>
          );
        }
        return (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            {...shared}
            onClick={() => select(item)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export { magnifyDockVariants };
