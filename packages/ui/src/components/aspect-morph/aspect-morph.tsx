"use client";

// Ported from bencho Aspect ratio (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A picture that reshapes between aspect ratios, driven by a small segmented
 * radiogroup. The frame's width and height are plain CSS transitions on inline
 * values, so there is no animation library and the reduced-motion blanket
 * snaps it straight to the chosen shape.
 *
 * Every shape is fitted by area rather than by bounding box — A = size² · 0.75,
 * w = √(A·r), h = √(A/r), each clamped to `size` — so a square does not look
 * bigger than the landscape and portrait crops beside it.
 */

export interface AspectMorphRatio {
  value: string;
  /** Accessible name of the option, e.g. "Landscape, 4 by 3". */
  label: string;
  /** Width divided by height. */
  ratio: number;
  /** Replaces the drawn outline icon. Decorative. */
  icon?: ReactNode;
}

export const defaultAspectMorphRatios: AspectMorphRatio[] = [
  { value: "4:3", label: "Landscape, 4 by 3", ratio: 4 / 3 },
  { value: "1:1", label: "Square, 1 by 1", ratio: 1 },
  { value: "3:4", label: "Portrait, 3 by 4", ratio: 3 / 4 },
];

/** The option buttons of the segmented control. */
const aspectMorphVariants = cva(
  cn(
    "relative z-1 grid h-8 place-items-center rounded-full text-muted-foreground",
    "transition-[color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "hover:text-foreground active:scale-[0.92] aria-checked:text-foreground",
    "disabled:pointer-events-none disabled:opacity-55",
    focusRing,
  ),
);

/** Width and height of a `ratio` shape with the same area as ¾ of a `box`-sided square. */
export function fitAspect(ratio: number, box: number): { width: number; height: number } {
  const area = box * box * 0.75;
  const safe = ratio > 0 && Number.isFinite(ratio) ? ratio : 1;
  const width = Math.min(Math.sqrt(area * safe), box);
  const height = Math.min(Math.sqrt(area / safe), box);
  return { width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100 };
}

function RatioIcon({ ratio }: { ratio: number }) {
  const { width, height } = fitAspect(ratio, 15);
  return (
    <svg viewBox="0 0 18 18" className="size-4.5" fill="none" aria-hidden="true">
      <rect
        x={(18 - width) / 2}
        y={(18 - height) / 2}
        width={width}
        height={height}
        rx={2}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/** Whether the element sits in right-to-left text. */
function isRtl(element: HTMLElement): boolean {
  return (
    element.closest("[dir]")?.getAttribute("dir") === "rtl" ||
    getComputedStyle(element).direction === "rtl"
  );
}

export interface AspectMorphProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange"
> {
  /** The shapes to choose between. */
  ratios?: AspectMorphRatio[];
  /** Controlled selected ratio value. */
  value?: string;
  /** Initial value when uncontrolled. Defaults to the first ratio. */
  defaultValue?: string;
  /** Called with the newly selected ratio value. */
  onValueChange?: (value: string) => void;
  /** Picture URL, drawn as a cover-cropped background. */
  src?: string;
  /** Names the picture (role="img"). Without it the picture is decorative. */
  alt?: string;
  /** Speed, 0–100: 0 morphs over 832ms, 50 over 520ms, 100 over 208ms. */
  morph?: number;
  /** Corner radius of the picture in px. */
  corner?: number;
  /** Side of the square box the picture is fitted into, in px. */
  size?: number;
  /** Accessible name of the radiogroup. */
  label?: string;
  /** Disables the ratio picker. */
  disabled?: boolean;
  /** Custom picture content (an <img>, <video>, canvas…); cropped to the frame. */
  children?: ReactNode;
}

/** A picture that morphs between aspect ratios, picked from a segmented radiogroup. */
export function AspectMorph({
  className,
  style,
  ratios = defaultAspectMorphRatios,
  value: valueProp,
  defaultValue,
  onValueChange,
  src,
  alt,
  morph = 50,
  corner = 18,
  size = 276,
  label = "Aspect ratio",
  disabled = false,
  children,
  ...props
}: AspectMorphProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? ratios[0]?.value);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  const found = ratios.findIndex((option) => option.value === value);
  const index = Math.max(found, 0);
  const current = ratios[index];
  const frame = fitAspect(current?.ratio ?? 1, size);
  const ms = 832 - 6.24 * Math.min(Math.max(morph, 0), 100);

  function select(next: number) {
    const option = ratios[next];
    if (!option || option.value === value) return;
    if (valueProp === undefined) setUncontrolled(option.value);
    onValueChange?.(option.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, at: number) {
    const last = ratios.length - 1;
    const rtl = isRtl(event.currentTarget);
    const keys: Record<string, number> = {
      ArrowDown: at + 1,
      ArrowUp: at - 1,
      ArrowRight: rtl ? at - 1 : at + 1,
      ArrowLeft: rtl ? at + 1 : at - 1,
      Home: 0,
      End: last,
    };
    let next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    if (next > last) next = 0;
    if (next < 0) next = last;
    options.current[next]?.focus();
    select(next);
  }

  const frameStyle: CSSProperties = {
    width: frame.width,
    height: frame.height,
    borderRadius: corner,
    transitionDuration: `calc(${String(Math.round(ms))}ms * var(--motion-scale))`,
    backgroundImage: src ? `url(${JSON.stringify(src)})` : undefined,
  };

  const thumbStyle: CSSProperties = {
    width: `calc((100% - 0.25rem) / ${String(Math.max(ratios.length, 1))})`,
    translate: `calc(var(--aspect-morph-dir) * ${String(index * 100)}%) 0`,
    transitionDuration: `calc(${String(Math.round(ms * 0.55))}ms * var(--motion-scale))`,
  };

  return (
    <div
      data-slot="aspect-morph"
      data-value={current?.value}
      className={cn(
        "inline-flex max-w-full flex-col items-center gap-3 [--aspect-morph-dir:1] rtl:[--aspect-morph-dir:-1]",
        className,
      )}
      style={{ width: size, ...style }}
      {...props}
    >
      <div
        data-slot="aspect-morph-stage"
        className="grid w-full place-items-center"
        style={{ height: size }}
      >
        <div
          data-slot="aspect-morph-frame"
          role={src && alt ? "img" : undefined}
          aria-label={src && alt ? alt : undefined}
          aria-hidden={src && !alt ? true : undefined}
          className={cn(
            "max-w-full overflow-hidden bg-muted bg-cover bg-center",
            "transition-[width,height,border-radius] ease-[var(--ease-out-quint)]",
            "[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover",
          )}
          style={frameStyle}
        >
          {src ? null : children}
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
        data-slot="aspect-morph-picker"
        className="relative grid rounded-full bg-foreground/6 p-0.5"
        style={{ gridTemplateColumns: `repeat(${String(ratios.length)}, 2.5rem)` }}
      >
        <span
          aria-hidden="true"
          data-slot="aspect-morph-thumb"
          className={cn(
            "absolute start-0.5 top-0.5 bottom-0.5 rounded-full bg-card",
            "shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_10%,transparent)]",
            "transition-[translate] ease-[var(--ease-out-quint)]",
            found < 0 && "opacity-0",
          )}
          style={thumbStyle}
        />
        {ratios.map((option, at) => {
          const checked = at === found;
          const tabbable = found >= 0 ? checked : at === 0;
          return (
            <button
              key={option.value}
              ref={(node) => {
                options.current[at] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              tabIndex={tabbable ? 0 : -1}
              disabled={disabled}
              data-slot="aspect-morph-option"
              data-state={checked ? "checked" : "unchecked"}
              className={aspectMorphVariants()}
              onClick={() => {
                select(at);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, at);
              }}
            >
              {option.icon ?? <RatioIcon ratio={option.ratio} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { aspectMorphVariants };
