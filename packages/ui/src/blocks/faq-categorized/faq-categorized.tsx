"use client";

// Ported from SmoothUI FAQ 4 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { cn } from "@/lib/utils";

/*
 * Frequently asked questions sorted into topics: a tab per topic, and the
 * topic's questions as an accordion.
 *
 * The source builds its own tablist (without panels or arrow keys) and its own
 * disclosure. Dowel's underline tabs with the sliding indicator and its
 * accordion are both of those, done properly, so the block only arranges them.
 * Changing topic mounts a fresh panel — which also closes whatever answer was
 * open, as the source does — and its cards rise in with a staggered keyframe
 * that the reduced-motion scale collapses to nothing.
 */

const PREFIX = "dowel-faq-categorized";

const STYLES = `
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 1.25rem}}
[data-slot=faq-categorized-list]>*{animation:${PREFIX}-rise var(--duration-slow) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-index,0) * 50ms * var(--motion-scale,1))}
`;

export interface FaqCategorizedItem {
  question: string;
  answer: ReactNode;
}

export interface FaqCategorizedCategory {
  /** Stable identity, used as the tab's value. Defaults to the name, with spaces as hyphens. */
  id?: string;
  /** The tab's label. */
  name: string;
  items: FaqCategorizedItem[];
}

export const DEFAULT_FAQ_CATEGORIZED_CATEGORIES: FaqCategorizedCategory[] = [
  {
    name: "Getting started",
    items: [
      {
        question: "How do I set it up in my project?",
        answer:
          "Run the init command, then add the components you need. The command-line tool installs each one with its dependencies.",
      },
      {
        question: "What are the minimum requirements?",
        answer:
          "React 19, a current Node.js and Tailwind CSS 4. All modern browsers are supported.",
      },
      {
        question: "How do I add my first component?",
        answer:
          "Run the add command with the component's name. Its source lands in your components directory, ready to edit.",
      },
    ],
  },
  {
    name: "Billing",
    items: [
      {
        question: "Is it free to use?",
        answer:
          "The components and page sections are free for personal and commercial projects, under the MIT licence.",
      },
      {
        question: "Do you offer refunds?",
        answer:
          "Paid plans can be refunded in full within 30 days of purchase, no questions asked.",
      },
      {
        question: "Which payment methods do you accept?",
        answer: "All major cards, and invoices for yearly team plans.",
      },
    ],
  },
  {
    name: "Technical",
    items: [
      {
        question: "Which browsers are supported?",
        answer:
          "The current and previous versions of Chrome, Edge, Firefox and Safari, on desktop and mobile.",
      },
      {
        question: "How does it affect performance?",
        answer:
          "Components are tree-shaken, and animation sticks to transform and opacity so it stays on the compositor.",
      },
      {
        question: "Is TypeScript supported?",
        answer: "Everything is written in TypeScript, with full types for every prop.",
      },
      {
        question: "Can I customise component styles?",
        answer:
          "Yes — override any class through the className prop, change the design tokens, or edit the source directly.",
      },
    ],
  },
];

export interface FaqCategorizedBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title" | "defaultValue"
> {
  heading?: ReactNode;
  description?: ReactNode;
  categories?: FaqCategorizedCategory[];
  /** Controlled active category id. */
  value?: string;
  /** Initial category id when uncontrolled. Defaults to the first. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name of the tab list. */
  categoriesLabel?: string;
  /**
   * Level of the section heading. The questions stay `h3` — the accordion's
   * trigger heading — so pair a level other than 2 with care.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

/** Tab values end up inside id references, which may not contain whitespace. */
const idOf = (category: FaqCategorizedCategory) =>
  category.id ?? category.name.trim().replace(/\s+/g, "-");

/** Frequently asked questions in topic tabs, each topic an accordion. */
export function FaqCategorizedBlock({
  heading = "Frequently asked questions",
  description = "Answers, organised by topic.",
  categories = DEFAULT_FAQ_CATEGORIZED_CATEGORIES,
  value,
  defaultValue,
  onValueChange,
  categoriesLabel = "Question topics",
  headingLevel = 2,
  className,
  ...props
}: FaqCategorizedBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";
  const first = categories[0];

  return (
    <section
      aria-labelledby={headingId}
      data-slot="faq-categorized"
      className={cn("mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 md:py-20", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mb-10 text-center md:mb-12">
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

      <Tabs
        value={value}
        defaultValue={defaultValue ?? (first ? idOf(first) : undefined)}
        onValueChange={onValueChange}
      >
        <TabsList
          variant="underline"
          indicator="slide"
          aria-label={categoriesLabel}
          className="flex w-full flex-wrap justify-center gap-6"
        >
          {categories.map((category) => (
            <TabsTrigger
              key={idOf(category)}
              value={idOf(category)}
              variant="underline"
              className="h-11"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={idOf(category)} value={idOf(category)} className="mt-8">
            <Accordion
              type="single"
              collapsible
              data-slot="faq-categorized-list"
              className="flex flex-col gap-4"
            >
              {category.items.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={item.question}
                  style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
                  className="overflow-hidden rounded-xl border border-border bg-card px-5 transition-colors duration-[var(--duration-fast)] last:border-b hover:border-primary"
                >
                  <AccordionTrigger className="py-5 text-base text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
