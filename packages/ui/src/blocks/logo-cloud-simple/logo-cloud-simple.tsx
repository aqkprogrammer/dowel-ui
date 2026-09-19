"use client";

// Ported from SmoothUI Logo Cloud 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A heading, a line of copy and a still grid of logos, dimmed until hovered.
 *
 * Logos are props: the source ships a dozen real companies' marks, which a
 * library cannot redistribute. Without a `logo` each entry is drawn as a
 * plain wordmark of its name, so the block still renders out of the box.
 */

export interface LogoCloudSimpleLogo {
  /** The organisation's name — the accessible name of the entry. */
  name: string;
  /** An SVG or image. Decorative: the name is announced instead. */
  logo?: ReactNode;
  /** Makes the entry a link. */
  href?: string;
}

export const DEFAULT_CLOUD_LOGOS: LogoCloudSimpleLogo[] = [
  { name: "Lumen" },
  { name: "Halcyon" },
  { name: "Meridian" },
  { name: "Tessera" },
];

export interface LogoCloudSimpleBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  logos?: LogoCloudSimpleLogo[];
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

function Mark({ name, logo }: LogoCloudSimpleLogo) {
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

/** A still grid of customer logos under a heading. */
export function LogoCloudSimpleBlock({
  heading = "You're in good company",
  description = "Trusted by leading teams from around the world",
  logos = DEFAULT_CLOUD_LOGOS,
  headingLevel = 2,
  className,
  ...props
}: LogoCloudSimpleBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="logo-cloud-simple"
      className={cn("mx-auto w-full max-w-5xl px-4 py-16 sm:px-6", className)}
      {...props}
    >
      <div className="mx-auto mb-12 max-w-xl text-center text-balance md:mb-16">
        <Heading id={headingId} className="text-3xl font-semibold tracking-tight md:text-4xl">
          {heading}
        </Heading>
        {description ? (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 items-center gap-8 md:grid-cols-4">
        {logos.map((entry) => (
          <li
            key={entry.name}
            data-slot="logo-cloud-simple-item"
            className="flex items-center justify-center text-foreground opacity-60 transition-opacity duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] focus-within:opacity-100 hover:opacity-100"
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
    </section>
  );
}
