import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "star-rating",
  title: "Star Rating",
  description:
    'Five stars with a "3.0 · Good" caption whose lit stars pop in a staggered cascade when a rating is chosen.',
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["star-rating.tsx"],
  a11y:
    'A Radix radio group named "Rating" (or aria-label): one tab stop, arrow keys move and select (mirrored ' +
    'in right-to-left layouts), and each star is a radio named "3 stars, Good" with a visible focus ring. ' +
    "The caption repeats the checked radio's name, so it is aria-hidden. Stars past the value dim rather than " +
    "disappear, and the caption carries the rating in words, so colour is not the only signal. The pop " +
    "cascade never plays on first paint and collapses to an instant change under reduced motion.",
  guidance: {
    useWhen: [
      "asking for a quick 1–5 rating where a word for each score helps, like reviews or feedback prompts",
    ],
    avoidWhen: [
      "showing an average with half stars, or a read-only score — use rating",
      "scales longer than about seven steps — use slider",
    ],
    alternatives: ["rating", "radio-group", "emoji-reaction"],
  },
});
