// Ported from amicro "Geometric Shapes" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

import {
  PREFIX,
  VARIANT_NAMES,
  VARIANTS,
  type Variant,
  type VariantName,
} from "./shape-loader-variants";

/*
 * Follows the loader family shape (ADR 0014), as DotsLoader does: geometry in
 * `em`, colour from `currentColor`, keyframes hoisted with the component, and
 * every duration and delay scaled by --motion-scale-indicator.
 *
 * Parts pick a base look with data-part: `shape` is a filled block, `outline`
 * a bordered one, `group` a transparent layer that moves its children, `frame`
 * a transparent layer that never moves, and `svg`/`stroke`/`fill` draw with
 * the current colour. Squares set their own radius inline.
 */
/** The keyframes every variant draws on. Stops are spread evenly, as Framer spreads them. */
const KEYFRAMES = `
@keyframes ${PREFIX}-flip{0%{transform:rotateX(0) rotateY(0)}33.333%{transform:rotateX(180deg) rotateY(0)}66.667%{transform:rotateX(180deg) rotateY(180deg)}100%{transform:rotateX(0) rotateY(180deg)}}
@keyframes ${PREFIX}-morph{0%{border-radius:10%;transform:scale(1) rotate(0)}50%{border-radius:50%;transform:scale(.8) rotate(90deg)}100%{border-radius:10%;transform:scale(1) rotate(180deg)}}
@keyframes ${PREFIX}-cradle-a{0%,100%{transform:rotate(25deg)}20%,40%,60%,80%{transform:rotate(0)}}
@keyframes ${PREFIX}-cradle-b{0%,20%,40%,80%,100%{transform:rotate(0)}60%{transform:rotate(-25deg)}}
@keyframes ${PREFIX}-trace{0%,100%{transform:translate(0,0)}25%{transform:translate(var(--d),0)}50%{transform:translate(var(--d),var(--d))}75%{transform:translate(0,var(--d))}}
@keyframes ${PREFIX}-wander{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(3em,0) rotate(-90deg)}50%{transform:translate(3em,3em) rotate(-180deg)}75%{transform:translate(0,3em) rotate(-270deg)}100%{transform:translate(0,0) rotate(-360deg)}}
@keyframes ${PREFIX}-stretch-x{0%,100%{transform:scaleX(.2)}50%{transform:scaleX(1)}}
@keyframes ${PREFIX}-stretch-y{0%,100%{transform:scaleY(.2)}50%{transform:scaleY(1)}}
@keyframes ${PREFIX}-shrink{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.5);opacity:.3}}
@keyframes ${PREFIX}-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.25em)}}
@keyframes ${PREFIX}-pulse{0%,100%{transform:scale(1);opacity:1;border-radius:20%}50%{transform:scale(1.2);opacity:.3;border-radius:50%}}
@keyframes ${PREFIX}-swing{0%,100%{transform:rotate(-45deg)}50%{transform:rotate(45deg)}}
@keyframes ${PREFIX}-dash-120{from{stroke-dashoffset:120}to{stroke-dashoffset:-120}}
@keyframes ${PREFIX}-dash-100{from{stroke-dashoffset:100}to{stroke-dashoffset:-100}}
@keyframes ${PREFIX}-dash-tri{0%{stroke-dashoffset:120}50%{stroke-dashoffset:0}100%{stroke-dashoffset:-120}}
@keyframes ${PREFIX}-hourglass{0%{transform:rotate(0)}25%,50%{transform:rotate(180deg)}75%,100%{transform:rotate(360deg)}}
@keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-hop{0%,100%{transform:translateY(0) scale(1.2,.8)}50%{transform:translateY(-3em) scale(.9,1.1)}}
@keyframes ${PREFIX}-elastic{0%,100%{transform:translateY(0) scale(1.3,.7)}50%{transform:translateY(-2.5em) scale(.8,1.2)}}
@keyframes ${PREFIX}-breathe{0%{transform:scale(1) rotate(0);border-radius:0%}50%{transform:scale(1.2) rotate(90deg);border-radius:50%}100%{transform:scale(1) rotate(180deg);border-radius:0%}}
@keyframes ${PREFIX}-flicker{0%,100%{opacity:.1}50%{opacity:1}}
@keyframes ${PREFIX}-fade{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes ${PREFIX}-loop-a{0%,100%{transform:translateX(0) scale(1)}50%{transform:translateX(3em) scale(.5)}}
@keyframes ${PREFIX}-loop-b{0%,100%{transform:translateX(3em) scale(.5)}50%{transform:translateX(0) scale(1)}}
@keyframes ${PREFIX}-pump{0%,50%,100%{transform:scale(1)}25%,75%{transform:scale(1.25)}}
@keyframes ${PREFIX}-spiral{0%{rotate:0deg;scale:1}50%{scale:.8}100%{rotate:360deg;scale:1}}
@keyframes ${PREFIX}-nest-outer{0%{rotate:0deg;scale:1}33.333%{scale:1}50%{rotate:90deg}66.667%{scale:.8}100%{rotate:90deg;scale:1}}
@keyframes ${PREFIX}-nest-inner{0%{rotate:0deg;scale:1}33.333%{scale:1}50%{rotate:-90deg}66.667%{scale:1.2}100%{rotate:-90deg;scale:1}}
@keyframes ${PREFIX}-half-turn{from{transform:rotate(0)}to{transform:rotate(180deg)}}
@keyframes ${PREFIX}-icon{0%{border-radius:20%;transform:rotate(0)}33.333%{border-radius:50%;transform:rotate(90deg)}66.667%{border-radius:50%;transform:rotate(180deg)}100%{border-radius:20%;transform:rotate(270deg)}}
@keyframes ${PREFIX}-round{0%,100%{border-radius:10%}50%{border-radius:50%}}
@keyframes ${PREFIX}-cube{0%{transform:rotateX(0) rotateY(0)}50%{transform:rotateX(180deg) rotateY(0)}100%{transform:rotateX(180deg) rotateY(180deg)}}
@keyframes ${PREFIX}-fold{0%,100%{transform:rotateY(0)}50%{transform:rotateY(180deg)}}
@keyframes ${PREFIX}-diamond{0%{transform:rotate(45deg)}33.333%{transform:rotate(135deg)}66.667%{transform:rotate(225deg)}100%{transform:rotate(315deg)}}
@keyframes ${PREFIX}-shift{0%,100%{border-radius:10%;transform:scale(1)}50%{border-radius:50%;transform:scale(.8)}}
@keyframes ${PREFIX}-hex{0%{transform:scale(1) rotate(0)}50%{transform:scale(1.15) rotate(60deg)}100%{transform:scale(1) rotate(60deg)}}
@keyframes ${PREFIX}-fluid{0%,100%{transform:scale(1,1) rotate(45deg)}50%{transform:scale(1.5,.5) rotate(45deg)}}
`;

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit}
.${PREFIX} [data-part]{display:block;box-sizing:border-box;flex-shrink:0;border-radius:9999px;background:currentColor;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX} [data-part=outline]{background:transparent;border-style:solid;border-color:currentColor}
.${PREFIX} [data-part=group]{background:transparent;border-radius:0}
.${PREFIX} [data-part=frame]{background:transparent;border-radius:0;animation:none}
.${PREFIX} [data-part=svg]{background:transparent;border-radius:0;overflow:visible;transform-origin:center}
.${PREFIX} [data-part=stroke]{background:none;border-radius:0;fill:none;stroke:currentColor;transform-box:fill-box;transform-origin:center}
.${PREFIX} [data-part=fill]{background:none;border-radius:0;fill:currentColor;animation:none}
${KEYFRAMES}`;

export type ShapeLoaderVariant = VariantName;

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const shapeLoaderVariantNames = [...VARIANT_NAMES];

const shapeLoaderVariants = cva("", {
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

export interface ShapeLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof shapeLoaderVariants> {
  /** Which animation to play. */
  variant?: ShapeLoaderVariant;
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of geometric shapes, in 35 motions. */
export function ShapeLoader({
  className,
  size,
  variant = "flip-square",
  label,
  style,
  ...props
}: ShapeLoaderProps) {
  const spec: Variant = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="shape-loader"
        data-variant={variant}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, shapeLoaderVariants({ size }), className)}
        style={{ ...spec.root, ...style }}
        {...props}
      >
        {spec.render()}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { shapeLoaderVariants };
