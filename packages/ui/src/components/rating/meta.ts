import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "rating",
  title: "Rating",
  description:
    "A star rating input with half stars, a springy hover preview and a burst on the chosen star — or a read-only display of any fraction.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["rating.tsx"],
  a11y:
    'A radiogroup (named "Rating" unless given aria-label or aria-labelledby) of role="radio" buttons, one per ' +
    'star or per half star, each named by getLabel ("3.5 stars"). One tab stop on the chosen option; Right/Down ' +
    "and Left/Up move and select (Left/Right mirror in right-to-left layouts), wrapping at the ends like native " +
    "radios, with Home/End; Space or Enter selects the focused option. Focus previews the value and rings the " +
    "whole star. Filled stars are solid and empty ones outlined, so the value never rests on colour alone. " +
    'readOnly renders a role="img" named "3.5 out of 5". Glyphs, the preview pop and the burst are aria-hidden ' +
    "and stop under reduced motion. Half-star hit zones at size sm are narrow; prefer md or lg for touch.",
});
