"use client";

// Ported from SmoothUI Logo Cloud 3 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Button } from "@/components/button";
import { Marquee } from "@/components/marquee";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A heading over a quiet, dimmed marquee of logos with a set speed and
 * direction.
 *
 * The source writes its own keyframes and a second copy of the row; Dowel's
 * Marquee already does both, and adds what the source lacks — one copy for
 * assistive technology, pausing on focus as well as hover, mirroring for
 * right-to-left pages. A visible pause button satisfies WCAG 2.2.2.
 *
 * `direction: "left" | "right"` becomes `reverse`, because in a right-to-left
 * page the default run is toward the right: Marquee runs toward the inline
 * start, and `reverse` toward the end.
 */

/** Pixels per second for each named speed (the source's 60s, 40s and 20s loops). */
const SPEEDS = { slow: 25, normal: 45, fast: 90 } as const;

export interface LogoMarqueeLogo {
  /** The organisation's name — the accessible name of the entry. */
  name: string;
  /** An SVG or image. Decorative: the name is announced instead. */
  logo?: ReactNode;
  /** Makes the entry a link. */
  href?: string;
}

export const DEFAULT_MARQUEE_LOGOS: LogoMarqueeLogo[] = [
  { name: "Lumen" },
  { name: "Halcyon" },
  { name: "Meridian" },
  { name: "Tessera" },
  { name: "Quarry" },
  { name: "Oakline" },
  { name: "Brightwell" },
  { name: "Solace" },
];

export interface LogoMarqueeLabels {
  pause: string;
  play: string;
}

export interface LogoMarqueeBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  heading?: ReactNode;
  description?: ReactNode;
  logos?: LogoMarqueeLogo[];
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  speed?: keyof typeof SPEEDS;
  /** Runs toward the inline end instead of the start. */
  reverse?: boolean;
  /** Pauses while hovered or while focus is inside. */
  pauseOnHover?: boolean;
  /** Text of the pause control in each state. */
  labels?: Partial<LogoMarqueeLabels>;
}

function Mark({ name, logo }: LogoMarqueeLogo) {
  if (logo === undefined) {
    return <span className="text-xl font-semibold tracking-tight">{name}</span>;
  }
  return (
    <>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true" className="contents *:fill-current">
        {logo}
      </span>
    </>
  );
}

/** A heading over a dimmed, endlessly scrolling row of logos. */
export function LogoMarqueeBlock({
  heading = "Trusted by industry leaders",
  description = "Join thousands of companies already using our platform",
  logos = DEFAULT_MARQUEE_LOGOS,
  headingLevel = 2,
  speed = "normal",
  reverse = false,
  pauseOnHover = true,
  labels,
  className,
  ...props
}: LogoMarqueeBlockProps) {
  const headingId = useId();
  const [paused, setPaused] = useState(false);
  const Heading = `h${String(headingLevel)}` as "h2";
  const text = { pause: "Pause logos", play: "Play logos", ...labels };

  return (
    <section
      aria-labelledby={headingId}
      data-slot="logo-marquee"
      className={cn(
        "mx-auto w-full max-w-7xl overflow-hidden px-4 py-16 sm:px-6 md:py-20",
        className,
      )}
      {...props}
    >
      <div className="mb-12 text-center">
        <Heading
          id={headingId}
          className="mb-4 text-2xl font-bold tracking-tight text-balance lg:text-3xl"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="text-lg text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Marquee
        speed={SPEEDS[speed]}
        reverse={reverse}
        paused={paused}
        pauseOnHover={pauseOnHover}
        gap={0}
        style={{
          maskImage:
            "linear-gradient(to right, transparent, var(--color-foreground) 10%, var(--color-foreground) 90%, transparent)",
        }}
      >
        <ul className="flex items-center">
          {logos.map((entry) => (
            <li
              key={entry.name}
              data-slot="logo-marquee-item"
              className="flex shrink-0 items-center justify-center px-8 py-4 text-foreground opacity-60 transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] focus-within:opacity-100 hover:opacity-100"
            >
              {entry.href ? (
                <a href={entry.href} className={cn("inline-flex rounded-sm", focusRing)}>
                  <Mark {...entry} />
                </a>
              ) : (
                <Mark {...entry} />
              )}
            </li>
          ))}
        </ul>
      </Marquee>
      <div className="mt-4 flex justify-center motion-reduce:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setPaused((value) => !value);
          }}
        >
          {paused ? text.play : text.pause}
        </Button>
      </div>
    </section>
  );
}
