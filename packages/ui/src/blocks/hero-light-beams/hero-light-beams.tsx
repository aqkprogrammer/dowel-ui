"use client";

// Original design.
import { useId, type ComponentPropsWithRef } from "react";

import { Button } from "@/components/button";
import { LightBeams } from "@/components/light-beams";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A centred hero under a fan of light: an announcement pill, the headline,
 * a line of copy and two actions, lit from above by LightBeams.
 *
 * The beams are CSS only — no canvas, no script — so the hero renders on the
 * server and costs nothing to hydrate. They are decoration (aria-hidden
 * inside LightBeams) and hold still under reduced motion. The copy sits on
 * the page's own background colour, so contrast is the theme's, not the
 * light's.
 */

export interface HeroLightBeamsAction {
  label: string;
  href: string;
}

export interface HeroLightBeamsBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** A short announcement above the headline, as a link. `null` hides it. */
  announcement?: HeroLightBeamsAction | null;
  /** The headline. */
  title?: string;
  description?: string;
  /** The main call to action. `null` hides it. */
  primaryAction?: HeroLightBeamsAction | null;
  /** The quieter call to action. `null` hides it. */
  secondaryAction?: HeroLightBeamsAction | null;
  /** The headline's level, so the block fits any page outline. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Beam colour: a token or any CSS colour. Default "primary". */
  beamColor?: string;
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4", mirrorForDirection, className)}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** A centred hero lit from above by a fan of light beams. */
export function HeroLightBeamsBlock({
  announcement = { label: "New: voice input for every assistant", href: "#" },
  title = "Interfaces that feel lit from within",
  description = "Accessible components and blocks you install as source — themed, motion-aware and ready for production.",
  primaryAction = { label: "Get started", href: "#" },
  secondaryAction = { label: "Browse components", href: "#" },
  headingLevel = 1,
  beamColor = "primary",
  className,
  ...props
}: HeroLightBeamsBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;

  return (
    <section
      aria-labelledby={headingId}
      data-slot="hero-light-beams"
      className={cn("relative isolate overflow-hidden bg-background", className)}
      {...props}
    >
      <LightBeams
        origin="top"
        rays={9}
        spread={80}
        color={beamColor}
        intensity={0.7}
        className="px-4 pt-28 pb-24 sm:px-6 md:pt-40 md:pb-32"
      >
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          {announcement ? (
            <a
              href={announcement.href}
              data-slot="hero-light-beams-announcement"
              className={cn(
                "group inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-sm text-foreground backdrop-blur transition-colors hover:border-primary/50",
                focusRing,
              )}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {announcement.label}
              <Arrow className="size-3.5 text-muted-foreground transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </a>
          ) : null}
          <Heading
            id={headingId}
            className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl"
          >
            {title}
          </Heading>
          {description ? (
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
          {primaryAction || secondaryAction ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              {primaryAction ? (
                <Button asChild size="lg" className="group">
                  <a href={primaryAction.href}>
                    {primaryAction.label}
                    <Arrow className="transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </a>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button asChild size="lg" variant="outline">
                  <a href={secondaryAction.href}>{secondaryAction.label}</a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </LightBeams>
    </section>
  );
}
