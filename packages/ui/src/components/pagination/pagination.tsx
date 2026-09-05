import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { buttonVariants } from "@/components/button";
import { mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Navigation between pages of a list.
 *
 * Rendered as links by default, not buttons: a page of results is a place, so
 * it should be shareable, openable in a new tab and part of history. Use
 * `asChild` to hand off to your router's link. For pagination that only changes
 * client state, render buttons instead — `PaginationLink` accepts either.
 */
export function Pagination({ className, ...props }: ComponentPropsWithRef<"nav">) {
  return (
    <nav
      // A named landmark, so it can be jumped to and is distinguishable from
      // the page's main navigation.
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: ComponentPropsWithRef<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem({ className, ...props }: ComponentPropsWithRef<"li">) {
  return <li data-slot="pagination-item" className={cn(className)} {...props} />;
}

export interface PaginationLinkProps extends ComponentPropsWithRef<"a"> {
  /** Marks the page the user is on. Sets aria-current="page". */
  isActive?: boolean;
  size?: "sm" | "md" | "icon" | "icon-sm";
  asChild?: boolean;
}

export function PaginationLink({
  className,
  isActive,
  size = "icon",
  asChild,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-slot="pagination-link"
      // aria-current is what tells a screen reader user where they are; styling
      // the active page differently does nothing on its own.
      aria-current={isActive ? "page" : undefined}
      data-active={isActive || undefined}
      className={cn(
        buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
        isActive && "border-border-strong font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="sm"
      className={cn("gap-1 px-2.5", className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn("size-4", mirrorForDirection)}
      >
        <path
          d="m15 18-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  );
}

export function PaginationNext({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="sm"
      className={cn("gap-1 px-2.5", className)}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn("size-4", mirrorForDirection)}
      >
        <path
          d="m9 18 6-6-6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </PaginationLink>
  );
}

/**
 * Stands in for a run of skipped pages.
 *
 * Hidden from assistive technology and given screen-reader text, because "…"
 * is announced as nothing useful and the gap is already implied by the page
 * numbers either side.
 */
export function PaginationEllipsis({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      data-slot="pagination-ellipsis"
      aria-hidden="true"
      className={cn("grid size-9 place-items-center text-muted-foreground", className)}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      </svg>
      <span className="sr-only">More pages</span>
    </span>
  );
}
