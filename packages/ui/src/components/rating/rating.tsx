"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A star rating input.
 *
 * Semantics are a radio group: one `role="radio"` button per selectable value
 * — per star, or per half star with `allowHalf` — with a roving tab stop,
 * arrow keys that move and select (Right/Down up, Left/Up down, mirrored in
 * right-to-left layouts, wrapping at the ends as native radios do) and
 * Home/End. With half stars each star holds two radios, one over each half,
 * so where the pointer sits inside a star is which half it previews: the hit
 * zones are laid out with logical `start`/`end`, and nothing is measured.
 *
 * Each star is drawn twice, an outline and a solid copy clipped to how much of
 * the star is filled. Filled and empty therefore differ in shape as well as
 * colour. The clip is a `clip-path` inset, flipped for right-to-left, so a
 * half star fills from the reading start.
 *
 * Motion is CSS. Hovering or focusing previews the value: the stars fill up to
 * the pointer and the star under it pops on an overshooting transition.
 * Choosing a value makes that star burst — a keyed pop and a ring that expands
 * and fades — once per selection, never on first paint. The pop animates
 * `transform` while the hover state uses `scale`, so the two compose and the
 * burst ends exactly where the hover left the star. The reduced-motion blanket
 * stops both.
 *
 * `readOnly` drops the radios and renders a `role="img"` whose name reads the
 * value ("3.5 out of 5"); it can show any fraction, not just halves.
 */

const PREFIX = "dowel-rating";

const STYLES = `
@keyframes ${PREFIX}-pop{0%{transform:scale(1)}30%{transform:scale(1.34)}62%{transform:scale(.94)}100%{transform:scale(1)}}
@keyframes ${PREFIX}-ring{from{transform:scale(.45);opacity:.85}to{transform:scale(1.85);opacity:0}}
[data-slot=rating-glyph][data-burst]{animation:${PREFIX}-pop calc(480ms * var(--motion-scale,1)) var(--ease-out-quint)}
[data-slot=rating-burst]{animation:${PREFIX}-ring calc(560ms * var(--motion-scale,1)) var(--ease-out-quint) forwards}
`;

const ratingVariants = cva("group/rating inline-flex items-center", {
  variants: {
    /** Star size. The hit zones scale with it. */
    size: {
      sm: "gap-0.5 [--rating-size:1rem]",
      md: "gap-1 [--rating-size:1.5rem]",
      lg: "gap-1.5 [--rating-size:2rem]",
    },
  },
  defaultVariants: { size: "md" },
});

export interface RatingProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children">,
    VariantProps<typeof ratingVariants> {
  /** Controlled value; 0 is no rating. */
  value?: number;
  /** Initial value when uncontrolled. Default 0. */
  defaultValue?: number;
  /** Called when a star (or half star) is chosen by pointer or keyboard. */
  onValueChange?: (value: number) => void;
  /** How many stars. Default 5. */
  max?: number;
  /** Lets each star be chosen by half, by where the pointer sits inside it. */
  allowHalf?: boolean;
  /** Shows the value as an image named "3.5 out of 5"; nothing can be chosen. */
  readOnly?: boolean;
  disabled?: boolean;
  /** A glyph to use instead of the star, drawn as an outline and a solid fill. */
  icon?: ReactNode;
  /** Accessible name of each option. Default "1 star", "2.5 stars". */
  getLabel?: (value: number, max: number) => string;
  /** Submits the value with a form under this name. */
  name?: string;
}

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);
const defaultGetLabel = (value: number) => `${String(value)} ${value === 1 ? "star" : "stars"}`;

function isRtl(element: HTMLElement): boolean {
  return (
    element.closest("[dir]")?.getAttribute("dir") === "rtl" ||
    getComputedStyle(element).direction === "rtl"
  );
}

function Star() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5l2.65 6.36 6.86.55-5.23 4.48 1.6 6.7L12 17l-5.88 3.59 1.6-6.7-5.23-4.48 6.86-.55z" />
    </svg>
  );
}

/** A star rating: a radio group of stars, or half stars, with a springy preview. */
export function Rating({
  className,
  size,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max: maxProp = 5,
  allowHalf = false,
  readOnly = false,
  disabled = false,
  icon,
  getLabel = defaultGetLabel,
  name,
  onPointerLeave,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RatingProps) {
  const max = Math.max(1, Math.round(maxProp));
  const step = allowHalf ? 0.5 : 1;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = clamp(valueProp ?? uncontrolled, 0, max);
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [burst, setBurst] = useState<{ star: number; key: number } | null>(null);

  const options: number[] = [];
  for (let option = step; option <= max; option += step) options.push(option);
  const tabStop = options.includes(value) ? value : options[0];

  const interactive = !readOnly && !disabled;
  const preview = interactive ? (hover ?? focused) : null;
  const shown = preview ?? value;
  const glyph = icon ?? <Star />;

  function select(next: number) {
    if (!interactive) return;
    setBurst((current) => ({ star: Math.ceil(next), key: (current?.key ?? 0) + 1 }));
    if (next === value) return;
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const forward = isRtl(event.currentTarget) ? -1 : 1;
    const moves: Record<string, number> = {
      ArrowDown: step,
      ArrowUp: -step,
      ArrowRight: step * forward,
      ArrowLeft: -step * forward,
    };
    let next: number;
    if (event.key === "Home") next = step;
    else if (event.key === "End") next = max;
    else if (event.key in moves) next = round(current + (moves[event.key] ?? 0));
    else return;
    event.preventDefault();
    // Radios wrap at the ends, as a native radio group does.
    if (next > max) next = step;
    if (next < step) next = max;
    event.currentTarget
      .closest("[data-slot=rating]")
      ?.querySelector<HTMLElement>(`[data-slot=rating-radio][data-value="${String(next)}"]`)
      ?.focus();
    select(next);
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    setHover(null);
  }

  const stars = Array.from({ length: max }, (_, index) => {
    const star = index + 1;
    const fill = clamp(shown - index, 0, 1);
    const previewing = preview !== null && star <= Math.ceil(preview);
    const active = preview !== null && star === Math.ceil(preview);
    const bursting = burst?.star === star;
    const clipStyle = {
      "--rating-clip": `${String(round((1 - fill) * 100))}%`,
    } as CSSProperties;
    const starOptions = options.filter((option) => option > index && option <= star);

    return (
      <span
        key={star}
        data-slot="rating-item"
        data-state={fill === 1 ? "full" : fill > 0 ? "partial" : "empty"}
        className={cn(
          "relative grid size-[var(--rating-size)] shrink-0 place-items-center rounded-sm",
          "has-focus-visible:ring-2 has-focus-visible:ring-ring/55 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background",
        )}
      >
        <span
          key={bursting ? burst.key : 0}
          aria-hidden="true"
          data-slot="rating-glyph"
          data-preview={previewing ? "" : undefined}
          data-active={active ? "" : undefined}
          data-burst={bursting ? "" : undefined}
          className={cn(
            "pointer-events-none relative col-start-1 row-start-1 size-full",
            "transition-[scale] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
            "data-[active]:scale-[1.2] data-[preview]:scale-[1.06]",
          )}
        >
          <span
            data-slot="rating-track"
            className="absolute inset-0 text-muted-foreground/55 [&_svg]:size-full"
          >
            {glyph}
          </span>
          <span
            data-slot="rating-fill"
            className={cn(
              "absolute inset-0 text-warning [&_svg]:size-full [&_svg]:fill-current",
              "[clip-path:inset(0_var(--rating-clip)_0_0)] rtl:[clip-path:inset(0_0_0_var(--rating-clip))]",
              "transition-[clip-path] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
            )}
            style={clipStyle}
          >
            {glyph}
          </span>
          {bursting ? (
            <span
              data-slot="rating-burst"
              className="absolute -inset-1/4 rounded-full border-2 border-warning opacity-0"
            />
          ) : null}
        </span>
        {readOnly
          ? null
          : starOptions.map((option) => {
              const half = starOptions.length > 1;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === value}
                  aria-label={getLabel(option, max)}
                  tabIndex={option === tabStop ? 0 : -1}
                  disabled={disabled}
                  data-slot="rating-radio"
                  data-value={option}
                  className={cn(
                    "absolute inset-y-0 cursor-pointer outline-none focus-visible:outline-none disabled:cursor-not-allowed",
                    !half ? "inset-x-0" : option < star ? "start-0 w-1/2" : "end-0 w-1/2",
                  )}
                  onClick={() => {
                    select(option);
                  }}
                  onKeyDown={(event) => {
                    handleKeyDown(event, option);
                  }}
                  onPointerEnter={() => {
                    if (interactive) setHover(option);
                  }}
                  onFocus={() => {
                    setFocused(option);
                  }}
                  onBlur={() => {
                    setFocused(null);
                  }}
                />
              );
            })}
      </span>
    );
  });

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        role={readOnly ? "img" : "radiogroup"}
        aria-label={
          readOnly
            ? (ariaLabel ?? `${String(round(value))} out of ${String(max)}`)
            : (ariaLabel ?? (ariaLabelledBy ? undefined : "Rating"))
        }
        aria-labelledby={ariaLabelledBy}
        aria-disabled={!readOnly && disabled ? true : undefined}
        data-slot="rating"
        data-readonly={readOnly ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-previewing={preview !== null ? "" : undefined}
        className={cn(ratingVariants({ size }), disabled && "opacity-55", className)}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        {stars}
        {name && !readOnly ? (
          <input type="hidden" name={name} value={value} disabled={disabled} />
        ) : null}
      </div>
    </>
  );
}

export { ratingVariants };
