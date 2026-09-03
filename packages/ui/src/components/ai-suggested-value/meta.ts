import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-suggested-value",
  title: "AI Suggested Value",
  description:
    "An AI-proposed value for any form control, pending until accepted and marked afterwards.",
  category: "ai",
  status: "stable",
  dependencies: [],
  registryDependencies: [],
  files: ["ai-suggested-value.tsx"],
  a11y:
    "The suggestion is the control's description, so a reader who lands on the field hears it " +
    "without any announcement — and announcing is opt-in, because a form filling twenty fields at " +
    "once would narrate all twenty. The row that holds it is rendered from the start and never " +
    "display:none, so when announcing is on, a suggestion arriving after mount is actually heard. " +
    "Each button's name carries the field it belongs to, so a page of Accepts is a page of " +
    "different buttons. Provenance and confidence are words with a number, never a colour. " +
    "Acceptance is reported, not performed: the control is the consumer's, so its value, its " +
    "label and its own keyboard behaviour are untouched — there is no shortcut hijacked from a " +
    "select or a date field. The id and ARIA a FormControl passes down are forwarded to the " +
    "control, and an existing aria-describedby is merged rather than replaced.",
});
