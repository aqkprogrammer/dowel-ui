"use client";

// Motion from SmoothUI AI Sources and AI Citation (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  useEffect,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Where a response came from.
 *
 * Citations are the difference between an assertion and a claim someone can
 * check, so they are first-class here rather than a footnote: an inline marker
 * next to the sentence, and a list underneath that says what each marker is.
 */

/** Hostname without "www.", or the input unchanged when it is not a URL. */
export function sourceHost(href: string): string {
  try {
    const { hostname } = new URL(href);
    return hostname ? hostname.replace(/^www\./, "") : href;
  } catch {
    return href;
  }
}

/** The neutral mark for a source with no favicon — never a fake letter badge. */
function GlobeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A decorative mark slot that sizes whatever it is given (an <img alt="">, an SVG). */
const markSlot =
  "grid shrink-0 place-items-center overflow-hidden rounded-full [&>*]:size-full [&>*]:object-cover";

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
  /**
   * Show a preview card — host, title, description — on hover and on keyboard
   * focus. Requires `href`: a text marker is not focusable, and a preview that
   * only hover can reach is not allowed.
   */
  preview?: boolean;
  /** Excerpt shown in the preview card. */
  description?: string;
  /** The source's mark in the preview header. Decorative; an <img> needs `alt=""`. */
  favicon?: ReactNode;
  /** Open delay for the preview, in milliseconds. */
  previewDelay?: number;
}

export function InlineCitation({
  className,
  index,
  title,
  href,
  preview = false,
  description,
  favicon,
  previewDelay = 0,
  ...props
}: InlineCitationProps) {
  const unreachablePreview = preview && !href;
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !unreachablePreview) return;
    console.warn(
      "InlineCitation: `preview` needs an `href`. Without one the marker is not focusable, " +
        "so the preview would be reachable by hover alone; it is not rendered.",
    );
  }, [unreachablePreview]);

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

  const link = (
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

  if (!preview) return link;

  const host = sourceHost(href);
  return (
    <Tooltip delayDuration={previewDelay}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="top"
        // The title is already the link's name; the description is what adds
        // to it, so the hidden tooltip copy is host and excerpt only.
        aria-label={description ? `${host}. ${description}` : host}
        className="w-72 max-w-none rounded-xl border border-border bg-popover p-3 text-start text-wrap text-popover-foreground shadow-lg"
      >
        <span data-slot="inline-citation-preview" className="block">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className={cn(markSlot, "size-3.5")}>
              {favicon ?? <GlobeMark />}
            </span>
            <span className="min-w-0 truncate">{host}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={cn("size-3 shrink-0", mirrorForDirection)}
            >
              <path
                d="M7 17 17 7M8 7h9v9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="mt-1.5 block text-sm font-medium text-popover-foreground">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
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
  /**
   * Marks shown as an overlapping stack before the label. Decorative: the
   * count is already in the trigger's words. A `null` entry shows a globe.
   */
  favicons?: ReactNode[];
  /** How many marks before a "+n" chip. */
  stackLimit?: number;
}

export function SourcesTrigger({
  className,
  count,
  favicons,
  stackLimit = 3,
  children,
  ...props
}: SourcesTriggerProps) {
  const shown = favicons ? favicons.slice(0, Math.max(0, stackLimit)) : [];
  const overflow = favicons ? favicons.length - shown.length : 0;

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="sources-trigger"
      className={cn(
        "group/trigger flex items-center gap-1.5 rounded-md text-xs text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:text-foreground",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      {favicons && favicons.length > 0 ? (
        <span aria-hidden="true" data-slot="sources-stack" className="flex items-center">
          {shown.map((favicon, position) => (
            <span
              key={position}
              data-slot="sources-stack-mark"
              style={{ zIndex: shown.length - position }}
              className={cn(
                markSlot,
                "relative size-4.5 border border-border bg-background text-muted-foreground",
                // Fans out on hover and keyboard focus while closed; no React
                // state, so a moving pointer never re-renders.
                position > 0 &&
                  "-ms-2 transition-[margin-inline-start] duration-[calc(250ms*var(--motion-scale))] ease-[var(--ease-out-quint)] group-hover/trigger:group-data-[state=closed]/trigger:ms-0.5 group-focus-visible/trigger:group-data-[state=closed]/trigger:ms-0.5",
              )}
            >
              {favicon ?? <GlobeMark />}
            </span>
          ))}
          {overflow > 0 ? (
            <span data-slot="sources-stack-overflow" className="ms-1 tabular-nums">
              +{overflow}
            </span>
          ) : null}
        </span>
      ) : null}
      {children ?? `${String(count)} ${count === 1 ? "source" : "sources"}`}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
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
  /**
   * The source's mark, shown before the title. Decorative — an <img> needs
   * `alt=""` — and the index badge stays, since it links marker and row.
   */
  favicon?: ReactNode;
}

const PREFIX = "dowel-ai-sources";

/* Rows rise in one after another when the list opens; the index is capped so
 * a long list is not still arriving seconds later. */
const STYLES = `
@keyframes ${PREFIX}-row-in{from{opacity:0;translate:0 4px}}
[data-slot=sources-content][data-state=open] [data-slot=source]{animation:${PREFIX}-row-in calc(250ms * var(--motion-scale,1)) var(--ease-out-quint) both;animation-delay:calc(var(--dowel-i,0) * 35ms * var(--motion-scale,1))}
`;

/** Rows after this many share the last row's delay. */
const STAGGER_CAP = 10;

export function Source({
  className,
  index,
  title,
  origin,
  excerpt,
  favicon,
  ...props
}: SourceProps) {
  const order = Math.min(Math.max(index - 1, 0), STAGGER_CAP);
  return (
    <li data-slot="source" style={{ "--dowel-i": order } as CSSProperties}>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
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
        {favicon ? (
          <span aria-hidden="true" className={cn(markSlot, "mt-0.5 size-4")}>
            {favicon}
          </span>
        ) : null}
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
