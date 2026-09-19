"use client";

// Ported from SmoothUI Logo Cloud 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { Marquee } from "@/components/marquee";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A heading over an endless row of large, linked logos that pop in one after
 * another and tilt when hovered.
 *
 * The loop is Dowel's Marquee: the source renders the row three times and
 * animates it from JavaScript, and its copies are all focusable links, so a
 * keyboard user tabs through every logo three times. Marquee renders the
 * links once for assistive technology, pauses on hover and focus, and stops
 * under reduced motion. Anything that moves for more than five seconds needs a
 * way to stop it (WCAG 2.2.2), so the block adds a visible pause button.
 *
 * The entrances are @starting-style transitions: CSS only, never hidden
 * without JavaScript, and instant under reduced motion.
 */

const PREFIX = "dowel-logo-links-marquee";

const STYLES = `
[data-slot=logo-links-marquee-header],[data-slot=logo-links-marquee-item]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint),scale var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1))}
@starting-style{[data-slot=logo-links-marquee-header]{opacity:0;translate:0 20px}[data-slot=logo-links-marquee-item]{opacity:0;scale:.8}}
`;

export interface LogoLinksMarqueeLogo {
  /** The organisation's name — the accessible name of the entry. */
  name: string;
  /** An SVG or image. Decorative: the name is announced instead. */
  logo?: ReactNode;
  /** Makes the entry a link. */
  href?: string;
}

export const DEFAULT_MARQUEE_LINKS: LogoLinksMarqueeLogo[] = [
  { name: "Lumen" },
  { name: "Halcyon" },
  { name: "Meridian" },
  { name: "Tessera" },
  { name: "Quarry" },
  { name: "Oakline" },
  { name: "Brightwell" },
  { name: "Solace" },
];

export interface LogoLinksMarqueeLabels {
  pause: string;
  play: string;
}

export interface LogoLinksMarqueeBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  logos?: LogoLinksMarqueeLogo[];
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Scroll speed in pixels per second. */
  speed?: number;
  /** Text of the pause control in each state. */
  labels?: Partial<LogoLinksMarqueeLabels>;
}

function Mark({ name, logo }: LogoLinksMarqueeLogo) {
  return (
    <span
      data-slot="logo-links-marquee-mark"
      className="inline-flex transition-[scale,rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)] group-hover:scale-110 group-hover:rotate-3"
    >
      {logo === undefined ? (
        <span className="text-2xl font-semibold tracking-tight">{name}</span>
      ) : (
        <>
          <span className="sr-only">{name}</span>
          <span aria-hidden="true" className="contents *:fill-current">
            {logo}
          </span>
        </>
      )}
    </span>
  );
}

/** A heading over an endless row of linked logos, with a pause control. */
export function LogoLinksMarqueeBlock({
  heading = "Trusted by the world's most innovative teams",
  description = "Join thousands of developers and designers already building with us.",
  logos = DEFAULT_MARQUEE_LINKS,
  headingLevel = 2,
  speed = 40,
  labels,
  className,
  ...props
}: LogoLinksMarqueeBlockProps) {
  const headingId = useId();
  const [paused, setPaused] = useState(false);
  const Heading = `h${String(headingLevel)}` as "h2";
  const text = { pause: "Pause logos", play: "Play logos", ...labels };

  return (
    <section
      aria-labelledby={headingId}
      data-slot="logo-links-marquee"
      className={cn(
        "mx-auto w-full max-w-7xl overflow-hidden px-4 py-16 sm:px-6 md:py-20",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div data-slot="logo-links-marquee-header" className="mb-12 text-center md:mb-16">
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
        speed={speed}
        paused={paused}
        gap={32}
        style={{
          maskImage:
            "linear-gradient(to right, transparent, var(--color-foreground) 20%, var(--color-foreground) 80%, transparent)",
        }}
      >
        <ul className="flex items-center gap-8">
          {logos.map((entry, index) => (
            <li
              key={entry.name}
              data-slot="logo-links-marquee-item"
              style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
              className="flex shrink-0 text-foreground"
            >
              {entry.href ? (
                <a
                  href={entry.href}
                  className={cn("group inline-flex rounded-md p-6", focusRing)}
                >
                  <Mark {...entry} />
                </a>
              ) : (
                <span className="group inline-flex p-6">
                  <Mark {...entry} />
                </span>
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
