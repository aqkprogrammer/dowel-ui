"use client";

// Ported from amicro "Dots & Pulses" (MIT, © 2026 Syed Subhan Uddin) and the
// SmoothUI AI Loader (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Every loader family follows the same shape (ADR 0014):
 *
 * - The geometry is in `em`, so `size` scales the whole loader by changing one
 *   font size, and every variant keeps its proportions.
 * - The colour is `currentColor`, so it follows the text it sits in.
 * - Keyframes ship with the component through React's hoisted <style>, and
 *   every duration and delay runs through --motion-scale-indicator: under
 *   reduced motion the loader slows rather than freezing.
 * - `direction: ltr` on the root. A loader's travel is not reading order, and
 *   mirroring a sweep in RTL would make it read as running backwards.
 */

const PREFIX = "dowel-dots-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit}
.${PREFIX} [data-part]{display:block;border-radius:9999px;background:currentColor;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX} [data-part=static]{animation:none}
.${PREFIX} [data-part=ring]{background:transparent;border:0.125em solid currentColor}
.${PREFIX} [data-part=spin]{position:absolute;inset:0;background:transparent;border-radius:0}
.${PREFIX} [data-part=spin]>span{position:absolute;top:0;left:50%;border-radius:9999px;background:currentColor;transform:translateX(-50%)}
.${PREFIX} [data-part=fill]{position:absolute;inset:0;background:transparent;border-radius:0;animation:none}
@keyframes ${PREFIX}-fade{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes ${PREFIX}-blink{0%,100%{opacity:0}50%{opacity:1}}
@keyframes ${PREFIX}-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-1em)}}
@keyframes ${PREFIX}-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.25em)}}
@keyframes ${PREFIX}-wave{0%,100%{transform:translateY(.5em)}50%{transform:translateY(-.5em)}}
@keyframes ${PREFIX}-hop{0%,100%{transform:translateY(0) scaleY(.8)}50%{transform:translateY(-2.5em) scaleY(1.1)}}
@keyframes ${PREFIX}-swing-a{0%,100%{transform:translateX(-2em)}50%{transform:translateX(2em)}}
@keyframes ${PREFIX}-swing-b{0%,100%{transform:translateX(2em)}50%{transform:translateX(-2em)}}
@keyframes ${PREFIX}-swap-a{0%,100%{transform:translateX(0)}50%{transform:translateX(4em)}}
@keyframes ${PREFIX}-swap-b{0%,100%{transform:translateX(0)}50%{transform:translateX(-4em)}}
@keyframes ${PREFIX}-magnet-a{0%,100%{transform:translateX(0)}50%{transform:translateX(.5em)}}
@keyframes ${PREFIX}-magnet-b{0%,100%{transform:translateX(0)}50%{transform:translateX(-.5em)}}
@keyframes ${PREFIX}-shrink{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.5);opacity:.3}}
@keyframes ${PREFIX}-squeeze{0%,100%{transform:scale(1)}50%{transform:scale(.4)}}
@keyframes ${PREFIX}-swell{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.5);opacity:1}}
@keyframes ${PREFIX}-soft{0%,100%{transform:scale(.5);opacity:.3}50%{transform:scale(1);opacity:1}}
@keyframes ${PREFIX}-glow{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.5);opacity:.8}}
@keyframes ${PREFIX}-emit{from{transform:scale(0);opacity:var(--from,.8)}to{transform:scale(1);opacity:0}}
@keyframes ${PREFIX}-ripple{from{transform:scale(.3);opacity:.8}to{transform:scale(1.6);opacity:0}}
@keyframes ${PREFIX}-breathe{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--x),var(--y)) scale(1.75)}}
@keyframes ${PREFIX}-shift{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(2.25em)}50%{transform:translateX(4.5em)}}
@keyframes ${PREFIX}-drop{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(3em) scale(.8,1.2)}}
@keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-morph{0%{gap:.5em;transform:rotate(0)}50%{gap:0}100%{gap:.5em;transform:rotate(180deg)}}
`;

type Variant = {
  /**
   * Layout of the root, inline rather than as utilities. The hoisted stylesheet
   * is unlayered, so it outranks Tailwind's layered utilities whatever their
   * specificity; inline styles are the one thing that reliably outranks it.
   */
  root: CSSProperties;
  render: (id: string) => ReactNode;
};

/** A dot, with its keyframe, duration and delay. */
function dot(
  key: number | string,
  size: string,
  animation: string | null,
  duration = 0,
  delay = 0,
  extra: CSSProperties = {},
  part = "dot",
): ReactNode {
  const style: CSSProperties & Record<`--${string}`, string> = {
    width: size,
    height: size,
    ...extra,
  };
  if (animation) {
    style.animationName = `${PREFIX}-${animation}`;
    style["--dur"] = scaled(duration);
    style["--delay"] = scaled(delay);
  }
  return <span key={key} data-part={animation ? part : "static"} style={style} />;
}

function row(
  count: number,
  size: string,
  animation: string,
  duration: number,
  stagger: number,
): ReactNode {
  return Array.from({ length: count }, (_, index) =>
    dot(index, size, animation, duration, index * stagger),
  );
}

/** The goo filter: blurs the dots together, then snaps the alpha back to an edge. */
function goo(id: string, blur: number, matrix: string): ReactNode {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${matrix}`}
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

/** A dot riding the edge of a rotating layer. */
function orbiter(key: number, size: string, duration: number, delay: number, opacity = 1) {
  return (
    <span
      key={key}
      data-part="spin"
      style={{
        animationName: `${PREFIX}-spin`,
        ["--dur" as string]: scaled(duration),
        ["--delay" as string]: scaled(delay),
      }}
    >
      <span style={{ width: size, height: size, opacity }} />
    </span>
  );
}

const ROW: CSSProperties = { gap: "0.75em" };

const VARIANTS = {
  pulse: { root: ROW, render: () => row(3, "1.25em", "fade", 1.4, 0.2) },
  bounce: { root: ROW, render: () => row(3, "1.25em", "bounce", 0.6, 0.1) },
  liquid: {
    root: { height: "4em", width: "8em" },
    render: (id) => (
      <>
        {goo(id, 4, "18 -7")}
        <span data-part="fill" style={{ filter: `url(#${id})` }}>
          {dot("a", "3em", "swing-a", 2, 0, {
            position: "absolute",
            top: "0.5em",
            left: "2.5em",
          })}
          {dot("b", "3em", "swing-b", 2, 0, {
            position: "absolute",
            top: "0.5em",
            left: "2.5em",
          })}
        </span>
      </>
    ),
  },
  fade: {
    root: { gap: "0.5em" },
    render: () =>
      Array.from({ length: 4 }, (_, index) =>
        dot(index, "1em", "blink", 1.5, index * 0.2, { animationTimingFunction: "linear" }),
      ),
  },
  swapping: {
    root: { gap: "2.5em" },
    render: () => [dot("a", "1.5em", "swap-a", 1.5), dot("b", "1.5em", "swap-b", 1.5)],
  },
  bouncing: {
    root: { height: "3.5em", alignItems: "flex-end", gap: "0.5em" },
    render: () => row(3, "1.25em", "hop", 0.8, 0.1),
  },
  bobbing: { root: ROW, render: () => row(3, "1.25em", "bob", 1.2, 0.15) },
  beacon: {
    root: { width: "3em", height: "3em" },
    render: () => [
      dot("ring", "3em", "emit", 1.5, 0, {
        position: "absolute",
        animationTimingFunction: "ease-out",
      }),
      dot("core", "1em", null),
    ],
  },
  wave: { root: { gap: "0.5em" }, render: () => row(5, "1em", "wave", 1, 0.15) },
  grid: {
    root: { display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "0.75em" },
    render: () =>
      Array.from({ length: 9 }, (_, index) =>
        dot(index, "1.25em", "shrink", 1.5, ((index % 3) + Math.floor(index / 3)) * 0.2),
      ),
  },
  pulsating: { root: ROW, render: () => row(3, "1.25em", "swell", 1.2, 0.2) },
  triple: {
    root: { width: "5em", height: "5em" },
    render: () => (
      <span
        data-part="spin"
        style={{
          animationName: `${PREFIX}-spin`,
          animationTimingFunction: "linear",
          ["--dur" as string]: scaled(2),
        }}
      >
        {[0, 120, 240].map((angle) => (
          <span
            key={angle}
            style={{
              width: "1em",
              height: "1em",
              transformOrigin: "50% 2.5em",
              transform: `translateX(-50%) rotate(${String(angle)}deg)`,
            }}
          />
        ))}
      </span>
    ),
  },
  ripple: {
    root: { width: "6em", height: "6em" },
    render: () => [
      dot("core", "1.25em", null),
      ...[0, 1, 2].map((index) =>
        dot(
          index,
          "4em",
          "ripple",
          2.2,
          index * 0.7,
          { position: "absolute", animationTimingFunction: "ease-out" },
          "ring",
        ),
      ),
    ],
  },
  glow: {
    root: { width: "4em", height: "4em" },
    render: () => [
      dot("halo", "2.5em", "glow", 2, 0, { position: "absolute", filter: "blur(0.375em)" }),
      dot("core", "1.25em", null),
    ],
  },
  breathe: {
    root: { width: "5em", height: "5em" },
    render: () =>
      [0, 60, 120, 180, 240, 300].map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        return dot(angle, "1.75em", "breathe", 3.6, 0, {
          position: "absolute",
          opacity: index % 2 === 0 ? 0.4 : 0.28,
          ["--x" as string]: `${(Math.cos(radians) * 1.375).toFixed(3)}em`,
          ["--y" as string]: `${(Math.sin(radians) * 1.375).toFixed(3)}em`,
        });
      }),
  },
  soft: { root: { gap: "0.5em" }, render: () => row(3, "1.25em", "soft", 1.2, 0.15) },
  shift: {
    root: { gap: "1em" },
    render: () => [
      dot("mover", "1.25em", "shift", 2, 0, { position: "absolute", left: 0 }),
      ...[0, 1, 2].map((index) => dot(index, "1.25em", null, 0, 0, { opacity: 0.25 })),
    ],
  },
  matrix: {
    root: { display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "0.5em" },
    render: () =>
      Array.from({ length: 9 }, (_, index) =>
        dot(index, "1em", "squeeze", 1.5, (Math.floor(index / 3) + (index % 3)) * 0.15),
      ),
  },
  orbit: {
    root: { width: "3em", height: "3em" },
    render: () => [
      dot("core", "1em", null, 0, 0, { opacity: 0.3 }),
      <span key="orbit" data-part="fill">
        {orbiter(0, "0.75em", 2, 0)}
      </span>,
    ],
  },
  magnetic: {
    root: { height: "3em", width: "5em" },
    render: (id) => (
      <>
        {goo(id, 2, "15 -7")}
        <span
          data-part="fill"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: `url(#${id})`,
          }}
        >
          {dot("a", "1.5em", "magnet-a", 1.5)}
          {dot("b", "1.5em", "magnet-b", 1.5)}
        </span>
      </>
    ),
  },
  drop: {
    root: {
      height: "5em",
      width: "3em",
      flexDirection: "column",
      justifyContent: "flex-start",
    },
    render: () => [
      dot("drop", "1.25em", "drop", 1, 0, {
        animationTimingFunction: "cubic-bezier(0.55, 0, 1, 0.45)",
      }),
      dot("floor", "0.25em", null, 0, 0, {
        width: "2em",
        position: "absolute",
        bottom: 0,
        opacity: 0.3,
      }),
    ],
  },
  "morph-ring": {
    root: {},
    render: () => (
      <span
        data-part="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, auto)",
          borderRadius: 0,
          background: "transparent",
          animationName: `${PREFIX}-morph`,
          ["--dur" as string]: scaled(2),
        }}
      >
        {[0, 1, 2, 3].map((index) => dot(index, "1em", null))}
      </span>
    ),
  },
  sonar: {
    root: { width: "3em", height: "3em" },
    render: () => [
      ...[0, 0.5].map((delay) =>
        dot(delay, "3em", "emit", 1.5, delay, {
          position: "absolute",
          animationTimingFunction: "ease-out",
          ["--from" as string]: "0.35",
        }),
      ),
      dot("core", "1em", null),
    ],
  },
  trailing: {
    root: { width: "3em", height: "3em" },
    render: () =>
      [0, 1, 2, 3, 4].map((index) => orbiter(index, "1em", 1.5, index * 0.1, 1 - index * 0.2)),
  },
  thinking: {
    root: { gap: "0.5em" },
    render: () =>
      Array.from({ length: 3 }, (_, index) =>
        dot(index, "0.75em", "fade", 1.2, index * 0.2, {
          animationTimingFunction: "cubic-bezier(0.645, 0.045, 0.355, 1)",
        }),
      ),
  },
} satisfies Record<string, Variant>;

export type DotsLoaderVariant = keyof typeof VARIANTS;

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const dotsLoaderVariantNames = Object.keys(VARIANTS) as DotsLoaderVariant[];

const dotsLoaderVariants = cva("", {
  variants: {
    size: {
      sm: "text-[0.25rem]",
      md: "text-[0.375rem]",
      lg: "text-[0.5rem]",
      xl: "text-[0.625rem]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface DotsLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof dotsLoaderVariants> {
  /** Which animation to play. */
  variant?: DotsLoaderVariant;
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of dots, in 25 motions. */
export function DotsLoader({
  className,
  size,
  variant = "pulse",
  label,
  style,
  ...props
}: DotsLoaderProps) {
  const filterId = `${PREFIX}-${useId().replace(/:/g, "")}`;
  const spec: Variant = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="dots-loader"
        data-variant={variant}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, dotsLoaderVariants({ size }), className)}
        style={{ ...spec.root, ...style }}
        {...props}
      >
        {spec.render(filterId)}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { dotsLoaderVariants };
