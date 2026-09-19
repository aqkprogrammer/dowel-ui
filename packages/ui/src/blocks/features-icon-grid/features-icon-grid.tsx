"use client";

// Ported from SmoothUI Features 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
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
import { cn } from "@/lib/utils";

/*
 * A grid of feature cards, each an icon, a title and a sentence.
 *
 * The source springs each card up out of the page as it scrolls into view,
 * staggered by position, and lifts a card on hover. Here that is two CSS
 * transitions: the reveal runs on the list item and the hover lift on the card
 * inside it, so the stagger delay never makes a hover feel sluggish.
 *
 * Only a grid that starts below the fold is hidden first — hiding one that is
 * already on screen would make it flash. Without JavaScript, without
 * IntersectionObserver or under reduced motion nothing is hidden at all.
 */

const PREFIX = "dowel-features-icon-grid";

const STYLES = `
[data-slot=features-icon-grid][data-reveal] [data-slot=features-icon-grid-list]>li{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 50ms * var(--motion-scale,1))}
[data-slot=features-icon-grid][data-reveal=pending] [data-slot=features-icon-grid-list]>li{opacity:0;translate:0 20px}
`;

export interface FeatureIconItem {
  title: string;
  description: ReactNode;
  /** Decorative: rendered aria-hidden. The title carries the meaning. */
  icon?: ReactNode;
}

export interface FeaturesIconGridBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  /** The section heading. */
  heading?: ReactNode;
  description?: ReactNode;
  features?: FeatureIconItem[];
  /** Level of the section heading; each feature title is one level below. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
    >
      <path d={d} />
    </svg>
  );
}

export const DEFAULT_ICON_FEATURES: FeatureIconItem[] = [
  {
    title: "Lightning fast",
    description: "Optimised for performance with a small bundle and efficient rendering.",
    icon: <Glyph d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  },
  {
    title: "Accessible",
    description: "Real semantics, keyboard support and reduced-motion handling built in.",
    icon: <Glyph d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 9l7 1 7-1M12 10v5l-3 6m3-6 3 6" />,
  },
  {
    title: "Customisable",
    description: "Every surface is styled with utilities and semantic design tokens.",
    icon: <Glyph d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M15 4v4M9 10v4M17 16v4" />,
  },
  {
    title: "TypeScript first",
    description: "Typed props throughout, with every public type exported.",
    icon: <Glyph d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />,
  },
  {
    title: "Animated",
    description: "Motion that settles instantly for anyone who asks for less of it.",
    icon: <Glyph d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  },
  {
    title: "Open source",
    description: "Free to use, install with one command and change whatever you like.",
    icon: <Glyph d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  },
];

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

/** A section of feature cards: icon, title and one sentence each. */
export function FeaturesIconGridBlock({
  heading = "Everything you need to build",
  description = "Production-ready components with motion, accessibility and types built in.",
  features = DEFAULT_ICON_FEATURES,
  headingLevel = 2,
  className,
  ref,
  ...props
}: FeaturesIconGridBlockProps) {
  const headingId = useId();
  const [setRef, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";
  const ItemHeading = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";

  return (
    <section
      ref={setRef}
      aria-labelledby={headingId}
      data-slot="features-icon-grid"
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
        data-slot="features-icon-grid-list"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature, index) => (
          <li
            key={feature.title}
            style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
            className="flex"
          >
            <Card
              data-slot="features-icon-grid-item"
              className="w-full p-6 shadow-none transition-[translate,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:-translate-y-1 hover:shadow-md"
            >
              {feature.icon ? (
                <span
                  aria-hidden="true"
                  className="mb-4 inline-flex w-fit rounded-lg bg-muted p-2.5 text-foreground"
                >
                  {feature.icon}
                </span>
              ) : null}
              <ItemHeading className="mb-2 font-semibold">{feature.title}</ItemHeading>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
