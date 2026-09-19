"use client";

// Ported from SmoothUI AI Suggestions (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentPropsWithRef, type CSSProperties } from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * Prompt suggestion chips: the empty state of a chat, and the follow-up row
 * after an answer. They are alternatives of equal weight, so they arrive
 * radiating from the centre of the row rather than sweeping in reading order,
 * which would imply the first chip matters most.
 *
 * The entrance is a CSS keyframe keyed to each chip's distance from the middle.
 * Swapping the set re-keys the list, so the new chips replay it. SmoothUI's
 * exit and layout reflow (Motion's AnimatePresence + layout) are not ported:
 * a chip set is replaced wholesale, and the outgoing set gets no attention
 * worth a dependency. Under reduced motion the chips simply appear.
 */

const PREFIX = "dowel-ai-suggestions";
const STAGGER_MS = 45;

const STYLES = `
[data-slot=suggestions-item]{animation:${PREFIX}-in var(--duration-normal) var(--ease-overshoot) backwards;animation-delay:calc(var(--stagger) * var(--motion-scale, 1))}
@keyframes ${PREFIX}-in{from{opacity:0;transform:translateY(6px) scale(.94)}}
`;

export interface SuggestionItem {
  id: string;
  label: string;
}

const suggestionsVariants = cva("rounded-full font-normal active:scale-[0.97]", {
  variants: {
    variant: {
      outline: "",
      soft: "border-transparent bg-muted text-foreground hover:bg-accent",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

/** Distance from the middle of the row, so the stagger radiates outwards. */
function centreOut(index: number, count: number): number {
  return Math.abs(index - (count - 1) / 2);
}

export interface SuggestionsProps
  extends
    Omit<ComponentPropsWithRef<"div">, "onSelect">,
    VariantProps<typeof suggestionsVariants> {
  suggestions: SuggestionItem[];
  /** Called with the whole suggestion. Prefer filling the composer over sending. */
  onSelect?: (suggestion: SuggestionItem) => void;
  /** Visible heading, e.g. "Follow-ups". Also names the list. */
  label?: string;
  /** Disables every chip, e.g. while a response streams. */
  disabled?: boolean;
}

/** A row of prompt suggestion chips. */
export function Suggestions({
  className,
  suggestions,
  onSelect,
  label,
  variant,
  disabled = false,
  ...props
}: SuggestionsProps) {
  const labelId = useId();
  // Re-keying on the set replays the entrance when the suggestions change.
  const setKey = suggestions.map((suggestion) => suggestion.id).join("|");

  return (
    <div
      data-slot="suggestions"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {label ? (
        <p id={labelId} className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <ul
        key={setKey}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Suggestions"}
        className="flex flex-wrap gap-2"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.id}
            data-slot="suggestions-item"
            style={
              {
                "--stagger": `${String(centreOut(index, suggestions.length) * STAGGER_MS)}ms`,
              } as CSSProperties
            }
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-auto min-h-8 py-1.5 text-start whitespace-normal",
                suggestionsVariants({ variant }),
              )}
              onClick={() => onSelect?.(suggestion)}
            >
              {suggestion.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { suggestionsVariants };
