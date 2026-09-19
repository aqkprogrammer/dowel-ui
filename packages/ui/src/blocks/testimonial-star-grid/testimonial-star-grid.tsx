"use client";

// Ported from SmoothUI Testimonials 3 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { cn } from "@/lib/utils";

/*
 * Reviews in a grid, each with a star rating, the quotation, and who said it.
 *
 * The source cascades each card in, pops its stars in one after another with
 * an overshoot, then fades in the quote and slides in the author. Every step
 * is a hoisted keyframe here, with its delay derived from the card's and the
 * star's position and scaled by --motion-scale, so reduced motion lands every
 * card at rest at once. The hover lift is a transition gated on motion-safe.
 * The rating is read as one phrase ("Rated 4 out of 5"), not five pictures.
 */

const PREFIX = "dowel-testimonial-star-grid";

const STYLES = `
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 1.875rem}}
@keyframes ${PREFIX}-pop{from{opacity:0;scale:0}}
@keyframes ${PREFIX}-slide{from{opacity:0;translate:-0.625rem 0}}
[data-slot=testimonial-star-grid-list]>li{animation:${PREFIX}-rise var(--duration-slower) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-card,0) * 150ms * var(--motion-scale,1))}
[data-slot=testimonial-star-grid-star]{animation:${PREFIX}-pop var(--duration-normal) var(--ease-overshoot) both;animation-delay:calc((var(--${PREFIX}-card,0) * 150ms + 200ms + var(--${PREFIX}-star,0) * 50ms) * var(--motion-scale,1))}
[data-slot=testimonial-star-grid-quote]{animation:${PREFIX}-rise var(--duration-slow) var(--ease-out-quint) both;animation-delay:calc((var(--${PREFIX}-card,0) * 150ms + 400ms) * var(--motion-scale,1))}
[data-slot=testimonial-star-grid-author]{animation:${PREFIX}-slide var(--duration-slow) var(--ease-out-quint) both;animation-delay:calc((var(--${PREFIX}-card,0) * 150ms + 500ms) * var(--motion-scale,1))}
[dir=rtl] [data-slot=testimonial-star-grid-author]{animation-name:${PREFIX}-slide-rtl}
@keyframes ${PREFIX}-slide-rtl{from{opacity:0;translate:0.625rem 0}}
`;

export interface StarGridTestimonial {
  /** Stable identity. Defaults to the name. */
  id?: string;
  quote: ReactNode;
  name: string;
  /** A line under the name: a role or affiliation. */
  subtitle?: ReactNode;
  /** Whole stars out of five. Omit to show no rating. */
  rating?: number;
  /** Image URL for the avatar. Initials are shown without one, or while it loads. */
  avatarSrc?: string;
}

export const DEFAULT_STAR_GRID_TESTIMONIALS: StarGridTestimonial[] = [
  {
    name: "Sarah Johnson",
    subtitle: "Frontend developer",
    rating: 5,
    quote:
      "It changed how I build interfaces. The motion is calm, the components are well designed, and the documentation is excellent.",
  },
  {
    name: "Michael Chen",
    subtitle: "Product designer",
    rating: 5,
    quote:
      "The quality shows on every screen. Transitions feel natural and the API is exactly what I expected it to be.",
  },
  {
    name: "Emily Rodriguez",
    subtitle: "Full-stack developer",
    rating: 4,
    quote:
      "Easy to customise. I get polished, animated interfaces without hours of implementation detail.",
  },
  {
    name: "David Kim",
    subtitle: "Product engineer",
    rating: 5,
    quote:
      "It balances looks and performance. Fast to load, accessible by default, and it looks good.",
  },
];

export interface TestimonialStarGridBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  testimonials?: StarGridTestimonial[];
  /** How a rating is read aloud. */
  ratingLabel?: (rating: number, outOf: number) => string;
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const STARS = 5;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join("");
}

/** Five stars, the first `rating` filled, read as one phrase. */
function Stars({ rating, label }: { rating: number; label: string }) {
  const filled = Math.max(0, Math.min(STARS, Math.round(rating)));
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {Array.from({ length: STARS }, (_, star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          aria-hidden="true"
          data-slot="testimonial-star-grid-star"
          data-filled={star < filled || undefined}
          style={{ [`--${PREFIX}-star`]: star } as CSSProperties}
          className={cn(
            "size-4 stroke-current stroke-[1.5]",
            star < filled ? "fill-current text-warning" : "fill-none text-border-strong",
          )}
        >
          <path
            strokeLinejoin="round"
            d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"
          />
        </svg>
      ))}
    </div>
  );
}

/** Reviews in a grid, each with a star rating, the quotation and its author. */
export function TestimonialStarGridBlock({
  heading = "What people are saying",
  description = "Real feedback from the people building with it every day.",
  testimonials = DEFAULT_STAR_GRID_TESTIMONIALS,
  ratingLabel = (rating, outOf) => `Rated ${String(rating)} out of ${String(outOf)}`,
  headingLevel = 2,
  className,
  ...props
}: TestimonialStarGridBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="testimonial-star-grid"
      className={cn("mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mb-12">
        <Heading
          id={headingId}
          className="text-4xl font-semibold tracking-tight text-balance text-foreground"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="my-4 text-lg text-balance text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <ul data-slot="testimonial-star-grid-list" className="grid gap-6 lg:grid-cols-2">
        {testimonials.map((testimonial, index) => (
          <li
            key={testimonial.id ?? testimonial.name}
            style={{ [`--${PREFIX}-card`]: index } as CSSProperties}
          >
            <figure
              className={cn(
                "h-full rounded-2xl border border-transparent px-4 py-3",
                "transition-[translate,border-color,background-color] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                "hover:border-border hover:bg-card/50 motion-safe:hover:-translate-y-1",
              )}
            >
              {testimonial.rating !== undefined ? (
                <Stars
                  rating={testimonial.rating}
                  label={ratingLabel(
                    Math.max(0, Math.min(STARS, Math.round(testimonial.rating))),
                    STARS,
                  )}
                />
              ) : null}
              <blockquote
                data-slot="testimonial-star-grid-quote"
                className="my-4 text-foreground"
              >
                <p>{testimonial.quote}</p>
              </blockquote>
              <figcaption
                data-slot="testimonial-star-grid-author"
                className="flex flex-wrap items-center gap-2"
              >
                {/* The name is right beside it, so the picture adds nothing to hear. */}
                <Avatar size="xs" aria-hidden="true" className="ring-1 ring-foreground/10">
                  {testimonial.avatarSrc ? (
                    <AvatarImage src={testimonial.avatarSrc} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{testimonial.name}</span>
                {testimonial.subtitle ? (
                  <>
                    <span aria-hidden="true" className="size-1 rounded-full bg-foreground/25" />
                    <span className="text-sm text-muted-foreground">
                      {testimonial.subtitle}
                    </span>
                  </>
                ) : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
