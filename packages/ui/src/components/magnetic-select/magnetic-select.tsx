"use client";

// Ported from bencho Magnetic select (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { springEasing } from "./magnetic-select-spring";

/*
 * A radiogroup of round chips packed in a honeycomb. Choosing one grows it and
 * shoves the rest radially away, a little smaller and tilted, like marbles
 * pushed apart by a magnet.
 *
 * The source drives this with a JavaScript spring. Nothing here carries
 * gesture velocity, so it is a CSS transition instead: the spring becomes a
 * `linear()` easing (see magnetic-select-spring.ts), durations run through
 * --motion-scale, and the reduced-motion blanket settles every chip at once.
 *
 * Geometry is laid out from the inline start, so the honeycomb mirrors in RTL
 * on its own. Transforms are physical, so every horizontal offset and tilt is
 * multiplied by --magnetic-select-dir, which the `rtl:` variant flips to -1.
 */

const PREFIX = "dowel-magnetic-select";

const STYLES = `
@supports (transition-timing-function: linear(0, 1)) {
  [data-slot="magnetic-select-item"], [data-slot="magnetic-select-body"] {
    transition-timing-function: var(--magnetic-select-spring);
  }
}
`;

/** The skin: the visible disc inside each chip. */
const magneticSelectVariants = cva(
  cn(
    "relative block size-full overflow-hidden rounded-full bg-card",
    "translate-x-[var(--lx,0px)] translate-y-[var(--ly,0px)]",
    "transition-[translate,background-color] duration-[calc(260ms*var(--motion-scale))] ease-[var(--ease-out-quint)]",
  ),
  {
    variants: {
      /** An inset hairline ring on every skin — the workbench "Stroke" switch. */
      stroke: {
        true: "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-border after:content-[''] after:ring-inset",
        false: "",
      },
      selected: {
        true: "",
        false:
          "group-hover/chip:bg-[color-mix(in_oklab,var(--color-foreground)_11%,var(--color-card))]",
      },
    },
    defaultVariants: {
      stroke: false,
      selected: false,
    },
  },
);

export interface MagneticSelectOption {
  value: string;
  /** Accessible name of the chip. Chips have no visible text of their own. */
  label: string;
  /** Image shown on the chip while it is selected (object-cover). Decorative. */
  image?: string;
  /** Content drawn on the chip in every state — an icon, initials, a swatch. */
  content?: ReactNode;
}

export interface MagneticSelectProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    Omit<VariantProps<typeof magneticSelectVariants>, "selected"> {
  /** Up to 19 options: a centre, a ring of six and a ring of twelve. Three form a triangle. */
  options: MagneticSelectOption[];
  /** Controlled selected value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void;
  /** Magnet strength, 0–100: selected scale, push distance and tilt. */
  pull?: number;
  /** Overshoot, 0–100. 0 settles with no overshoot. */
  bounce?: number;
  /** Spring softness, 0–100. Above 50 the chips take longer to settle. */
  give?: number;
  /** Chip diameter in px. */
  chipSize?: number;
  /** Renders a hidden input so the value submits with a form. */
  name?: string;
  /** Disables every chip. */
  disabled?: boolean;
}

type Cell = { q: number; r: number };

const AXIAL: Cell[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Hex cells for `count` chips in reading order: a spiral from the centre, or a triangle for three. */
function magneticSelectCells(count: number): Cell[] {
  let cells: Cell[];
  if (count === 3) {
    cells = [
      { q: 0, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
  } else {
    cells = [{ q: 0, r: 0 }];
    for (let ring = 1; cells.length < count; ring += 1) {
      let cell = { q: AXIAL[4]!.q * ring, r: AXIAL[4]!.r * ring };
      for (const step of AXIAL) {
        for (let i = 0; i < ring; i += 1) {
          cells.push(cell);
          cell = { q: cell.q + step.q, r: cell.r + step.r };
        }
      }
    }
    cells = cells.slice(0, count);
  }
  return cells.sort((a, b) => a.r - b.r || a.q + a.r / 2 - (b.q + b.r / 2));
}

function hexDistance(a: Cell, b: Cell): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const unit = (value: number) => Math.min(Math.max(value, 0), 100) / 100;
const round = (value: number) => Math.round(value * 100) / 100;

type Pose = { x: number; y: number; rotate: number; scale: number };

/** Where each chip rests when `selected` is chosen, in px along the inline axis. */
function poses(cells: Cell[], selected: number, pull: number, pitch: number): Pose[] {
  const p = unit(pull);
  const push = 6.5 + 13.5 * p;
  const tilt = 5 * p;
  const row = (pitch * Math.sqrt(3)) / 2;
  const at = (cell: Cell) => ({ x: pitch * (cell.q + cell.r / 2), y: row * cell.r });
  const origin = selected >= 0 ? at(cells[selected]!) : undefined;
  return cells.map((cell, index) => {
    if (!origin) return { x: 0, y: 0, rotate: 0, scale: 1 };
    if (index === selected) return { x: 0, y: 0, rotate: 0, scale: round(1.16 + 0.22 * p) };
    const hops = hexDistance(cell, cells[selected]!);
    const here = at(cell);
    const dx = here.x - origin.x;
    const dy = here.y - origin.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const falloff = hops === 1 ? 1 : 0.9;
    return {
      x: round(ux * push * falloff),
      y: round((dy / length) * push * falloff),
      rotate: round(ux * tilt * (hops === 1 ? 1 : 0.7)),
      scale: round(1 - (hops === 1 ? 0.05 + 0.075 * p : 0.04 + 0.055 * p)),
    };
  });
}

/** Whether the element sits in right-to-left text. */
function isRtl(element: HTMLElement): boolean {
  return (
    element.closest("[dir]")?.getAttribute("dir") === "rtl" ||
    getComputedStyle(element).direction === "rtl"
  );
}

/** A honeycomb radiogroup whose chosen chip magnetically pushes the rest apart. */
export function MagneticSelect({
  ref,
  className,
  style,
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  pull = 55,
  bounce = 55,
  give = 50,
  chipSize = 44,
  stroke = false,
  name,
  disabled = false,
  onPointerMove,
  onPointerLeave,
  ...props
}: MagneticSelectProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const root = useRef<HTMLDivElement | null>(null);

  const items = options.slice(0, 19);
  const cells = magneticSelectCells(items.length);
  const selected = items.findIndex((option) => option.value === value);
  const pitch = chipSize + 1;
  const layout = poses(cells, selected, pull, pitch);

  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || ariaLabel || ariaLabelledBy) return;
    console.warn(
      "[MagneticSelect] The radiogroup has no name. Pass aria-label or aria-labelledby.",
    );
  }, [ariaLabel, ariaLabelledBy]);

  // Hex centres, shifted so the top-start chip sits one margin in.
  const row = (pitch * Math.sqrt(3)) / 2;
  const centres = cells.map((cell) => ({ x: pitch * (cell.q + cell.r / 2), y: row * cell.r }));
  const margin = (chipSize * 26) / 44;
  const minX = Math.min(...centres.map((c) => c.x), 0);
  const minY = Math.min(...centres.map((c) => c.y), 0);
  const width = Math.max(...centres.map((c) => c.x), 0) - minX + chipSize + margin * 2;
  const height = Math.max(...centres.map((c) => c.y), 0) - minY + chipSize + margin * 2;

  // Give ≤ 50 settles in ~290ms; beyond that it loosens to ~800ms with a touch more wobble.
  const looseness = Math.max(give - 50, 0) / 50;
  const duration = Math.round(290 + 510 * Math.min(looseness, 1));
  const easing = springEasing(unit(bounce) + 0.15 * Math.min(looseness, 1));

  function select(index: number) {
    const option = items[index];
    if (!option || option.value === value) return;
    if (valueProp === undefined) setUncontrolled(option.value);
    onValueChange?.(option.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const rtl = isRtl(event.currentTarget);
    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = index + 1;
        break;
      case "ArrowUp":
        next = index - 1;
        break;
      case "ArrowRight":
        next = rtl ? index - 1 : index + 1;
        break;
      case "ArrowLeft":
        next = rtl ? index + 1 : index - 1;
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
    if (next > last) next = 0;
    if (next < 0) next = last;
    chips.current[next]?.focus();
    select(next);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    const element = root.current;
    if (!element || event.pointerType !== "mouse") return;
    const box = element.getBoundingClientRect();
    const reach = (value: number, size: number) =>
      `${String(round(Math.max(-1, Math.min(1, value / (size / 2 || 1))) * 2.5))}px`;
    element.style.setProperty(
      "--lx",
      reach(event.clientX - box.left - box.width / 2, box.width),
    );
    element.style.setProperty(
      "--ly",
      reach(event.clientY - box.top - box.height / 2, box.height),
    );
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    root.current?.style.removeProperty("--lx");
    root.current?.style.removeProperty("--ly");
  }

  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    width: `${String(round(width))}px`,
    height: `${String(round(height))}px`,
    "--magnetic-select-spring": easing,
    ...style,
  };

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        ref={(node) => {
          root.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="radiogroup"
        aria-disabled={disabled || undefined}
        data-slot="magnetic-select"
        className={cn(
          "relative shrink-0 [--magnetic-select-dir:1] rtl:[--magnetic-select-dir:-1]",
          className,
        )}
        style={rootStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        {items.map((option, index) => {
          const pose = layout[index]!;
          const checked = index === selected;
          const centre = centres[index]!;
          const tabbable = selected >= 0 ? checked : index === 0;
          const itemStyle: CSSProperties = {
            width: chipSize,
            height: chipSize,
            insetInlineStart: round(centre.x - minX + margin),
            top: round(centre.y - minY + margin),
            translate: `calc(var(--magnetic-select-dir) * ${String(pose.x)}px) ${String(pose.y)}px`,
            rotate: `calc(var(--magnetic-select-dir) * ${String(pose.rotate)}deg)`,
            scale: `1 ${String(pose.scale)}`,
            transitionDuration: `calc(${String(duration)}ms * var(--motion-scale))`,
            zIndex: checked ? 1 : undefined,
          };
          return (
            <button
              key={option.value}
              ref={(node) => {
                chips.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              tabIndex={tabbable ? 0 : -1}
              disabled={disabled}
              data-slot="magnetic-select-item"
              data-state={checked ? "checked" : "unchecked"}
              className={cn(
                "group/chip absolute rounded-full",
                "transition-[translate,rotate,scale] ease-[var(--ease-overshoot)]",
                "disabled:pointer-events-none disabled:opacity-55",
                focusRing,
              )}
              style={itemStyle}
              onClick={() => {
                select(index);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index);
              }}
            >
              <span
                data-slot="magnetic-select-body"
                aria-hidden="true"
                className="block size-full transition-[scale] ease-[var(--ease-overshoot)]"
                style={{
                  scale: `${String(pose.scale)} 1`,
                  transitionDuration: `calc(${String(Math.round(duration * 0.8))}ms * var(--motion-scale))`,
                }}
              >
                <span
                  data-slot="magnetic-select-skin"
                  className={magneticSelectVariants({ stroke, selected: checked })}
                >
                  <span
                    data-slot="magnetic-select-fill"
                    className={cn(
                      "absolute inset-0 transition-opacity duration-[calc(240ms*var(--motion-scale))]",
                      option.image
                        ? "bg-cover bg-center"
                        : "bg-[radial-gradient(circle_at_30%_25%,var(--color-info),var(--color-primary)_55%,var(--color-success))]",
                      checked ? "opacity-100" : "opacity-0",
                    )}
                    style={
                      option.image
                        ? { backgroundImage: `url(${JSON.stringify(option.image)})` }
                        : undefined
                    }
                  />
                  {option.content != null ? (
                    <span className="absolute inset-0 grid place-items-center">
                      {option.content}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {name !== undefined ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </>
  );
}

export { magneticSelectVariants };
