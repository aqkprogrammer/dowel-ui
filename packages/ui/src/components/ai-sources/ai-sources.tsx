"use client";

import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Where a response came from.
 *
 * Citations are the difference between an assertion and a claim someone can
 * check, so they are first-class here rather than a footnote: an inline marker
 * next to the sentence, and a list underneath that says what each marker is.
 */

/**
 * An inline citation marker.
 *
 * The visible text is a bare number, which tells a screen reader user nothing,
 * so the real title goes in the accessible name. Rendered as a link when given
 * an href, and as plain text otherwise — a marker that looks clickable and is
 * not is worse than one that does not.
 */
export interface InlineCitationProps extends ComponentPropsWithRef<"a"> {
  /** Position in the source list, starting at 1. */
  index: number;
  /** What is being cited. Becomes the accessible name. */
  title: string;
}

export function InlineCitation({
  className,
  index,
  title,
  href,
  ...props
}: InlineCitationProps) {
  const shared = cn(
    "mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 align-[0.15em]",
    "bg-muted text-2xs font-medium text-muted-foreground tabular-nums",
    className,
  );

  if (!href) {
    return (
      <span data-slot="inline-citation" className={shared}>
        <span aria-hidden="true">{index}</span>
        <span className="sr-only">
          Source {index}: {title}
        </span>
      </span>
    );
  }

  return (
    <a
      data-slot="inline-citation"
      href={href}
      aria-label={`Source ${String(index)}: ${title}`}
      className={cn(
        shared,
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
        focusRing,
      )}
      {...props}
    >
      <span aria-hidden="true">{index}</span>
    </a>
  );
}

export type SourcesProps = ComponentPropsWithRef<typeof CollapsiblePrimitive.Root>;

export function Sources({ className, ...props }: SourcesProps) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="sources"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

export interface SourcesTriggerProps extends ComponentPropsWithRef<
  typeof CollapsiblePrimitive.Trigger
> {
  count: number;
}

export function SourcesTrigger({ className, count, children, ...props }: SourcesTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="sources-trigger"
      className={cn(
        "flex items-center gap-1.5 rounded-md text-xs text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:text-foreground",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      {children ?? `${String(count)} ${count === 1 ? "source" : "sources"}`}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-[var(--duration-normal)]"
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CollapsiblePrimitive.Trigger>
  );
}

export function SourcesContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="sources-content"
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open",
        className,
      )}
      {...props}
    >
      {/* Ordered, because the numbers in the inline markers refer to positions
          in this list. */}
      <ol className="mt-2 flex flex-col gap-1.5">{children}</ol>
    </CollapsiblePrimitive.Content>
  );
}

export interface SourceProps extends ComponentPropsWithRef<"a"> {
  index: number;
  title: string;
  /** Where it came from — a domain, a filename, a document title. */
  origin?: string;
  /** The quoted passage, if there is one. */
  excerpt?: string;
}

export function Source({ className, index, title, origin, excerpt, ...props }: SourceProps) {
  return (
    <li data-slot="source">
      <a
        className={cn(
          "flex gap-2 rounded-md border border-border bg-card/50 px-2.5 py-2",
          "transition-colors duration-[var(--duration-fast)] hover:bg-accent/50",
          focusRing,
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-muted text-2xs font-medium text-muted-foreground tabular-nums"
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">{title}</span>
          {origin ? (
            <span className="block truncate text-2xs text-muted-foreground">{origin}</span>
          ) : null}
          {excerpt ? (
            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
              “{excerpt}”
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}
