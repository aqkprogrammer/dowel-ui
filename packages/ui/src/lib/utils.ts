import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge does not know about scales we add on top of Tailwind's
 * defaults, so `text-2xs` would be misclassified and fail to override
 * `text-sm`. Registering our additions keeps class conflict resolution correct.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs"] }],
    },
  },
});

/**
 * Merges class names, with later Tailwind utilities winning over earlier
 * conflicting ones. Every component runs its `className` prop through this so
 * consumers can override any style without `!important`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
