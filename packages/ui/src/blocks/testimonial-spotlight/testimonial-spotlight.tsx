"use client";

// Ported from SmoothUI Testimonials 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { ReviewsCarousel, type ReviewsCarouselLabels } from "@/components/reviews-carousel";
import { TextEffect } from "@/components/text-effect";
import { cn } from "@/lib/utils";

/*
 * The heading and a line of copy on one side, one testimonial at a time on
 * the other, stepped through with previous and next.
 *
 * The source stacks absolutely-positioned cards and animates them itself.
 * Dowel's reviews carousel is that stack — with the APG carousel semantics,
 * arrow keys and end handling the source lacks — so the block composes it,
 * looping as the source does. The source's per-word blur-in of each quote is
 * Text Effect's soft blur, by word, replayed whenever a testimonial comes to
 * the front; its sr-only copy means the quote is read as a sentence.
 */

export interface SpotlightTestimonial {
  /** Stable identity. Defaults to the name. */
  id?: string;
  /** Plain text, because it is animated word by word. */
  quote: string;
  name: string;
  /** A line under the name: a role or affiliation. */
  subtitle?: ReactNode;
  /** Image URL for the avatar. Initials are shown without one, or while it loads. */
  avatarSrc?: string;
}

export const DEFAULT_SPOTLIGHT_TESTIMONIALS: SpotlightTestimonial[] = [
  {
    name: "Sarah Johnson",
    subtitle: "Frontend developer",
    quote:
      "It changed how I build interfaces. The motion is calm, the components are well designed, and the documentation is excellent.",
  },
  {
    name: "Michael Chen",
    subtitle: "Product designer",
    quote:
      "The quality shows on every screen. Transitions feel natural and the API is exactly what I expected.",
  },
  {
    name: "Emily Rodriguez",
    subtitle: "Full-stack developer",
    quote:
      "Easy to customise. I get polished, animated interfaces without hours of implementation detail.",
  },
  {
    name: "David Kim",
    subtitle: "Product engineer",
    quote:
      "It balances looks and performance. Fast to load, accessible by default, and good-looking.",
  },
  {
    name: "Lisa Anderson",
    subtitle: "Creative director",
    quote:
      "Stepping through the stacked cards makes reading feedback feel deliberate, not hurried.",
  },
];

export interface TestimonialSpotlightBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  testimonials?: SpotlightTestimonial[];
  /** Controlled index of the testimonial in front. */
  index?: number;
  /** Initial testimonial in front when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Accessible name of the carousel. */
  carouselLabel?: string;
  /** The carousel's visible and accessible text, for localisation. */
  labels?: Partial<ReviewsCarouselLabels>;
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join("");
}

/** A heading beside one testimonial at a time, stepped through with previous and next. */
export function TestimonialSpotlightBlock({
  heading = "What people are saying",
  description = "Thousands of teams build faster, more polished interfaces with it. Here is what a few of them say.",
  testimonials = DEFAULT_SPOTLIGHT_TESTIMONIALS,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  carouselLabel = "Testimonials",
  labels,
  headingLevel = 2,
  className,
  ...props
}: TestimonialSpotlightBlockProps) {
  const headingId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultIndex);
  const active = indexProp ?? uncontrolled;
  const Heading = `h${String(headingLevel)}` as "h2";

  function handleIndexChange(next: number) {
    if (indexProp === undefined) setUncontrolled(next);
    onIndexChange?.(next);
  }

  const reviews = testimonials.map((testimonial, position) => ({
    id: testimonial.id ?? testimonial.name,
    body: (
      <TextEffect
        by="word"
        preset="soft-blur-in"
        stagger={20}
        duration={200}
        // Replays each time this testimonial comes to the front.
        replayKey={position === active ? `front-${String(active)}` : "behind"}
        className="text-base text-foreground md:text-lg"
      >
        {testimonial.quote}
      </TextEffect>
    ),
    author: testimonial.name,
    title: testimonial.subtitle,
    avatar: (
      <Avatar size="sm" aria-hidden="true" className="ring-1 ring-foreground/10">
        {testimonial.avatarSrc ? <AvatarImage src={testimonial.avatarSrc} alt="" /> : null}
        <AvatarFallback>{initials(testimonial.name)}</AvatarFallback>
      </Avatar>
    ),
  }));

  return (
    <section
      aria-labelledby={headingId}
      data-slot="testimonial-spotlight"
      className={cn("w-full bg-muted py-16 md:py-24", className)}
      {...props}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col justify-center">
          <Heading
            id={headingId}
            className="mb-4 text-4xl font-semibold tracking-tight text-balance text-foreground"
          >
            {heading}
          </Heading>
          {description ? (
            <p className="text-lg text-balance text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <ReviewsCarousel
          reviews={reviews}
          index={active}
          onIndexChange={handleIndexChange}
          loop
          showIndicators={false}
          aria-label={carouselLabel}
          labels={{ previous: "Previous testimonial", next: "Next testimonial", ...labels }}
          className="h-96 max-w-xl"
        />
      </div>
    </section>
  );
}
