"use client";

// Ported from SmoothUI Features 3 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * Features as alternating rows: copy on one side, media on the other, swapping
 * sides every row.
 *
 * The source flips rows with `direction: rtl`, which breaks the moment the
 * page itself is right-to-left. Here the swap is grid `order`, and the slide
 * the source plays as each row scrolls in — copy from the start side, media
 * from the end side — takes its sign from `:dir(rtl)`, so it mirrors with the
 * page. Each row reveals on its own, as the source does, and only rows that
 * start below the fold are hidden first.
 */

const PREFIX = "dowel-features-alternating";

const STYLES = `
[data-slot=features-alternating]{--${PREFIX}-sign:1}
[data-slot=features-alternating]:dir(rtl){--${PREFIX}-sign:-1}
[data-slot=features-alternating-row][data-reveal]>[data-side]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint)}
[data-slot=features-alternating-row][data-reveal=pending]>[data-side]{opacity:0;translate:calc(-24px * var(--${PREFIX}-sign)) 0}
[data-slot=features-alternating-row][data-reveal=pending]>[data-side=end]{translate:calc(24px * var(--${PREFIX}-sign)) 0}
`;

export interface AlternatingFeature {
  title: string;
  description: ReactNode;
  /**
   * An image, video or any node shown beside the copy. Give an `<img>` real
   * alt text. Without it a neutral decorative panel is drawn.
   */
  media?: ReactNode;
}

export const DEFAULT_ALTERNATING_FEATURES: AlternatingFeature[] = [
  {
    title: "Intuitive design",
    description:
      "Every component is designed with usability in mind: clean interfaces people understand from the first interaction.",
  },
  {
    title: "Blazing performance",
    description:
      "Animations touch only transform and opacity, so rendering stays on the compositor and scrolling stays smooth.",
  },
  {
    title: "Developer experience",
    description: "Typed props, thorough documentation and installation with a single command.",
  },
];

export interface FeaturesAlternatingBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  features?: AlternatingFeature[];
  /** Level of the section heading; each row title is one level below. */
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
function useReveal<T extends HTMLElement>(ref?: Ref<T>) {
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

interface RowProps {
  feature: AlternatingFeature;
  reversed: boolean;
  headingLevel: number;
}

function Row({ feature, reversed, headingLevel }: RowProps) {
  const [setRef, reveal] = useReveal<HTMLLIElement>();
  const Title = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";

  return (
    <li
      ref={setRef}
      data-slot="features-alternating-row"
      data-reversed={reversed || undefined}
      data-reveal={reveal === "static" ? undefined : reveal}
      className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
    >
      <div data-side={reversed ? "end" : "start"}>
        <Title className="mb-4 text-2xl font-bold tracking-tight">{feature.title}</Title>
        <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
          {feature.description}
        </p>
      </div>
      <div
        data-side={reversed ? "start" : "end"}
        data-slot="features-alternating-media"
        className={cn(
          "overflow-hidden rounded-xl border border-border shadow-md",
          reversed && "md:order-first",
        )}
      >
        {feature.media ?? (
          <div
            aria-hidden="true"
            className="aspect-video w-full bg-linear-to-br from-muted via-accent to-primary/20"
          />
        )}
      </div>
    </li>
  );
}

/** Feature rows that alternate copy and media from side to side. */
export function FeaturesAlternatingBlock({
  heading = "Why developers choose us",
  description = "Designed for developer productivity and user delight.",
  features = DEFAULT_ALTERNATING_FEATURES,
  headingLevel = 2,
  className,
  ...props
}: FeaturesAlternatingBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="features-alternating"
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
      <ul className="flex flex-col gap-16 md:gap-24">
        {features.map((feature, index) => (
          <Row
            key={feature.title}
            feature={feature}
            reversed={index % 2 === 1}
            headingLevel={headingLevel}
          />
        ))}
      </ul>
    </section>
  );
}
