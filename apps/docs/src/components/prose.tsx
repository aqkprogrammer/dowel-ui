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
        "[&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:mt-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-muted-foreground",
        "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:text-muted-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
        "[&_strong]:font-medium [&_strong]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
