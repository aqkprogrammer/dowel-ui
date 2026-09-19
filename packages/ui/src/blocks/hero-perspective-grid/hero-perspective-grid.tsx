"use client";

// Ported from SmoothUI Hero 4 (header-4) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { Button } from "@/components/button";
import { TextEffect } from "@/components/text-effect";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A centred hero over a tilted plane of tiles that light up under the pointer.
 *
 * - The source cloned one tile 1,599 times with cloneNode, outside React. Here
 *   the tiles are rendered — plain, aria-hidden <div>s, so the plane adds no
 *   tab stops and renders on the server.
 * - The plane is a 40×40 grid in perspective, rotated in three axes, with a
 *   radial wash of the page background over its edges. The tilt is static;
 *   under reduced motion it lies flat, as the source's did.
 * - A tile lights instantly and fades out on the motion scale. Its colour is
 *   one of four, picked by position with the source's nth-child pattern.
 * - Colours are tokens: the tile hairline is the foreground at 12%, the wash
 *   is the background, so the plane follows the theme with no .dark rules.
 */

const PREFIX = "dowel-hero-perspective-grid";
const SIDE = 40;

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** The source's pattern: tile index mod 4, 7 and 11 each pick a colour. */
const HOVER_PATTERN: [string, number][] = [
  ["4n", 1],
  ["4n+1", 2],
  ["4n+2", 3],
  ["4n+3", 4],
  ["7n", 2],
  ["7n+3", 3],
  ["7n+5", 4],
  ["7n+6", 1],
  ["11n+1", 1],
  ["11n+4", 2],
  ["11n+7", 3],
  ["11n+10", 4],
];

const TILE = "[data-slot=hero-perspective-grid-tile]";
const PLANE = "[data-slot=hero-perspective-grid-plane]";

const STYLES = `@keyframes ${PREFIX}-rise{from{opacity:0;filter:blur(4px);transform:translateY(20px)}}
[data-slot=hero-perspective-grid-reveal]{animation:${PREFIX}-rise ${scaled(700)} var(--ease-out-quint) both;animation-delay:calc(var(--i, 0) * ${scaled(100)})}
${PLANE}{position:absolute;top:50%;left:50%;display:grid;grid-template-columns:repeat(${String(SIDE)},1fr);grid-template-rows:repeat(${String(SIDE)},1fr);width:140rem;aspect-ratio:1;transform:translate(-50%,-50%) rotateX(50deg) rotateY(-5deg) rotateZ(20deg) scale(1.25)}
${PLANE}::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(circle,transparent 25%,color-mix(in oklab,var(--color-background) 92%,transparent) 80%)}
${TILE}{border:0.5px solid color-mix(in oklab,var(--color-foreground) 12%,transparent);transition:background-color ${scaled(1500)} var(--ease-out-quint)}
${TILE}:hover{transition-duration:0s}
${HOVER_PATTERN.map(([nth, color]) => `${TILE}:nth-child(${nth}):hover{background-color:var(--hero-perspective-grid-color-${String(color)})}`).join("")}
@media (prefers-reduced-motion:reduce){${PLANE}{transform:translate(-50%,-50%) rotateZ(20deg)}}`;

export interface HeroPerspectiveGridAction {
  label: string;
  href: string;
}

export interface HeroPerspectiveGridBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** The headline. */
  title?: string;
  /** Words appended to the headline in the primary colour. */
  highlight?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroPerspectiveGridAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroPerspectiveGridAction | null;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Tile hover colour: one CSS colour, or up to four cycled across the plane.
   * Defaults to the theme's primary colour.
   */
  hoverColors?: string | string[];
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
        mirrorForDirection,
      )}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** A centred hero over a tilted plane of tiles that light up under the pointer. */
export function HeroPerspectiveGridBlock({
  title = "Build your next project with",
  highlight = "confidence",
  description = "Accessible, composable building blocks for polished, animated interfaces — ready in minutes.",
  primaryAction = { label: "Learn more", href: "#" },
  secondaryAction = { label: "Get started", href: "#" },
  headingLevel = 2,
  hoverColors = "var(--color-primary)",
  className,
  ...props
}: HeroPerspectiveGridBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const list = (Array.isArray(hoverColors) ? hoverColors : [hoverColors]).filter(Boolean);
  const palette = list.length > 0 ? list : ["var(--color-primary)"];
  const colorVars: Vars = {};
  for (let index = 0; index < 4; index++) {
    colorVars[`--hero-perspective-grid-color-${String(index + 1)}`] =
      palette[index % palette.length] ?? "";
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-perspective-grid"
      className={cn("relative isolate overflow-hidden px-4 py-24 sm:px-6 md:py-36", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        aria-hidden="true"
        data-slot="hero-perspective-grid-backdrop"
        className="absolute inset-0 -z-10 overflow-hidden [perspective:2000px]"
        style={colorVars}
      >
        <div data-slot="hero-perspective-grid-plane">
          {Array.from({ length: SIDE * SIDE }, (_, index) => (
            <div key={index} data-slot="hero-perspective-grid-tile" />
          ))}
        </div>
      </div>

      {/* The copy lets the pointer through to the plane; the links take it back. */}
      <div className="pointer-events-none mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div data-slot="hero-perspective-grid-reveal" style={{ "--i": 0 } as Vars}>
          <Heading
            id={headingId}
            className="mb-6 text-3xl font-bold tracking-tight text-pretty lg:text-5xl"
          >
            <TextEffect preset="focus-blur-resolve">{title}</TextEffect>
            {highlight ? (
              <>
                {" "}
                <TextEffect preset="focus-blur-resolve" delay={80} className="text-primary">
                  {highlight}
                </TextEffect>
              </>
            ) : null}
          </Heading>
          {description ? (
            <TextEffect
              as="p"
              preset="focus-blur-resolve"
              delay={150}
              className="mx-auto max-w-3xl text-pretty text-muted-foreground lg:text-xl"
            >
              {description}
            </TextEffect>
          ) : null}
        </div>

        {primaryAction || secondaryAction ? (
          <div
            data-slot="hero-perspective-grid-reveal"
            className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-3"
            style={{ "--i": 1 } as Vars}
          >
            {secondaryAction ? (
              <Button asChild variant="outline" size="lg" className="shadow-xs hover:shadow-sm">
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : null}
            {primaryAction ? (
              <Button asChild variant="gradient" size="lg" className="group">
                <a href={primaryAction.href}>
                  {primaryAction.label}
                  <Arrow />
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
