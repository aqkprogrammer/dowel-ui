import { cn } from "@dowel-ui/react";
import { Hash } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A titled section of a documentation page, with a link to itself.
 *
 * The heading is the anchor's target and the "On this page" rail's entry, so
 * its id is the section's name in the URL — a link to `#installation` lands
 * on the heading, below the sticky header rather than under it.
 */
export function DocSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("mt-16 first:mt-0", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={id}
            className="group flex scroll-mt-24 items-center gap-2 text-xl font-semibold tracking-tight"
          >
            {title}
            <a
              href={`#${id}`}
              aria-label={`Link to ${title}`}
              className="rounded text-muted-foreground/0 transition-colors outline-none group-hover:text-muted-foreground focus-visible:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              <Hash aria-hidden="true" className="size-4" />
            </a>
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
