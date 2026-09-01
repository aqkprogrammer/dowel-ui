import { Separator as SeparatorPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

export type SeparatorProps = ComponentPropsWithRef<typeof SeparatorPrimitive.Root>;

/**
 * Visual or semantic divider.
 *
 * Defaults to decorative, which removes it from the accessibility tree. Pass
 * `decorative={false}` only when the rule genuinely separates two groups of
 * content that a screen reader user needs to know are distinct.
 */
export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
