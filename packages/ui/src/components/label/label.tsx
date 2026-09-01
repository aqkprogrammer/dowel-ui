import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

export type LabelProps = ComponentPropsWithRef<typeof LabelPrimitive.Root>;

/**
 * Caption for a form control.
 *
 * Built on the Radix primitive so clicking the label focuses its control even
 * when the control is a composite widget rather than a native input.
 */
export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-55",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
