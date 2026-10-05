import { cn } from "@dowel-ui/react";
import type { ReactNode } from "react";

/**
 * A section's heading: a mono eyebrow, a display heading, and a sentence.
 *
 * The heading level is a prop because a section on the home page is an h2 and
 * the same block inside a documentation page may be an h3; the look stays the
 * same either way.
 */
export function SectionHeader({
  id,
  eyebrow,
  tone,
  title,
  description,
  action,
  align = "start",
  as: Heading = "h2",
  size = "lg",
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  tone?: "blue" | "orange";
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  as?: "h2" | "h3";
  size?: "lg" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className="eyebrow" data-tone={tone}>
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={id}
          className={cn(
            size === "lg" ? "display-lg" : "display-md",
            "text-luminous",
            eyebrow ? "mt-4" : null,
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
