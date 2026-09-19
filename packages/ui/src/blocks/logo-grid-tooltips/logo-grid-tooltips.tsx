"use client";

// Ported from SmoothUI Logo Cloud 4 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A panel of logos in grayscale that lift into colour on hover, each naming
 * itself in a tooltip.
 *
 * The source hand-builds its tooltip and its hover state in JavaScript, and
 * only for pointer devices — a keyboard user tabbing to a linked logo got no
 * name and no highlight. Here the tooltip is Dowel's Tooltip, which opens on
 * focus as well as hover, and the lift and colour are CSS on `:hover` and
 * `:focus-visible` alike. The tooltip only repeats the name that is already
 * the entry's accessible name, as a tooltip must.
 */

/** Columns at the widest breakpoint; always two on the narrowest screens. */
const logoGridVariants = cva(
  "grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4",
  {
    variants: {
      columns: {
        3: "sm:grid-cols-3",
        4: "sm:grid-cols-4",
        5: "sm:grid-cols-3 lg:grid-cols-5",
        6: "sm:grid-cols-3 lg:grid-cols-6",
      },
    },
    defaultVariants: { columns: 4 },
  },
);

export interface LogoGridLogo {
  /** The organisation's name — the accessible name, and the tooltip. */
  name: string;
  /** An SVG or image. Decorative: the name is announced instead. */
  logo?: ReactNode;
  /** Makes the entry a link. */
  href?: string;
}

export const DEFAULT_GRID_LOGOS: LogoGridLogo[] = [
  { name: "Lumen" },
  { name: "Halcyon" },
  { name: "Meridian" },
  { name: "Tessera" },
  { name: "Quarry" },
  { name: "Oakline" },
  { name: "Brightwell" },
  { name: "Solace" },
];

export interface LogoGridTooltipsBlockProps
  extends
    Omit<ComponentPropsWithRef<"section">, "title">,
    VariantProps<typeof logoGridVariants> {
  heading?: ReactNode;
  description?: ReactNode;
  logos?: LogoGridLogo[];
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const entryStyles =
  "group flex items-center justify-center rounded-lg p-6 text-foreground transition-[translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:-translate-y-1 focus-visible:-translate-y-1";

function Mark({ name, logo }: LogoGridLogo) {
  return (
    <span
      data-slot="logo-grid-tooltips-mark"
      className="inline-flex opacity-60 grayscale transition-[opacity,filter] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
    >
      {logo === undefined ? (
        <span className="text-xl font-semibold tracking-tight">{name}</span>
      ) : (
        <>
          <span className="sr-only">{name}</span>
          <span aria-hidden="true" className="contents">
            {logo}
          </span>
        </>
      )}
    </span>
  );
}

/** A panel of grayscale logos that colour, lift and name themselves on hover or focus. */
export function LogoGridTooltipsBlock({
  heading = "Trusted by innovative companies",
  description = "Leading organisations rely on our platform to power their success",
  logos = DEFAULT_GRID_LOGOS,
  headingLevel = 2,
  columns,
  className,
  ...props
}: LogoGridTooltipsBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="logo-grid-tooltips"
      className={cn("mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20", className)}
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
      <TooltipProvider delayDuration={0}>
        <ul data-slot="logo-grid-tooltips-list" className={logoGridVariants({ columns })}>
          {logos.map((entry) => (
            <li key={entry.name} className="flex flex-col">
              <Tooltip>
                <TooltipTrigger asChild>
                  {entry.href ? (
                    <a href={entry.href} className={cn(entryStyles, focusRing)}>
                      <Mark {...entry} />
                    </a>
                  ) : (
                    <span className={entryStyles}>
                      <Mark {...entry} />
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent>{entry.name}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </TooltipProvider>
    </section>
  );
}

export { logoGridVariants };
