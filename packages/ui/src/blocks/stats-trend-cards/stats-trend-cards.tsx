"use client";

// Ported from SmoothUI Stats 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { NumberFlow } from "@/components/number-flow";
import { cn } from "@/lib/utils";

/*
 * Metric cards: an icon, a big figure, a label, a line of context and a trend.
 *
 * The source colours its trend green for up and red for down, as if a rise is
 * always good news — and says nothing in words. Here the trend is a number,
 * `polarity` decides whether a rise is good (churn and cost going up are
 * not), and the direction is stated in text: "up 12%", never only an arrow
 * and a colour (ADR 0011).
 *
 * Figures are Dowel's NumberFlow, rolling up from zero as the row scrolls in;
 * the rolling digits are hidden and the settled value is read once. Cards
 * rise in, icons untwist and trends slide in from the inline start — all CSS
 * transitions on one `data-reveal` state, and only for a row that starts below
 * the fold.
 */

const PREFIX = "dowel-stats-trend-cards";

const STYLES = `
[data-slot=stats-trend-cards]{--${PREFIX}-sign:1}
[data-slot=stats-trend-cards]:dir(rtl){--${PREFIX}-sign:-1}
[data-slot=stats-trend-cards][data-reveal] [data-slot=stats-trend-cards-item]{--${PREFIX}-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1));transition:opacity var(--duration-slower) var(--ease-out-quint) var(--${PREFIX}-delay),translate var(--duration-slower) var(--ease-out-quint) var(--${PREFIX}-delay),scale var(--duration-normal) var(--ease-out-quint),border-color var(--duration-normal) var(--ease-out-quint),box-shadow var(--duration-normal) var(--ease-out-quint)}
[data-slot=stats-trend-cards][data-reveal=pending] [data-slot=stats-trend-cards-item]{opacity:0;translate:0 30px}
[data-slot=stats-trend-cards][data-reveal] [data-slot=stats-trend-cards-icon]{transition:rotate var(--duration-slower) var(--ease-overshoot),scale var(--duration-slower) var(--ease-overshoot);transition-delay:calc(var(--${PREFIX}-delay) + 200ms * var(--motion-scale,1))}
[data-slot=stats-trend-cards][data-reveal=pending] [data-slot=stats-trend-cards-icon]{rotate:-10deg;scale:.8}
[data-slot=stats-trend-cards][data-reveal] [data-slot=stats-trend-cards-trend]{transition:opacity var(--duration-slow) var(--ease-out-quint),translate var(--duration-slow) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-delay) + 500ms * var(--motion-scale,1))}
[data-slot=stats-trend-cards][data-reveal=pending] [data-slot=stats-trend-cards-trend]{opacity:0;translate:calc(-10px * var(--${PREFIX}-sign)) 0}
`;

export type TrendPolarity = "higher-is-better" | "lower-is-better" | "neutral";

export interface StatTrend {
  /** Relative change as a fraction: 0.12 is up 12%, -0.05 is down 5%. */
  change: number;
  /** Whether a rise is good news. Defaults to higher-is-better. */
  polarity?: TrendPolarity;
}

export interface StatsTrendCard {
  label: string;
  value: number;
  /** Intl.NumberFormat options, e.g. `{ notation: "compact" }`. */
  format?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
  description?: ReactNode;
  /** Decorative: rendered aria-hidden. */
  icon?: ReactNode;
  trend?: StatTrend;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8"
    >
      <path d={d} />
    </svg>
  );
}

export const DEFAULT_TREND_CARDS: StatsTrendCard[] = [
  {
    label: "Revenue",
    value: 2_500_000,
    format: { notation: "compact", maximumFractionDigits: 1 },
    prefix: "$",
    description: "Annual recurring revenue",
    icon: <Glyph d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
    trend: { change: 0.12 },
  },
  {
    label: "Customers",
    value: 45_000,
    format: { notation: "compact" },
    description: "Happy customers worldwide",
    icon: (
      <Glyph d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3a4 4 0 0 1 0 8m6 10a7 7 0 0 0-4-6.3" />
    ),
    trend: { change: 0.08 },
  },
  {
    label: "Satisfaction",
    value: 98,
    suffix: "%",
    description: "Customer satisfaction rate",
    icon: <Glyph d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
    trend: { change: 0.02 },
  },
  {
    label: "Downloads",
    value: 1_200_000,
    format: { notation: "compact", maximumFractionDigits: 1 },
    description: "Total app downloads",
    icon: (
      <Glyph d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm5 16h.01" />
    ),
    trend: { change: 0.15 },
  },
];

export interface StatsTrendCardsBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  stats?: StatsTrendCard[];
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

function Trend({ trend, locales }: { trend: StatTrend; locales: Intl.LocalesArgument }) {
  const { change, polarity = "higher-is-better" } = trend;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "unchanged";
  const improved = polarity === "higher-is-better" ? change > 0 : change < 0;
  const variant =
    change === 0 || polarity === "neutral" ? "secondary" : improved ? "success" : "destructive";
  const percent = new Intl.NumberFormat(locales, {
    style: "percent",
    maximumFractionDigits: 1,
  });

  return (
    <Badge
      data-slot="stats-trend-cards-trend"
      data-direction={direction}
      variant={variant}
      className="tabular-nums"
    >
      <span aria-hidden="true">
        {change > 0 ? "↑ +" : change < 0 ? "↓ −" : "→ "}
        {percent.format(Math.abs(change))}
      </span>
      <span className="sr-only">
        {direction === "unchanged"
          ? direction
          : `${direction} ${percent.format(Math.abs(change))}`}
      </span>
    </Badge>
  );
}

/** Metric cards with an icon, a rolling figure and a trend stated in words. */
export function StatsTrendCardsBlock({
  heading = "Key metrics",
  description = "Track your success with these important numbers",
  stats = DEFAULT_TREND_CARDS,
  headingLevel = 2,
  locales,
  className,
  ref,
  ...props
}: StatsTrendCardsBlockProps) {
  const headingId = useId();
  const [setRef, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      ref={setRef}
      aria-labelledby={headingId}
      data-slot="stats-trend-cards"
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
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const settled = new Intl.NumberFormat(locales, stat.format).format(stat.value);
          return (
            <Card
              key={stat.label}
              data-slot="stats-trend-cards-item"
              style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
              className={cn(
                "relative items-start overflow-hidden rounded-2xl p-6 shadow-none",
                "transition-[scale,border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:scale-105 hover:border-primary hover:shadow-xl",
                // The hover wash, as a pseudo-element: a description list may hold only terms and definitions.
                "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-primary/10 before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-[var(--duration-normal)] hover:before:opacity-100",
              )}
            >
              <dt className="relative order-3 mb-2 text-sm font-semibold tracking-wide uppercase">
                {stat.label}
              </dt>
              {stat.icon ? (
                <dd
                  aria-hidden="true"
                  data-slot="stats-trend-cards-icon"
                  className="relative order-1 mb-4 text-foreground"
                >
                  {stat.icon}
                </dd>
              ) : null}
              <dd className="relative order-2 mb-1 text-2xl font-bold tracking-tight tabular-nums lg:text-3xl">
                <span className="sr-only">{`${stat.prefix ?? ""}${settled}${stat.suffix ?? ""}`}</span>
                <span aria-hidden="true">
                  {stat.prefix}
                  <NumberFlow
                    value={reveal === "pending" ? 0 : stat.value}
                    format={stat.format}
                    locales={locales}
                  />
                  {stat.suffix}
                </span>
              </dd>
              {stat.description ? (
                <dd className="relative order-4 mb-3 text-xs text-muted-foreground">
                  {stat.description}
                </dd>
              ) : null}
              {stat.trend ? (
                <dd className="relative order-5">
                  <Trend trend={stat.trend} locales={locales} />
                </dd>
              ) : null}
            </Card>
          );
        })}
      </dl>
    </section>
  );
}
