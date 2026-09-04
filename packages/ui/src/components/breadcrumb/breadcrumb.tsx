import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Where this page sits in the hierarchy.
 *
 * Three things separate a breadcrumb that works from one that only looks like
 * one, and all three are about the last item.
 *
 * It is not a link. A link to the page you are already on is a control that
 * does nothing, and in a screen reader's list of links it is indistinguishable
 * from the ones that go somewhere.
 *
 * It carries `aria-current="page"`. Bolding it says "you are here" to people
 * who can see it and to nobody else.
 *
 * The separators are hidden. A slash between every item is read aloud as
 * "slash" — "Home slash Projects slash Settings" — which is the punctuation of
 * the design leaking into the content.
 */

export function Breadcrumb({ className, ...props }: ComponentPropsWithRef<"nav">) {
  return (
    <nav
      // Named, because a page can have more than one navigation landmark and
      // "navigation" on its own does not say which this is.
      aria-label="Breadcrumb"
      data-slot="breadcrumb"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

export function BreadcrumbList({ className, ...props }: ComponentPropsWithRef<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentPropsWithRef<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

export interface BreadcrumbLinkProps extends ComponentPropsWithRef<"a"> {
  /** Render the child as the link, for a router's own component. */
  asChild?: boolean;
}

export function BreadcrumbLink({ className, asChild = false, ...props }: BreadcrumbLinkProps) {
  const Component = asChild ? Slot.Root : "a";

  return (
    <Component
      data-slot="breadcrumb-link"
      className={cn(
        "rounded-sm transition-colors duration-[var(--duration-fast)]",
        "hover:text-foreground",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

/**
 * The page you are on.
 *
 * A span, not a link: there is nowhere to go. `aria-current="page"` is what
 * says "you are here" to anything that is not looking at the font weight.
 */
export function BreadcrumbPage({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

/**
 * The mark between items.
 *
 * Hidden from assistive technology and given no accessible name: the list
 * structure already conveys the sequence, and reading "slash" between every
 * item is the design's punctuation leaking into the content.
 */
export function BreadcrumbSeparator({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? (
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="m9 18 6-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </li>
  );
}

/**
 * Stands in for the middle of a long trail.
 *
 * Named rather than hidden, because unlike a separator it is *content*: it
 * says levels have been left out. A bare "…" announces as nothing at all.
 */
export function BreadcrumbEllipsis({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      className={cn("flex size-5 items-center justify-center", className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      </svg>
      <span className="sr-only">Intermediate levels</span>
    </span>
  );
}
