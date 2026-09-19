"use client";

// Ported from SmoothUI Hero 1 (header-1) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { Button } from "@/components/button";
import { TextEffect } from "@/components/text-effect";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A centred hero over a grid of squares that light up under the pointer.
 *
 * - The source measured its container and re-rendered the grid on resize, and
 *   rendered every cell as a button element — hundreds of unnamed tab stops inside
 *   an aria-hidden layer. Here the grid is decoration: plain, aria-hidden
 *   <div>s in a CSS auto-fill grid, enough of them to cover a wide screen,
 *   clipped by the section. No measuring, no resize listener, and it renders
 *   on the server.
 * - The source picked a random colour per hover. A hover colour here is
 *   picked by the cell's position from five theme tokens (or `colors`), so
 *   neighbouring cells still differ and nothing is random between renders.
 *   It lights instantly and fades out slowly; the fade runs on the motion
 *   scale, so under reduced motion the cell simply switches back.
 * - The copy blurs and slides in, staggered. The headline is TextEffect's
 *   focus-blur-resolve, the source's AnimatedText.
 */

const PREFIX = "dowel-hero-grid";

/** Enough 2×2 squares to cover a 2560px-wide hero at the default size. */
const SQUARES = 192;
const PALETTE = 5;

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

/** Each cell's hover colour is (square + cell) mod 5, so neighbours differ. */
const hoverRules = Array.from({ length: PALETTE }, (_, square) =>
  Array.from(
    { length: 4 },
    (_, cell) =>
      `[data-slot=hero-grid-square]:nth-child(${String(PALETTE)}n+${String(square + 1)})>[data-slot=hero-grid-cell]:nth-child(${String(cell + 1)}):hover{background-color:var(--hero-grid-color-${String(((square + cell) % PALETTE) + 1)})}`,
  ).join(""),
).join("");

const STYLES = `@keyframes ${PREFIX}-rise{from{opacity:0;filter:blur(4px);transform:translateY(20px)}}
[data-slot=hero-grid-reveal]{animation:${PREFIX}-rise ${scaled(700)} var(--ease-out-quint) both;animation-delay:calc(var(--i, 0) * ${scaled(100)})}
[data-slot=hero-grid-cell]{transition:background-color ${scaled(3000)} var(--ease-out-quint)}
[data-slot=hero-grid-cell]:hover{transition-duration:0s}
[data-slot=hero-grid-cell]:nth-child(odd){border-inline-end:1px solid var(--color-border)}
[data-slot=hero-grid-cell]:nth-child(n+3){border-block-start:1px solid var(--color-border)}
${hoverRules}`;

export interface HeroGridAction {
  label: string;
  href: string;
}

export interface HeroGridBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  /** The headline. */
  title?: string;
  /** Words appended to the headline in the primary colour. */
  highlight?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroGridAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroGridAction | null;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Hover colours for the grid, any CSS colour. Up to five are used, cycled
   * across the cells. Defaults to the theme's primary and status colours.
   */
  colors?: string[];
}

const DEFAULT_COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
];

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

/** A centred hero over a grid of squares that light up under the pointer. */
export function HeroGridBlock({
  title = "Build your next project with",
  highlight = "confidence",
  description = "Accessible, composable building blocks for polished, animated interfaces — ready in minutes.",
  primaryAction = { label: "Learn more", href: "#" },
  secondaryAction = { label: "Get started", href: "#" },
  headingLevel = 2,
  colors = DEFAULT_COLORS,
  className,
  ...props
}: HeroGridBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const colorVars: Vars = {};
  for (let index = 0; index < PALETTE; index++) {
    colorVars[`--hero-grid-color-${String(index + 1)}`] = palette[index % palette.length] ?? "";
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-grid"
      className={cn("relative isolate overflow-hidden px-4 py-24 sm:px-6 md:py-36", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        aria-hidden="true"
        data-slot="hero-grid-backdrop"
        className="absolute inset-0 -z-10 overflow-hidden"
        style={colorVars}
      >
        <div className="grid grid-cols-[repeat(auto-fill,var(--hero-grid-size))] border-e border-t border-border [--hero-grid-size:7.5rem]">
          {Array.from({ length: SQUARES }, (_, index) => (
            <div
              key={index}
              data-slot="hero-grid-square"
              className="grid size-[var(--hero-grid-size)] grid-cols-2 grid-rows-2 border-e border-t border-border select-none"
            >
              <div data-slot="hero-grid-cell" />
              <div data-slot="hero-grid-cell" />
              <div data-slot="hero-grid-cell" />
              <div data-slot="hero-grid-cell" />
            </div>
          ))}
        </div>
      </div>

      {/* The copy lets the pointer through to the grid; the links take it back. */}
      <div className="pointer-events-none mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div data-slot="hero-grid-reveal" style={{ "--i": 0 } as Vars}>
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
            data-slot="hero-grid-reveal"
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
