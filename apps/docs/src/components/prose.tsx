import { cn } from "@dowel-ui/react";
import type { ComponentPropsWithRef } from "react";

/**
 * Long-form typography.
 *
 * Hand-rolled rather than a plugin: the type scale, spacing and colours all
 * come from the library's own tokens, so the documentation is itself an example
 * of the design system rather than a separately-styled island.
 */
export function Prose({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "max-w-none",
        "[&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground",
        "[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:mt-4 [&_p]:text-[0.9375rem] [&_p]:leading-7 [&_p]:text-pretty [&_p]:text-muted-foreground",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-[0.9375rem] [&_ul]:leading-7 [&_ul]:text-muted-foreground",
        "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-[0.9375rem] [&_ol]:leading-7 [&_ol]:text-muted-foreground",
        "[&_li]:marker:text-muted-foreground/50",
        "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-[var(--cosmic-blue)] [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a:hover]:decoration-2",
        // Inline code only: a code block inside prose brings its own styling.
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:border [&_:not(pre)>code]:border-[var(--hairline)] [&_:not(pre)>code]:bg-[var(--pane-raised)] [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-foreground",
        "[&_strong]:font-medium [&_strong]:text-foreground",
        "[&_[data-slot=code-panel]]:my-5 [&_[data-slot=install-command]]:my-5",
        className,
      )}
      {...props}
    />
  );
}
