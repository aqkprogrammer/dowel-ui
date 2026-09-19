"use client";

// Ported from SmoothUI FAQ 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useId, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { cn } from "@/lib/utils";

/*
 * Frequently asked questions grouped into categories, each category a grid of
 * question-and-answer pairs with every answer visible.
 *
 * The source's tab strip, with its underline sliding between tabs, is Dowel's
 * underline tabs with the `slide` indicator — real tabs, with arrow keys and a
 * panel each. Answers are a description list, because that is what a
 * question/answer grid is (and why a question is a term, not a heading: a
 * `dt` may not contain one). Switching category mounts the new panel, and its
 * pairs rise in with a staggered CSS keyframe that the reduced-motion scale
 * collapses to nothing.
 */

const PREFIX = "dowel-faq-tabbed-grid";

const STYLES = `
@keyframes ${PREFIX}-rise{from{opacity:0;translate:0 1.25rem}}
[data-slot=faq-tabbed-grid-list]>*{animation:${PREFIX}-rise var(--duration-slower) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1))}
`;

export interface FaqTabbedGridItem {
  question: string;
  answer: ReactNode;
  /** A small icon shown above the question. Decorative. */
  icon?: ReactNode;
}

export interface FaqTabbedGridCategory {
  /** The tab's value. It ends up inside id references, so no whitespace. */
  id: string;
  /** The tab's label. */
  name: string;
  items: FaqTabbedGridItem[];
}

export const DEFAULT_FAQ_TABBED_GRID_CATEGORIES: FaqTabbedGridCategory[] = [
  {
    id: "general",
    name: "General",
    items: [
      {
        question: "How do I install it?",
        answer:
          "Run the init command in your project, then add components one at a time. Each arrives as source you own.",
      },
      {
        question: "What are the requirements?",
        answer: "React 19 and Tailwind CSS 4. Every modern browser is supported.",
      },
      {
        question: "Is it free to use?",
        answer: "Yes — free and open source, with no trial limits and no hidden costs.",
      },
    ],
  },
  {
    id: "components",
    name: "Components",
    items: [
      {
        question: "How many components are included?",
        answer:
          "Well over a hundred, from buttons and forms to charts, overlays and whole page sections.",
      },
      {
        question: "Can I customise the styling?",
        answer:
          "Yes. Everything reads design tokens, so a theme changes the whole set, and any single file can be edited.",
      },
      {
        question: "Are the components accessible?",
        answer:
          "Each follows the relevant WAI-ARIA pattern, supports the keyboard and is tested with axe.",
      },
    ],
  },
  {
    id: "support",
    name: "Support",
    items: [
      {
        question: "How can I get help?",
        answer: "Ask in the community discussions, or email the support team directly.",
      },
      {
        question: "Do you offer custom development?",
        answer: "Yes, for teams that need components built to their own specification.",
      },
      {
        question: "What is your response time?",
        answer: "Usually within one working day. Mark urgent issues as high priority.",
      },
    ],
  },
];

export interface FaqTabbedGridBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title" | "defaultValue"
> {
  heading?: ReactNode;
  description?: ReactNode;
  categories?: FaqTabbedGridCategory[];
  /** Controlled active category id. */
  value?: string;
  /** Initial category id when uncontrolled. Defaults to the first. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name of the tab list. */
  categoriesLabel?: string;
  /**
   * Level of the section heading. Questions are the list's terms (`dt`), which
   * may not contain headings, so they add no level of their own.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

/** The icon shown when an item brings none: a question mark in a circle. */
function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  );
}

/** Frequently asked questions in category tabs, each a grid of always-visible answers. */
export function FaqTabbedGridBlock({
  heading = "FAQs",
  description = "Quick, complete answers to common questions about the platform, its services and its features.",
  categories = DEFAULT_FAQ_TABBED_GRID_CATEGORIES,
  value,
  defaultValue,
  onValueChange,
  categoriesLabel = "Question categories",
  headingLevel = 2,
  className,
  ...props
}: FaqTabbedGridBlockProps) {
  const headingId = useId();
  const Heading = `h${String(headingLevel)}` as "h2";

  return (
    <section
      aria-labelledby={headingId}
      data-slot="faq-tabbed-grid"
      className={cn("w-full bg-muted py-16 md:py-24", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-lg">
          <Heading
            id={headingId}
            className="text-4xl font-semibold tracking-tight text-balance text-foreground"
          >
            {heading}
          </Heading>
          {description ? (
            <p className="mt-4 text-lg text-balance text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <Tabs
          value={value}
          defaultValue={defaultValue ?? categories[0]?.id}
          onValueChange={onValueChange}
          className="mt-8 md:mt-12"
        >
          <TabsList
            variant="underline"
            indicator="slide"
            aria-label={categoriesLabel}
            className="flex w-full flex-wrap justify-start"
          >
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} variant="underline">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-8">
              <dl
                data-slot="faq-tabbed-grid-list"
                className="grid gap-10 sm:grid-cols-2 md:gap-12 lg:grid-cols-3"
              >
                {category.items.map((item, index) => (
                  <div
                    key={item.question}
                    style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
                    className="flex flex-col gap-3"
                  >
                    <dt className="flex flex-col gap-3 font-semibold text-foreground">
                      <span
                        aria-hidden="true"
                        className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground [&_svg]:size-4"
                      >
                        {item.icon ?? <QuestionIcon />}
                      </span>
                      {item.question}
                    </dt>
                    <dd className="text-muted-foreground">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
