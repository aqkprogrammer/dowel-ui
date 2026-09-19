"use client";

// Ported from SmoothUI Hero 2 (header-2) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { TextEffect } from "@/components/text-effect";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A centred hero — announcement, headline, copy, two calls to action — over a
 * large product screenshot.
 *
 * - The source sequenced eight `motion` tweens. None carries gesture velocity,
 *   so each is one hoisted keyframe (a rise from an offset, a scale and
 *   transparency) with its own delay, all on the motion scale: the section
 *   settles, the announcement pops, the headline and copy resolve from a blur
 *   (TextEffect's focus-blur-resolve, the source's AnimatedText), the actions
 *   rise, then the screenshot rises and its image settles from a slight zoom.
 * - Hover lifts the actions and tilts the screenshot a couple of degrees.
 *   Those are transitions behind `motion-safe:`, so under reduced motion
 *   nothing moves at all, as the source intended.
 * - The source's announcement carried a third-party logo; here it is text. The
 *   screenshot is a prop; without one a token gradient holds its place.
 */

const PREFIX = "dowel-hero-product";
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const STYLES = `@keyframes ${PREFIX}-rise{from{opacity:var(--from-opacity, 0);transform:translateY(var(--from-y, 0)) scale(var(--from-scale, 1))}}
[data-slot=hero-product-reveal]{animation:${PREFIX}-rise calc(var(--duration) * var(--motion-scale, 1)) ${EASE} both;animation-delay:calc(var(--delay, 0ms) * var(--motion-scale, 1))}`;

export interface HeroProductAction {
  label: string;
  href: string;
}

export interface HeroProductImage {
  src: string;
  /** Describe what the screenshot shows; it is content, not decoration. */
  alt: string;
  width?: number;
  height?: number;
}

export interface HeroProductBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  /** A short linked announcement above the headline. `null` hides it. */
  announcement?: HeroProductAction | null;
  /** The headline. */
  title?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroProductAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroProductAction | null;
  /** The product screenshot. Without one, a token gradient holds its place. */
  image?: HeroProductImage;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** One staged entrance: delay and duration in ms, and the pose it starts from. */
function reveal(
  delay: number,
  duration: number,
  from: { y?: number; scale?: number; opacity?: number } = {},
): Vars {
  // Every variable is set on every element: they inherit, and a nested
  // entrance must not start from its parent's pose.
  return {
    "--delay": `${String(delay)}ms`,
    "--duration": `${String(duration)}ms`,
    "--from-y": `${String(from.y ?? 0)}px`,
    "--from-scale": String(from.scale ?? 1),
    "--from-opacity": String(from.opacity ?? 0),
  };
}

/** Button already transitions `scale`; hovering lifts it, pressing still sinks it. */
const lift = "motion-safe:hover:scale-105";

/** A centred hero over a large product screenshot. */
export function HeroProductBlock({
  announcement = { label: "New: motion components", href: "#" },
  title = "Build beautiful interfaces, effortlessly",
  description = "Craft, build and ship modern websites with smooth, accessible animation.",
  primaryAction = { label: "Start building", href: "#" },
  secondaryAction = { label: "Watch the video", href: "#" },
  image,
  headingLevel = 2,
  className,
  ...props
}: HeroProductBlockProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-product"
      className={cn("relative overflow-hidden py-20 md:py-36", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div data-slot="hero-product-reveal" style={reveal(0, 800, { scale: 1.02 })}>
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6">
          {announcement ? (
            <div
              data-slot="hero-product-reveal"
              style={reveal(100, 600, { y: 20, scale: 0.9 })}
            >
              <Badge
                asChild
                variant="outline"
                className="group h-7 gap-1.5 px-3 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] hover:bg-accent"
              >
                <a href={announcement.href}>
                  {announcement.label}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cn("size-3.5 text-muted-foreground", mirrorForDirection)}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </a>
              </Badge>
            </div>
          ) : null}

          <TextEffect
            as={`h${String(headingLevel)}` as `h${1 | 2 | 3 | 4 | 5 | 6}`}
            id={headingId}
            preset="focus-blur-resolve"
            delay={200}
            className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl"
          >
            {title}
          </TextEffect>

          {description ? (
            <TextEffect
              as="p"
              preset="focus-blur-resolve"
              delay={300}
              className="max-w-xl text-xl text-balance text-muted-foreground"
            >
              {description}
            </TextEffect>
          ) : null}

          {primaryAction || secondaryAction ? (
            <div
              data-slot="hero-product-reveal"
              className="flex flex-wrap items-center justify-center gap-3"
              style={reveal(400, 600, { y: 20 })}
            >
              {primaryAction ? (
                <Button asChild variant="gradient" size="lg" className={lift}>
                  <a href={primaryAction.href}>{primaryAction.label}</a>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild variant="outline" size="lg" className={lift}>
                  <a href={secondaryAction.href}>{secondaryAction.label}</a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          data-slot="hero-product-reveal"
          className="relative z-10 mx-auto mt-12 max-w-5xl px-4 sm:px-6 md:mt-16"
          style={reveal(600, 800, { y: 40, scale: 0.95 })}
        >
          <div className="[perspective:1200px]">
            <div
              data-slot="hero-product-frame"
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-background shadow-lg",
                "transition-[scale,rotate,transform,box-shadow] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                "motion-safe:hover:scale-[1.02] motion-safe:hover:rotate-y-2 motion-safe:hover:shadow-xl",
              )}
            >
              <div
                data-slot="hero-product-reveal"
                style={reveal(800, 1200, { scale: 1.05, opacity: 1 })}
              >
                {image ? (
                  <img
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    draggable={false}
                    className="h-auto w-full"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    data-slot="hero-product-placeholder"
                    className="aspect-[16/10] w-full bg-linear-to-br from-muted via-card to-accent"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
