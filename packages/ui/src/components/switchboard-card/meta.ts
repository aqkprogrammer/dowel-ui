import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "switchboard-card",
  title: "Switchboard Card",
  description:
    "A feature card illustrated by a grid of tiny lights — a lit pattern such as a word, or random flicker.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["switchboard-card.tsx"],
  a11y:
    "The lights are decorative and aria-hidden unless illustrationLabel describes them (a pattern spelling a word), " +
    'in which case the grid is a single role="img". The heading level is set with headingAs. With href the whole ' +
    "card is one link, or use asChild to render a router link or a button; the focus ring is shared. The flicker " +
    "pauses off-screen and in hidden tabs, and under reduced motion it never starts: a still frame is shown instead.",
});
