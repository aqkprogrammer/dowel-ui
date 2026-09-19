"use client";

// Ported from SmoothUI Features 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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
import { cn } from "@/lib/utils";

/*
 * A bento grid of features: one lead cell two columns by two rows, with a
 * visual, and smaller cells around it.
 *
 * The source scales each cell up from 95% as it scrolls into view, staggered,
 * and grows the lead cell's bars from the baseline. Both are CSS transitions
 * here, keyed off one `data-reveal` state on the section. Only a grid that
 * starts below the fold is hidden first, and never under reduced motion or
 * without IntersectionObserver.
 */

const PREFIX = "dowel-features-bento";

const STYLES = `
[data-slot=features-bento][data-reveal] [data-slot=features-bento-list]>li{transition:opacity var(--duration-slower) var(--ease-out-quint),scale var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 50ms * var(--motion-scale,1))}
[data-slot=features-bento][data-reveal=pending] [data-slot=features-bento-list]>li{opacity:0;scale:.95}
[data-slot=features-bento][data-reveal] [data-slot=features-bento-bar]{transition:scale var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 30ms * var(--motion-scale,1) + 150ms * var(--motion-scale,1))}
[data-slot=features-bento][data-reveal=pending] [data-slot=features-bento-bar]{scale:1 0}
`;

export interface BentoFeature {
  title: string;
  description: ReactNode;
  /** Something to look at above the text. Makes the cell the two-by-two lead. */
  visual?: ReactNode;
}

export interface BentoAnalyticsPanelProps extends ComponentPropsWithRef<"div"> {
  label?: string;
  /** The headline figure, already formatted. */
  value?: string;
  /** The change, already formatted and signed, e.g. "+12.4%". */
  change?: string;
  /** Bar heights as percentages of the tallest. The tallest bar is highlighted. */
  series?: number[];
}

const SERIES = [38, 52, 44, 66, 58, 74, 62, 88, 71, 96, 84, 100];

/**
 * The lead cell's default visual: a small analytics panel drawn in markup on
 * the page's own tokens, so it follows the theme and stays sharp.
 */
export function BentoAnalyticsPanel({
  label = "Revenue this month",
  value = "$48,219",
  change = "+12.4%",
  series = SERIES,
  className,
  ...props
}: BentoAnalyticsPanelProps) {
  const peak = Math.max(...series);

  return (
    <div
      data-slot="features-bento-panel"
      className={cn(
        "flex h-full flex-col gap-4 rounded-xl border bg-background p-5",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
        </p>
        <Badge variant="secondary" className="tabular-nums">
          {change}
        </Badge>
      </div>
      <div aria-hidden="true" className="flex min-h-16 flex-1 items-end gap-1.5 sm:gap-2">
        {series.map((height, index) => (
          <span
            key={index}
            data-slot="features-bento-bar"
            className={cn(
              "flex-1 origin-bottom rounded-t-sm",
              height === peak ? "bg-foreground" : "bg-foreground/15",
            )}
            style={
              { height: `${String(height)}%`, [`--${PREFIX}-index`]: index } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

export const DEFAULT_BENTO_FEATURES: BentoFeature[] = [
  {
    title: "Smart analytics",
    description: "A real-time dashboard with the metrics you choose.",
    visual: <BentoAnalyticsPanel />,
  },
  {
    title: "Team collaboration",
    description: "Comment and share in real time.",
  },
  { title: "API first", description: "A documented API with SDKs." },
  { title: "Global CDN", description: "Fast delivery from edge locations." },
  { title: "Security", description: "Encryption and audit trails by default." },
];

export interface FeaturesBentoBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  features?: BentoFeature[];
  /** Level of the section heading; each feature title is one level below. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
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

/** A bento grid of features with a lead cell that carries a visual. */
export function FeaturesBentoBlock({
  heading = "Built for modern teams",
  description = "A complete platform with everything you need to ship faster.",
  features = DEFAULT_BENTO_FEATURES,
  headingLevel = 2,
  className,
  ref,
  ...props
}: FeaturesBentoBlockProps) {
  const headingId = useId();
  const [setRef, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";
  const ItemHeading = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";

  return (
    <section
      ref={setRef}
      aria-labelledby={headingId}
      data-slot="features-bento"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
        <Heading
          id={headingId}
          className="text-3xl font-bold tracking-tight text-balance md:text-4xl"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="mt-4 text-lg text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ul
        data-slot="features-bento-list"
        className="grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4"
      >
        {features.map((feature, index) => {
          const lead = feature.visual !== undefined;
          return (
            <li
              key={feature.title}
              data-lead={lead || undefined}
              style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
              className={cn("flex", lead && "sm:col-span-2 sm:row-span-2")}
            >
              <Card
                data-slot="features-bento-item"
                className={cn(
                  "w-full justify-end gap-1 overflow-hidden p-6 shadow-none",
                  lead && "bg-muted",
                )}
              >
                {lead ? (
                  <div className="-mx-6 -mt-6 mb-3 flex min-h-48 flex-1 flex-col">
                    {feature.visual}
                  </div>
                ) : null}
                <ItemHeading className="font-semibold">{feature.title}</ItemHeading>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
