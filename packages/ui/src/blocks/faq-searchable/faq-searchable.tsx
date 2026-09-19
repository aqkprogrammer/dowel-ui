"use client";

// Ported from SmoothUI FAQ 3 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/accordion";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { cn } from "@/lib/utils";

/*
 * Frequently asked questions with a search field that filters them as you type.
 *
 * Filtering silently replaces the list, so the number of matches is a polite
 * live region (ADR 0011), and the field has a real label rather than only a
 * placeholder that vanishes as soon as anyone types. The source pops results
 * in with a spring; here a card that (re)appears rises in with a short CSS
 * keyframe on mount — cards that stay matched stay put — and the
 * reduced-motion scale collapses it to nothing.
 */

const PREFIX = "dowel-faq-searchable";

const STYLES = `
@keyframes ${PREFIX}-in{from{opacity:0;translate:0 0.75rem;scale:.97}}
[data-slot=faq-searchable-list]>*{animation:${PREFIX}-in var(--duration-slow) var(--ease-out-quint) both;animation-delay:calc(var(--${PREFIX}-index,0) * 50ms * var(--motion-scale,1))}
[data-slot=faq-searchable-empty]{animation:${PREFIX}-in var(--duration-slow) var(--ease-out-quint) both}
`;

export interface FaqSearchableItem {
  /** Stable identity. Defaults to the question. */
  id?: string;
  question: string;
  /** Plain text, because it is searched as well as shown. */
  answer: string;
}

export const DEFAULT_FAQ_SEARCHABLE_ITEMS: FaqSearchableItem[] = [
  {
    question: "How do I get started?",
    answer:
      "Install the command-line tool, run the init command in your project, then add the components you need.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes. It is free for personal and commercial projects, with no restrictions and no attribution required.",
  },
  {
    question: "What are the system requirements?",
    answer:
      "React 19, a current version of Node.js, and any modern browser that supports CSS transitions and transforms.",
  },
  {
    question: "Can I customise the animations?",
    answer:
      "Yes. Durations and easings come from design tokens, and every animation respects the reduced-motion setting.",
  },
  {
    question: "How do I report a bug?",
    answer:
      "Open an issue on the repository with a description, the steps to reproduce it, and details of your environment.",
  },
  {
    question: "Is enterprise support available?",
    answer:
      "Yes. Support plans include priority fixes, a dedicated channel and response-time guarantees. Contact us for details.",
  },
];

export interface FaqSearchableLabels {
  /** The search field's label. Visually hidden; the placeholder is only a hint. */
  search: string;
  placeholder: string;
  /** Shown when nothing matches. */
  noResults: string;
  /** Announced as the matches change. */
  results: (count: number, total: number) => string;
}

const DEFAULT_LABELS: FaqSearchableLabels = {
  search: "Search frequently asked questions",
  placeholder: "Search questions…",
  noResults: "No matching questions found. Try a different search term.",
  results: (count, total) =>
    count === total
      ? `${String(total)} questions.`
      : `${String(count)} of ${String(total)} questions match.`,
};

export interface FaqSearchableBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  description?: ReactNode;
  items?: FaqSearchableItem[];
  /** Controlled search text. */
  query?: string;
  /** Initial search text when uncontrolled. */
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Visible and announced text, for localisation. */
  labels?: Partial<FaqSearchableLabels>;
  /**
   * Level of the section heading. The questions stay `h3` — the accordion's
   * trigger heading — so pair a level other than 2 with care.
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const idOf = (item: FaqSearchableItem) => item.id ?? item.question;

/** Matches the question or the answer, ignoring case. */
export function filterFaqs(items: FaqSearchableItem[], query: string): FaqSearchableItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.question.toLocaleLowerCase().includes(needle) ||
      item.answer.toLocaleLowerCase().includes(needle),
  );
}

/** Frequently asked questions filtered by a search field, with the match count announced. */
export function FaqSearchableBlock({
  heading = "Frequently asked questions",
  description = "Search the questions to find the answer you need.",
  items = DEFAULT_FAQ_SEARCHABLE_ITEMS,
  query: queryProp,
  defaultQuery = "",
  onQueryChange,
  labels: labelsProp,
  headingLevel = 2,
  className,
  ...props
}: FaqSearchableBlockProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const headingId = useId();
  const searchId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultQuery);
  const query = queryProp ?? uncontrolled;
  const [open, setOpen] = useState("");
  const Heading = `h${String(headingLevel)}` as "h2";
  const matches = filterFaqs(items, query);

  function handleChange(next: string) {
    if (queryProp === undefined) setUncontrolled(next);
    // A new search closes whatever was open: it may no longer be in the list.
    setOpen("");
    onQueryChange?.(next);
  }

  return (
    <section
      aria-labelledby={headingId}
      data-slot="faq-searchable"
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

      <div data-slot="faq-searchable-search" className="relative mb-8">
        <Label htmlFor={searchId} className="sr-only">
          {labels.search}
        </Label>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <Input
          id={searchId}
          type="search"
          inputSize="lg"
          autoComplete="off"
          value={query}
          placeholder={labels.placeholder}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
          className="h-14 rounded-xl ps-12"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {matches.length === 0 ? labels.noResults : labels.results(matches.length, items.length)}
      </p>

      {matches.length === 0 ? (
        <p
          data-slot="faq-searchable-empty"
          className="rounded-xl border border-border bg-muted/50 px-6 py-12 text-center text-muted-foreground"
        >
          {labels.noResults}
        </p>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
          data-slot="faq-searchable-list"
          className="flex flex-col gap-4"
        >
          {matches.map((item, index) => (
            <AccordionItem
              key={idOf(item)}
              value={idOf(item)}
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
      )}
    </section>
  );
}
