"use client";

// Ported from SmoothUI Stats 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { Card } from "@/components/card";
import { NumberFlow } from "@/components/number-flow";
import { cn } from "@/lib/utils";

/*
 * A heading over a row of big numbers, each with a label and a line of
 * context.
 *
 * The source fades each card up and springs its figure from half size as the
 * row scrolls into view. Here the cards do the same in CSS, and the figures
 * are Dowel's NumberFlow, rolling up from zero to their value — so a number
 * is a number (formatted by Intl for the reader's locale) rather than a
 * pre-formatted string. A string value ("24/7") is shown as it is.
 *
 * A stat is data, not a heading: the grid is a description list, label as
 * the term and figure as the definition, with the figure drawn first. The
 * figure's rolling digits are hidden from assistive technology, which reads
 * the settled value once — never the zero the roll starts from.
 *
 * Only a row that starts below the fold is held back to animate; one already
 * on screen, without IntersectionObserver or under reduced motion shows its
 * values at once.
 */

const PREFIX = "dowel-stats-grid";

const STYLES = `
[data-slot=stats-grid][data-reveal] [data-slot=stats-grid-item]{--${PREFIX}-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1));transition:opacity var(--duration-slower) var(--ease-out-quint) var(--${PREFIX}-delay),translate var(--duration-slower) var(--ease-out-quint) var(--${PREFIX}-delay),border-color var(--duration-normal) var(--ease-out-quint),box-shadow var(--duration-normal) var(--ease-out-quint)}
[data-slot=stats-grid][data-reveal=pending] [data-slot=stats-grid-item]{opacity:0;translate:0 30px}
[data-slot=stats-grid][data-reveal] [data-slot=stats-grid-value]{transition:scale var(--duration-slower) var(--ease-overshoot);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1) + 200ms * var(--motion-scale,1))}
[data-slot=stats-grid][data-reveal=pending] [data-slot=stats-grid-value]{scale:.5}
`;

export interface StatsGridStat {
  label: string;
  /** A number rolls up from zero as it scrolls in; a string is shown as it is. */
  value: number | string;
  /** Intl.NumberFormat options for a numeric value, e.g. `{ notation: "compact" }`. */
  format?: Intl.NumberFormatOptions;
  /** Text before the figure, e.g. "$". */
  prefix?: string;
  /** Text after the figure, e.g. "+" or "%". */
  suffix?: string;
  description?: ReactNode;
}

export const DEFAULT_GRID_STATS: StatsGridStat[] = [
  {
    label: "Active users",
    value: 10_000_000,
    format: { notation: "compact" },
    suffix: "+",
    description: "Growing every day",
  },
  {
    label: "Uptime",
    value: 99.9,
    format: { minimumFractionDigits: 1 },
    suffix: "%",
    description: "Reliable service",
  },
  { label: "Countries", value: 150, suffix: "+", description: "Worldwide reach" },
  { label: "Support", value: "24/7", description: "Always here to help" },
];

export interface StatsGridBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  heading?: ReactNode;
  description?: ReactNode;
  stats?: StatsGridStat[];
  /** Level of the section heading. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Locale for number formatting. Defaults to the reader's. */
  locales?: Intl.LocalesArgument;
}

type Reveal = "static" | "pending" | "shown";

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Hides the content only if it starts below the fold, and shows it once it scrolls in. */
function useReveal<T extends HTMLElement>(ref: Ref<T> | undefined) {
  const node = useRef<T | null>(null);
  const [reveal, setReveal] = useState<Reveal>("static");

  useEffect(() => {
    const element = node.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    if (prefersReducedMotion()) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setReveal("pending");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setReveal("shown");
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const setRef = useCallback(
    (element: T | null) => {
      node.current = element;
      assignRef(ref, element);
    },
    [ref],
  );

  return [setRef, reveal] as const;
}

/** The figure: rolling digits for sight, the settled value for assistive technology. */
function Figure({
  stat,
  locales,
  pending,
}: {
  stat: StatsGridStat;
  locales: Intl.LocalesArgument;
  pending: boolean;
}) {
  if (typeof stat.value === "string") {
    return <>{`${stat.prefix ?? ""}${stat.value}${stat.suffix ?? ""}`}</>;
  }
  const settled = new Intl.NumberFormat(locales, stat.format).format(stat.value);
  return (
    <>
      <span className="sr-only">{`${stat.prefix ?? ""}${settled}${stat.suffix ?? ""}`}</span>
      <span aria-hidden="true">
        {stat.prefix}
        <NumberFlow value={pending ? 0 : stat.value} format={stat.format} locales={locales} />
        {stat.suffix}
      </span>
    </>
  );
}

/** A heading over a row of big figures, each rolling up as it scrolls into view. */
export function StatsGridBlock({
  heading = "Our impact in numbers",
  description = "See how we're making a difference across the globe",
  stats = DEFAULT_GRID_STATS,
  headingLevel = 2,
  locales,
  className,
  ref,
  ...props
}: StatsGridBlockProps) {
  const headingId = useId();
  const [setRef, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      ref={setRef}
      aria-labelledby={headingId}
      data-slot="stats-grid"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mb-12 text-center md:mb-16">
        <Heading
          id={headingId}
          className="mb-4 text-3xl font-bold tracking-tight text-balance lg:text-4xl"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="mx-auto max-w-2xl text-lg text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {stats.map((stat, index) => (
          <Card
            key={stat.label}
            data-slot="stats-grid-item"
            style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
            className={cn(
              "relative overflow-hidden rounded-2xl p-8 text-center shadow-none",
              "transition-[border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:border-primary hover:shadow-lg",
              // The hover wash, as a pseudo-element: a description list may hold only terms and definitions.
              "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-primary/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-[var(--duration-normal)] hover:before:opacity-100",
            )}
          >
            <dt className="relative order-2 mb-2 text-lg font-semibold">{stat.label}</dt>
            <dd
              data-slot="stats-grid-value"
              className="relative order-1 mb-2 text-4xl font-bold tracking-tight text-primary tabular-nums lg:text-5xl"
            >
              <Figure stat={stat} locales={locales} pending={reveal === "pending"} />
            </dd>
            {stat.description ? (
              <dd className="relative order-3 text-sm text-muted-foreground">
                {stat.description}
              </dd>
            ) : null}
          </Card>
        ))}
      </dl>
    </section>
  );
}
