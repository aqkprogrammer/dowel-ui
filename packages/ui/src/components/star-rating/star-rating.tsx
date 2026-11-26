"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * Five stars and a caption, with a cascade.
 *
 * Choosing a rating pops the lit stars one after another — each scales up past
 * full size and settles, a beat behind its neighbour — so the eye runs along
 * the row to where the rating ends. Stars past the value dim rather than
 * vanish, so the scale is always visible. The cascade is a keyframe replayed
 * by remounting the glyphs whenever the value changes (whoever changed it),
 * and never on first paint. Durations and the stagger run through
 * --motion-scale: under reduced motion the stars simply light.
 *
 * Semantics are a Radix radio group: one tab stop, arrow keys move and select
 * (mirrored in right-to-left layouts), each star a radio named "3 stars,
 * Good". The caption repeats what the checked radio already says, so it is
 * aria-hidden. Hovering previews a value without committing it.
 *
 * Lit stars take `--star-rating-accent` (the `accent` prop), defaulting to the
 * foreground.
 */

const PREFIX = "dowel-star-rating";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const ACCENT = "--star-rating-accent";
const DELAY = "--star-rating-delay";

const STYLES = `
@keyframes ${PREFIX}-pop{0%{scale:.55}45%{scale:1.32}70%{scale:.92}100%{scale:1}}
[data-slot=star-rating-glyph][data-animate]{animation:${PREFIX}-pop ${scaled(520)} cubic-bezier(.3,.7,.4,1) var(${DELAY}) both}
`;

const DEFAULT_LABELS = ["Bad", "Meh", "Good", "Great", "Loved it"];

const starRatingVariants = cva("inline-flex flex-col items-center", {
  variants: {
    size: {
      sm: "gap-1.5 [&_[data-slot=star-rating-caption]]:text-[0.625rem] [&_[data-slot=star-rating-item]]:size-5",
      md: "gap-2.5 [&_[data-slot=star-rating-caption]]:text-xs [&_[data-slot=star-rating-item]]:size-7",
      lg: "gap-3 [&_[data-slot=star-rating-caption]]:text-sm [&_[data-slot=star-rating-item]]:size-9",
    },
  },
  defaultVariants: { size: "md" },
});

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-full">
      <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" />
    </svg>
  );
}

export interface StarRatingProps
  extends
    Omit<
      ComponentPropsWithRef<"div">,
      "defaultValue" | "dir" | "onChange" | "children" | "value"
    >,
    VariantProps<typeof starRatingVariants> {
  /** Controlled rating, 0 for none. */
  value?: number;
  /** Initial rating when uncontrolled. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** One word per star, lowest first. Its length sets how many stars there are. */
  labels?: string[];
  /** Show "3.0 · Good" under the stars. */
  showCaption?: boolean;
  /** Caption when nothing is chosen. */
  placeholder?: string;
  /** Colour of the lit stars. Defaults to the foreground. */
  accent?: string;
  /** The group's accessible name. */
  label?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

/** A five-star radio group whose stars pop in sequence when chosen, with a "3.0 · Good" caption. */
export function StarRating({
  className,
  size,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  labels = DEFAULT_LABELS,
  showCaption = true,
  placeholder = "No rating",
  accent,
  label = "Rating",
  name,
  disabled,
  required,
  style,
  "aria-label": ariaLabel,
  ...props
}: StarRatingProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  // A new cascade for every change of value, and none on first paint.
  const [previous, setPrevious] = useState(value);
  const [generation, setGeneration] = useState(0);
  if (previous !== value) {
    setPrevious(value);
    setGeneration((count) => count + 1);
  }

  function handleValueChange(next: string) {
    const number = Number(next);
    if (valueProp === undefined) setUncontrolled(number);
    onValueChange?.(number);
  }

  const word = value > 0 ? labels[value - 1] : undefined;

  return (
    <RadioGroupPrimitive.Root
      data-slot="star-rating"
      aria-label={ariaLabel ?? label}
      value={value > 0 ? String(value) : ""}
      onValueChange={handleValueChange}
      orientation="horizontal"
      loop={false}
      name={name}
      disabled={disabled}
      required={required}
      className={cn(starRatingVariants({ size }), className)}
      style={{ [ACCENT]: accent ?? "var(--color-foreground)", ...style } as CSSProperties}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="flex items-center gap-[0.15em]" onPointerLeave={() => setHovered(null)}>
        {labels.map((text, index) => {
          const star = index + 1;
          const lit = star <= shown;
          return (
            <RadioGroupPrimitive.Item
              key={star}
              value={String(star)}
              data-slot="star-rating-item"
              data-lit={lit || undefined}
              aria-label={`${String(star)} ${star === 1 ? "star" : "stars"}, ${text}`}
              onPointerEnter={() => {
                if (!disabled) setHovered(star);
              }}
              className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center rounded-md p-0.5",
                "text-muted-foreground/35 transition-[color,scale] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                "data-[lit]:text-[var(--star-rating-accent)]",
                "motion-safe:hover:scale-110 motion-safe:active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-55",
                focusRing,
              )}
            >
              <span
                // Remounting replays the cascade.
                key={star <= value ? generation : "rest"}
                data-slot="star-rating-glyph"
                data-animate={generation > 0 && star <= value ? "" : undefined}
                className="block size-full"
                style={{ [DELAY]: scaled(index * 70) } as CSSProperties}
              >
                <Star />
              </span>
            </RadioGroupPrimitive.Item>
          );
        })}
      </div>
      {showCaption ? (
        <p
          aria-hidden="true"
          data-slot="star-rating-caption"
          className="font-medium text-muted-foreground tabular-nums"
        >
          {word ? `${value.toFixed(1)} · ${word}` : placeholder}
        </p>
      ) : null}
    </RadioGroupPrimitive.Root>
  );
}

export { starRatingVariants };
