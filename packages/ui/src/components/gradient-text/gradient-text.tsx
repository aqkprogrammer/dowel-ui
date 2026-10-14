// Original design.
import type { ComponentPropsWithRef, CSSProperties, ElementType } from "react";

import { cn } from "@/lib/utils";

/*
 * Text filled with a gradient of theme colours, optionally drifting slowly
 * across the letters.
 *
 * The text stays one run of real text — selectable, copyable, read as
 * written. The gradient is a background clipped to the glyphs; the drift moves
 * its position on a loop. Under reduced motion it holds still (the global
 * blanket settles it on its first frame); in forced-colours mode the clip is
 * dropped and the text takes the system colour. Renders on the server.
 */

const PREFIX = "dowel-gradient-text";

const STYLES = `
@keyframes ${PREFIX}-drift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
[data-slot=gradient-text]{-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;-webkit-box-decoration-break:clone;box-decoration-break:clone}
@media (forced-colors:active){[data-slot=gradient-text]{background:none;color:CanvasText;-webkit-text-fill-color:currentColor}}
`;

/** Elements gradient text renders as: phrasing or heading content. */
export type GradientTextElement =
  "span" | "p" | "strong" | "em" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface GradientTextProps extends Omit<ComponentPropsWithRef<"span">, "color"> {
  /** The element to render. Default "span". */
  as?: GradientTextElement;
  /** The gradient's colours, in order: tokens or CSS colours. Default primary → info → primary. */
  colors?: readonly string[];
  /** Direction of the gradient, in degrees. Default 90. */
  angle?: number;
  /** Drift the gradient across the text. Default true. */
  animate?: boolean;
  /** Seconds per drift cycle. Default 6. */
  duration?: number;
}

function toCss(color: string): string {
  return /^[a-z][a-z0-9-]*$/.test(color) && color !== "transparent" && color !== "currentcolor"
    ? `var(--color-${color})`
    : color;
}

/** The background for the text: the colours across a gradient twice the text's width, so it can drift. */
export function gradientTextBackground(colors: readonly string[], angle: number): string {
  const stops = (colors.length >= 2 ? colors : ["primary", "info", "primary"]).map(toCss);
  return `linear-gradient(${String(angle)}deg, ${stops.join(", ")})`;
}

/** Text filled with a gradient of theme colours that can drift slowly across it. */
export function GradientText({
  as: Component = "span",
  colors = DEFAULT_COLORS,
  angle = 90,
  animate = true,
  duration = 6,
  className,
  style,
  ...props
}: GradientTextProps) {
  const Element = Component as ElementType;
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Element
        data-slot="gradient-text"
        data-animated={animate || undefined}
        className={cn("inline", className)}
        style={
          {
            backgroundImage: gradientTextBackground(colors, angle),
            backgroundSize: animate ? "200% 100%" : "100% 100%",
            animation: animate
              ? `${PREFIX}-drift calc(${String(Math.max(0.5, duration))}s * var(--motion-scale, 1)) ease-in-out infinite`
              : undefined,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    </>
  );
}

const DEFAULT_COLORS = ["primary", "info", "primary"] as const;
