"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type MouseEvent,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A round heart button beside a bold count.
 *
 * Liking plays the whole moment: a thin ring tightens inside the circle, the
 * heart fills with the accent and pops through an overshoot, a ring ripples
 * out past the circle's edge and eight sparkle dots fly off it. The count
 * rolls at the same time, the old number sliding up and out while the new one
 * rises in from below. Unliking is quieter: the heart drains with a short dip
 * and the count rolls the other way, down. Every keyframe is hoisted, timed on
 * --motion-scale, and chosen by `data-animate`, which is only set once the
 * state has changed, so a button that starts liked does not celebrate on
 * first paint. Under reduced motion the global blanket collapses each one to
 * its resting frame.
 *
 * It is one toggle button (aria-pressed) named "Like, 128": the count is part
 * of the name because otherwise a screen reader would never hear it, and it
 * only changes when the person pressing the button changes it, so nothing
 * chatters. Every visual layer, the rolling count included, is aria-hidden.
 *
 * The accent (the heart's fill and the burst) is `--like-counter-accent`,
 * defaulting to currentColor; set it with the `accent` prop or a class.
 */

const PREFIX = "dowel-like-counter";
const ACCENT = "--like-counter-accent";

/** A duration in milliseconds on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@keyframes ${PREFIX}-pop{0%{scale:.4}45%{scale:1.28}68%{scale:.9}85%{scale:1.05}100%{scale:1}}
@keyframes ${PREFIX}-dip{0%{scale:1}40%{scale:.8}100%{scale:1}}
@keyframes ${PREFIX}-press{0%{opacity:0;scale:1.05}30%{opacity:.9;scale:.8}100%{opacity:0;scale:.95}}
@keyframes ${PREFIX}-ripple{0%{opacity:.7;scale:.85}100%{opacity:0;scale:1.6}}
@keyframes ${PREFIX}-spark{0%{opacity:0;transform:rotate(var(--a)) translateY(-1.1em) scale(1)}20%{opacity:1}100%{opacity:0;transform:rotate(var(--a)) translateY(-1.95em) scale(.3)}}
@keyframes ${PREFIX}-out-up{from{transform:translateY(0);opacity:1}to{transform:translateY(-90%);opacity:0}}
@keyframes ${PREFIX}-in-up{from{transform:translateY(90%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes ${PREFIX}-out-down{from{transform:translateY(0);opacity:1}to{transform:translateY(90%);opacity:0}}
@keyframes ${PREFIX}-in-down{from{transform:translateY(-90%);opacity:0}to{transform:translateY(0);opacity:1}}
.${PREFIX} [data-part=heart][data-animate=like]{animation:${PREFIX}-pop ${scaled(620)} cubic-bezier(.3,.7,.4,1) ${scaled(120)} both}
.${PREFIX} [data-part=heart][data-animate=unlike]{animation:${PREFIX}-dip ${scaled(260)} var(--ease-out-quint)}
.${PREFIX} [data-part=press]{animation:${PREFIX}-press ${scaled(420)} var(--ease-out-quint) both}
.${PREFIX} [data-part=ripple]{animation:${PREFIX}-ripple ${scaled(700)} var(--ease-out-quint) ${scaled(160)} both}
.${PREFIX} [data-part=spark]{animation:${PREFIX}-spark ${scaled(620)} var(--ease-out-quint) ${scaled(150)} both}
.${PREFIX} [data-part=count][data-dir=up][data-role=out]{animation:${PREFIX}-out-up ${scaled(380)} var(--ease-in-out-quint) ${scaled(100)} both}
.${PREFIX} [data-part=count][data-dir=up][data-role=in]{animation:${PREFIX}-in-up ${scaled(380)} var(--ease-out-quint) ${scaled(220)} both}
.${PREFIX} [data-part=count][data-dir=down][data-role=out]{animation:${PREFIX}-out-down ${scaled(320)} var(--ease-in-out-quint) both}
.${PREFIX} [data-part=count][data-dir=down][data-role=in]{animation:${PREFIX}-in-down ${scaled(320)} var(--ease-out-quint) ${scaled(80)} both}
`;

const SPARKS = Array.from({ length: 8 }, (_, index) => index * 45 + 22.5);

const likeCounterVariants = cva(
  cn(
    PREFIX,
    "group/like inline-flex shrink-0 items-center rounded-full text-foreground select-none",
    "gap-[0.6em] pe-[0.25em] [--like-counter-accent:currentColor]",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-xl",
        lg: "text-3xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Heart() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-full"
    >
      <path d="M12 20.25s-7.75-4.6-7.75-10.4A4.35 4.35 0 0 1 12 7.1a4.35 4.35 0 0 1 7.75 2.75c0 5.8-7.75 10.4-7.75 10.4Z" />
    </svg>
  );
}

export interface LikeCounterProps
  extends
    Omit<ComponentPropsWithRef<"button">, "children">,
    VariantProps<typeof likeCounterVariants> {
  /** Controlled state. When set, `count` is shown exactly as given. */
  liked?: boolean;
  /** Initial state when uncontrolled. */
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  /**
   * The total, as your data has it. Uncontrolled, it is the total at
   * `defaultLiked` and the viewer's own like is added or taken away as the
   * button toggles. Controlled, it is shown as given: update it with `liked`.
   */
  count: number;
  /** The accessible name before the count: "Like, 128". */
  label?: string;
  /** Any CSS colour for the filled heart and burst. Defaults to currentColor. */
  accent?: string;
}

type Roll = { from: number | null; to: number; dir: "up" | "down"; key: number };

/** A heart toggle in a round button, beside a count that rolls when it changes. */
export function LikeCounter({
  className,
  size,
  liked: likedProp,
  defaultLiked = false,
  onLikedChange,
  count,
  label = "Like",
  accent,
  onClick,
  style,
  "aria-label": ariaLabel,
  ...props
}: LikeCounterProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultLiked);
  const controlled = likedProp !== undefined;
  const liked = controlled ? likedProp : uncontrolled;
  const delta = controlled || liked === defaultLiked ? 0 : liked ? 1 : -1;
  const shown = Math.max(0, count + delta);

  // Derived during render from a change, whoever made it.
  const [previousLiked, setPreviousLiked] = useState(liked);
  const [animate, setAnimate] = useState<"like" | "unlike" | null>(null);
  const [burst, setBurst] = useState(0);
  if (previousLiked !== liked) {
    setPreviousLiked(liked);
    setAnimate(liked ? "like" : "unlike");
    if (liked) setBurst((value) => value + 1);
  }

  const [roll, setRoll] = useState<Roll>({ from: null, to: shown, dir: "up", key: 0 });
  if (roll.to !== shown) {
    setRoll({
      from: roll.to,
      to: shown,
      dir: shown > roll.to ? "up" : "down",
      key: roll.key + 1,
    });
  }

  const format = (value: number) => new Intl.NumberFormat().format(value);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!controlled) setUncontrolled(!liked);
    onLikedChange?.(!liked);
  }

  return (
    <button
      type="button"
      data-slot="like-counter"
      data-state={liked ? "on" : "off"}
      aria-pressed={liked}
      aria-label={ariaLabel ?? `${label}, ${format(shown)}`}
      className={cn(likeCounterVariants({ size }), className)}
      style={{ ...(accent ? { [ACCENT]: accent } : null), ...style }}
      onClick={handleClick}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-[2.6em] shrink-0 place-items-center rounded-full",
          "bg-muted shadow-[inset_0_1px_0_0_var(--color-border)]",
          "transition-[background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
          "group-hover/like:bg-accent motion-safe:group-active/like:scale-95",
        )}
      >
        <span
          data-part="heart"
          data-animate={animate ?? undefined}
          className={cn(
            "grid size-[0.95em] place-items-center text-muted-foreground",
            "transition-[color,fill] duration-[var(--duration-fast)]",
            "group-data-[state=on]/like:text-[color:var(--like-counter-accent)]",
            "[&_svg]:fill-transparent [&_svg]:transition-[fill] [&_svg]:duration-[var(--duration-normal)]",
            "group-data-[state=on]/like:[&_svg]:fill-current",
          )}
        >
          <Heart />
        </span>
        {burst > 0 && liked ? (
          <span
            key={burst}
            className="pointer-events-none absolute inset-0 text-[color:var(--like-counter-accent)]"
          >
            <span
              data-part="press"
              className="absolute inset-[0.3em] rounded-full border-[0.06em] border-current opacity-0"
            />
            <span
              data-part="ripple"
              className="absolute inset-0 rounded-full border-[0.05em] border-current opacity-0"
            />
            {SPARKS.map((angle) => (
              <span
                key={angle}
                data-part="spark"
                className="absolute inset-0 m-auto size-[0.12em] rounded-full bg-current opacity-0"
                style={{ "--a": `${String(angle)}deg` } as CSSProperties}
              />
            ))}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className="relative inline-grid overflow-hidden py-[0.1em] leading-none font-bold tabular-nums"
      >
        {roll.from !== null ? (
          <span
            key={`out-${String(roll.key)}`}
            data-part="count"
            data-role="out"
            data-dir={roll.dir}
            className="opacity-0 [grid-area:1/1]"
          >
            {format(roll.from)}
          </span>
        ) : null}
        <span
          key={`in-${String(roll.key)}`}
          data-part="count"
          data-role="in"
          data-dir={roll.from !== null ? roll.dir : undefined}
          data-value={roll.to}
          className="[grid-area:1/1]"
        >
          {format(roll.to)}
        </span>
      </span>
    </button>
  );
}

export { likeCounterVariants };
