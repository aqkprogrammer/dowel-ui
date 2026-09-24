"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

import { NumberFlow } from "@/components/number-flow";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A heart toggle with a rolling count.
 *
 * Liking is the moment worth celebrating, so it gets the whole sequence: the
 * heart fills and pops through an overshoot, a ring bursts outward from it
 * and eight dots radiate off its edge. Unliking is the user taking something
 * back, so it only deflates — a short dip in scale while the fill drains —
 * and it is over in well under half the time. Both are hoisted keyframes on
 * the motion scale, chosen by `data-animate`, which is only set once the
 * state has changed: a button that starts liked does not celebrate on first
 * paint. The count rolls through NumberFlow, in the direction it moved.
 *
 * The count. `count` is the total as your data has it, so the component never
 * asks you to subtract anything:
 *
 * - Uncontrolled (`defaultLiked`), `count` is the total at `defaultLiked`, and
 *   the button adds or takes away the viewer's one like as it toggles — an
 *   optimistic count with nothing to wire up.
 * - Controlled (`liked`), `count` is shown exactly as given. Whoever owns
 *   `liked` owns the total too, and updates both together.
 *
 * It is a toggle (aria-pressed), named "Like, 128": the count is part of the
 * name because it is the only place a screen reader would otherwise find it.
 * Every decorative layer is aria-hidden, and under reduced motion the base.css
 * blanket collapses each keyframe to its resting frame.
 */

const PREFIX = "dowel-like-button";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const ANGLE = `--${PREFIX}-angle`;
const REACH = `--${PREFIX}-reach`;

const STYLES = `
@keyframes ${PREFIX}-pop{0%{scale:.3}42%{scale:1.3}64%{scale:.88}82%{scale:1.06}100%{scale:1}}
@keyframes ${PREFIX}-deflate{0%{scale:1}40%{scale:.78}100%{scale:1}}
@keyframes ${PREFIX}-ring{0%{opacity:.85;scale:.3}100%{opacity:0;scale:1.35}}
@keyframes ${PREFIX}-spark{0%{opacity:0;transform:rotate(var(${ANGLE})) translateY(0) scale(1)}15%{opacity:1}100%{opacity:0;transform:rotate(var(${ANGLE})) translateY(calc(var(${REACH}) * -1)) scale(0)}}
[data-slot=like-button-icon][data-animate=like]{animation:${PREFIX}-pop ${scaled(620)} cubic-bezier(.3,.7,.4,1) both}
[data-slot=like-button-icon][data-animate=unlike]{animation:${PREFIX}-deflate ${scaled(240)} var(--ease-out-quint)}
[data-slot=like-button-ring]{animation:${PREFIX}-ring ${scaled(520)} var(--ease-out-quint) both}
[data-slot=like-button-spark]{animation:${PREFIX}-spark ${scaled(560)} var(--ease-out-quint) ${scaled(60)} both}
`;

/** Eight dots around the heart, alternating long and short throws. */
const SPARKS = Array.from({ length: 8 }, (_, index) => ({
  angle: index * 45,
  reach: index % 2 === 0 ? "1.35em" : "1.05em",
}));

const likeButtonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-muted-foreground tabular-nums select-none",
    "transition-[background-color,color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "hover:bg-accent hover:text-accent-foreground motion-safe:active:scale-95",
    // The fill drains faster than it pours: turning off is the quieter move.
    "[&_svg]:fill-transparent [&_svg]:transition-[fill] [&_svg]:duration-[var(--duration-instant)]",
    "data-[state=on]:[&_svg]:fill-current data-[state=on]:[&_svg]:duration-[var(--duration-fast)]",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      /** The colour it takes while liked. A heart is destructive-red; a star reads better as warning. */
      tone: {
        destructive: "data-[state=on]:text-destructive data-[state=on]:hover:text-destructive",
        primary: "data-[state=on]:text-primary data-[state=on]:hover:text-primary",
        warning: "data-[state=on]:text-warning data-[state=on]:hover:text-warning",
        success: "data-[state=on]:text-success data-[state=on]:hover:text-success",
        foreground: "data-[state=on]:text-foreground data-[state=on]:hover:text-foreground",
      },
      size: {
        sm: "h-7 gap-1 px-2 text-xs [&_svg]:size-4",
        md: "h-9 gap-1.5 px-2.5 text-sm [&_svg]:size-5",
        lg: "h-11 gap-2 px-3 text-base [&_svg]:size-6",
      },
      /** Icon only: a circle rather than a pill. */
      iconOnly: {
        true: "aspect-square px-0",
        false: "",
      },
    },
    defaultVariants: {
      tone: "destructive",
      size: "md",
      iconOnly: false,
    },
  },
);

function Heart() {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.25s-7.75-4.6-7.75-10.4A4.35 4.35 0 0 1 12 7.1a4.35 4.35 0 0 1 7.75 2.75c0 5.8-7.75 10.4-7.75 10.4Z" />
    </svg>
  );
}

export interface LikeButtonProps
  extends
    Omit<ComponentPropsWithRef<"button">, "children">,
    Omit<VariantProps<typeof likeButtonVariants>, "iconOnly"> {
  /** Controlled state. When set, `count` is shown exactly as given. */
  liked?: boolean;
  /** Initial state when uncontrolled. */
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  /**
   * The total, as your data has it. Uncontrolled, it is the total at
   * `defaultLiked`, and the viewer's own like is added or removed as the
   * button toggles. Controlled, it is shown as given — update it with `liked`.
   */
  count?: number;
  /** Show the count beside the icon. Hidden when there is no `count`. */
  showCount?: boolean;
  /** Intl.NumberFormat options for the count, e.g. `{ notation: "compact" }` for "1.2K". */
  format?: Intl.NumberFormatOptions;
  /** The glyph. Defaults to a heart; any stroked icon (a star, a bookmark) fills the same way. */
  icon?: ReactNode;
  /** The accessible name, before the count: "Like, 128". */
  label?: string;
}

type Motion = "idle" | "like" | "unlike";

/** A like toggle whose heart pops and bursts when liked, with a count that rolls. */
export function LikeButton({
  className,
  liked: likedProp,
  defaultLiked = false,
  onLikedChange,
  count,
  showCount = true,
  format,
  icon,
  label = "Like",
  tone,
  size,
  onClick,
  "aria-label": ariaLabel,
  ...props
}: LikeButtonProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultLiked);
  const controlled = likedProp !== undefined;
  const liked = controlled ? likedProp : uncontrolled;

  // Which animation to play, derived during render from a change in `liked`,
  // whoever made it. Nothing plays until the first change.
  const [previous, setPrevious] = useState(liked);
  const [motion, setMotion] = useState<Motion>("idle");
  if (previous !== liked) {
    setPrevious(liked);
    setMotion(liked ? "like" : "unlike");
  }

  let shown: number | undefined;
  if (count !== undefined) {
    const delta = controlled || liked === defaultLiked ? 0 : liked ? 1 : -1;
    shown = Math.max(0, count + delta);
  }
  const withCount = showCount && shown !== undefined;
  const name = withCount
    ? `${label}, ${new Intl.NumberFormat(undefined, format).format(shown ?? 0)}`
    : label;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!controlled) setUncontrolled(!liked);
    onLikedChange?.(!liked);
  }

  return (
    <button
      type="button"
      data-slot="like-button"
      data-state={liked ? "on" : "off"}
      aria-pressed={liked}
      aria-label={ariaLabel ?? name}
      className={cn(likeButtonVariants({ tone, size, iconOnly: !withCount }), className)}
      onClick={handleClick}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span aria-hidden="true" className="relative grid place-items-center">
        <span
          data-slot="like-button-icon"
          data-animate={motion === "idle" ? undefined : motion}
          className="grid place-items-center"
        >
          {icon ?? <Heart />}
        </span>
        {motion === "like" && liked ? (
          <span data-slot="like-button-burst" className="pointer-events-none absolute inset-0">
            <span
              data-slot="like-button-ring"
              className="absolute -inset-1/4 rounded-full border-2 border-current opacity-0"
            />
            {SPARKS.map((spark) => (
              <span
                key={spark.angle}
                data-slot="like-button-spark"
                className="absolute inset-0 m-auto size-[0.24em] rounded-full bg-current opacity-0"
                style={
                  {
                    [ANGLE]: `${String(spark.angle)}deg`,
                    [REACH]: spark.reach,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
      </span>
      {withCount ? (
        <NumberFlow
          aria-hidden="true"
          data-slot="like-button-count"
          data-value={shown}
          value={shown ?? 0}
          format={format}
        />
      ) : null}
    </button>
  );
}

export { likeButtonVariants };
