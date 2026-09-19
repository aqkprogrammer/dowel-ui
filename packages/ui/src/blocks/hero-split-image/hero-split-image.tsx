"use client";

// Ported from SmoothUI Hero 3 (header-3) (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { AvatarGroup, type AvatarGroupItem } from "@/components/avatar-group";
import { Button } from "@/components/button";
import { TextEffect } from "@/components/text-effect";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A two-column hero: headline, copy, social proof and calls to action beside
 * an image.
 *
 * - The section resolves from a blur and a slight zoom, then its parts blur
 *   and slide in, staggered — the source's `motion` spring and AnimatedGroup
 *   as hoisted keyframes on the motion scale. The headline and copy are
 *   TextEffect's focus-blur-resolve, the source's AnimatedText.
 * - The reviewers are an AvatarGroup, which spreads on hover or keyboard
 *   focus; the source lifted each avatar with a spring.
 * - The rating is stated in words. Five yellow stars say nothing to a screen
 *   reader, so the stars are one image named "Rated 4.9 out of 5" and the
 *   visible figure beside them is hidden from it rather than read twice.
 * - The source's image was fixed; here it is a prop, and without one a token
 *   gradient holds its place.
 */

const PREFIX = "dowel-hero-split-image";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `@keyframes ${PREFIX}-enter{from{opacity:0;filter:blur(12px);transform:scale(1.04)}}
@keyframes ${PREFIX}-rise{from{opacity:0;filter:blur(4px);transform:translateY(20px)}}
[data-slot=hero-split-image-surface]{animation:${PREFIX}-enter ${scaled(900)} var(--ease-out-quint) both}
[data-slot=hero-split-image-reveal]{animation:${PREFIX}-rise ${scaled(700)} var(--ease-out-quint) both;animation-delay:calc(var(--i, 0) * ${scaled(100)})}`;

export interface HeroSplitImageAction {
  label: string;
  href: string;
}

export interface HeroSplitImageImage {
  src: string;
  /** Describe what the image shows; it is content, not decoration. */
  alt: string;
  width?: number;
  height?: number;
}

export interface HeroSplitImageReviews {
  /** The reviewers shown as avatars. Images are optional; initials stand in. */
  avatars: AvatarGroupItem[];
  /** How many reviews, shown as "from 200+ reviews". */
  count: number;
  /** Average rating out of five. */
  rating?: number;
}

export interface HeroSplitImageBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** The headline. */
  title?: string;
  description?: string;
  /** Social proof under the copy. `null` hides it. */
  reviews?: HeroSplitImageReviews | null;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroSplitImageAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroSplitImageAction | null;
  /** The image beside the copy. Without one, a token gradient holds its place. */
  image?: HeroSplitImageImage;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const DEFAULT_REVIEWS: HeroSplitImageReviews = {
  avatars: [
    { name: "Amara Okafor" },
    { name: "Lukas Weber" },
    { name: "Priya Raman" },
    { name: "Mateo Silva" },
    { name: "Hana Sato" },
  ],
  count: 200,
  rating: 5,
};

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span
      role="img"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
      data-slot="hero-split-image-stars"
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          data-filled={index < filled ? "" : undefined}
          className={cn(
            "size-5 fill-current",
            index < filled ? "text-warning" : "text-muted-foreground/40",
          )}
        >
          <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.49l-5.87 3.09 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

/** A two-column hero: headline, copy, social proof and calls to action beside an image. */
export function HeroSplitImageBlock({
  title = "Build beautiful interfaces, effortlessly.",
  description = "Accessible, composable building blocks for polished, animated interfaces — ready in minutes.",
  reviews = DEFAULT_REVIEWS,
  primaryAction = { label: "Get started", href: "#" },
  secondaryAction = { label: "Watch the demo", href: "#" },
  image,
  headingLevel = 2,
  className,
  ...props
}: HeroSplitImageBlockProps) {
  const headingId = useId();
  let step = 0;
  const next = (): Vars => ({ "--i": step++ });

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-split-image"
      className={cn(
        "relative overflow-hidden bg-linear-to-b from-background to-muted",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      <div
        data-slot="hero-split-image-surface"
        className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20"
      >
        <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
          <div data-slot="hero-split-image-reveal" style={next()}>
            <TextEffect
              as={`h${String(headingLevel)}` as `h${1 | 2 | 3 | 4 | 5 | 6}`}
              id={headingId}
              preset="focus-blur-resolve"
              className="my-6 text-4xl font-bold text-pretty lg:text-6xl"
            >
              {title}
            </TextEffect>
          </div>

          {description ? (
            <div data-slot="hero-split-image-reveal" style={next()}>
              <TextEffect
                as="p"
                preset="focus-blur-resolve"
                delay={120}
                className="mb-8 max-w-xl text-muted-foreground lg:text-xl"
              >
                {description}
              </TextEffect>
            </div>
          ) : null}

          {reviews ? (
            <div
              data-slot="hero-split-image-reveal"
              className="mb-12 flex w-fit flex-col items-center gap-4 sm:flex-row"
              style={next()}
            >
              {reviews.avatars.length > 0 ? (
                <AvatarGroup avatars={reviews.avatars} size="lg" max={5} />
              ) : null}
              <div className="flex flex-col items-center sm:items-start">
                {reviews.rating !== undefined ? (
                  <div className="flex items-center gap-1.5">
                    <Stars rating={reviews.rating} />
                    <span aria-hidden="true" className="font-semibold tabular-nums">
                      {reviews.rating.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                <p className="font-medium text-muted-foreground">
                  from {reviews.count.toLocaleString()}+ reviews
                </p>
              </div>
            </div>
          ) : null}

          {primaryAction || secondaryAction ? (
            <div
              data-slot="hero-split-image-reveal"
              className="flex w-full flex-col justify-center gap-2 sm:flex-row lg:justify-start"
              style={next()}
            >
              {primaryAction ? (
                <Button asChild variant="gradient" size="lg" className="w-full sm:w-auto">
                  <a href={primaryAction.href}>{primaryAction.label}</a>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild variant="outline" size="lg">
                  <a href={secondaryAction.href}>
                    {secondaryAction.label}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={mirrorForDirection}
                    >
                      <path d="m7 7 10 10" />
                      <path d="M17 7v10H7" />
                    </svg>
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex">
          {image ? (
            <img
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              draggable={false}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              data-slot="hero-split-image-placeholder"
              className="aspect-[4/3] w-full rounded-md bg-linear-to-br from-muted via-card to-accent"
            />
          )}
        </div>
      </div>
    </section>
  );
}
