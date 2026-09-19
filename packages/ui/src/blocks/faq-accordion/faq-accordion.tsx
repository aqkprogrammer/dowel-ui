"use client";

// Ported from SmoothUI FAQ 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { cn } from "@/lib/utils";

/*
 * Frequently asked questions as a stack of bordered cards, one open at a time.
 *
 * The source hand-rolls the disclosure with a motion height tween. Dowel's
 * accordion already is that disclosure — a button inside a heading, arrow keys
 * between triggers, the height keyframe on the measured content — so the block
 * only restyles its items as cards. The staggered rise as the list scrolls in
 * is a CSS transition keyed off one `data-reveal` state, and only a list that
 * starts below the fold is ever hidden first.
 */

const PREFIX = "dowel-faq-accordion";

const STYLES = `
[data-slot=faq-accordion][data-reveal] [data-slot=faq-accordion-list]>*{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint),border-color var(--duration-fast),box-shadow var(--duration-fast);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1)),calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1)),0s,0s}
[data-slot=faq-accordion][data-reveal=pending] [data-slot=faq-accordion-list]>*{opacity:0;translate:0 1.25rem}
`;

export interface FaqAccordionItem {
  /** Stable identity. Defaults to the question. */
  id?: string;
  question: string;
  answer: ReactNode;
}

export const DEFAULT_FAQ_ACCORDION_ITEMS: FaqAccordionItem[] = [
  {
    question: "What is this product?",
    answer:
      "A library of accessible, animated interface components and page sections you copy into your own project and own outright.",
  },
  {
    question: "How do I get started?",
    answer:
      "Install the command-line tool, run the init command in your project, then add the components you need. Each one arrives as source you can read and change.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes. The components and page sections are free for personal and commercial work, with no attribution required.",
  },
  {
    question: "Can I customise the components?",
    answer:
      "Everything is styled with design tokens and utility classes, so you can retheme the whole set at once or change any single component's source.",
  },
  {
    question: "Which frameworks are supported?",
    answer:
      "Anything that renders React 19 — Next.js, Remix, Vite and similar. Server rendering works out of the box.",
  },
  {
    question: "How often are updates released?",
    answer:
      "Every few weeks. The changelog lists what changed, and the update command shows a diff before touching your files.",
  },
];

export interface FaqAccordionBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  items?: FaqAccordionItem[];
  /** The item open on first render, by id (or question). `null` starts with all closed. Defaults to the first. */
  defaultOpen?: string | null;
  /**
   * Level of the section heading. The questions stay `h3` — the accordion's
   * trigger heading — so pair a level other than 2 with care.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Reveal = "static" | "pending" | "shown";

/** Hides the content only if it starts below the fold, and shows it once it scrolls in. */
function useReveal<T extends HTMLElement>(ref: Ref<T> | undefined) {
  const node = useRef<T>(null);
  // The consumer's ref, object or callback, gets the same element.
  useImperativeHandle(ref, () => node.current as T, []);
  const [reveal, setReveal] = useState<Reveal>("static");

  useEffect(() => {
    const element = node.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  return [node, reveal] as const;
}

const idOf = (item: FaqAccordionItem) => item.id ?? item.question;

/** Frequently asked questions as bordered cards, one answer open at a time. */
export function FaqAccordionBlock({
  heading = "Frequently asked questions",
  description = "Answers to the questions we hear most about the product and how it works.",
  items = DEFAULT_FAQ_ACCORDION_ITEMS,
  defaultOpen,
  headingLevel = 2,
  className,
  ref,
  ...props
}: FaqAccordionBlockProps) {
  const headingId = useId();
  const [node, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";
  const first = items[0];
  const initial = defaultOpen === undefined ? (first ? idOf(first) : undefined) : defaultOpen;

  return (
    <section
      ref={node}
      aria-labelledby={headingId}
      data-slot="faq-accordion"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-20", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mb-12 text-center md:mb-16">
        <Heading
          id={headingId}
          className="text-3xl font-bold tracking-tight text-balance text-foreground lg:text-4xl"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue={initial ?? undefined}
        data-slot="faq-accordion-list"
        className="flex flex-col gap-4"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={idOf(item)}
            value={idOf(item)}
            style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
            className={cn(
              "overflow-hidden rounded-2xl border border-border bg-card px-6 last:border-b",
              "hover:border-primary hover:shadow-lg",
            )}
          >
            <AccordionTrigger className="py-6 text-base font-semibold text-foreground md:text-lg">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
