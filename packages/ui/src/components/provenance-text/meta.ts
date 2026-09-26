import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "provenance-text",
  title: "Provenance Text",
  description:
    "Text that shows who wrote each part of it — the person, an agent or a quoted source — with each author's share.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority", "diff"],
  registryDependencies: ["button"],
  files: ["provenance-text.tsx", "provenance.ts"],
  a11y:
    "Hidden by default, it is a plain paragraph with nothing extra to hear. One toggle button (aria-pressed, " +
    "aria-controls the paragraph) turns provenance on; its name stays the same and its state is what is " +
    'announced. Shown, each marked run is bracketed by visually hidden words — "Claude wrote: … End of ' +
    'Claude\'s text." for an agent, "Quoted from Wikipedia: … End quote." for a source — rather than by ' +
    "mark, ins or aria-description, whose announcement varies between screen readers; the words also reach " +
    "braille and are unselectable, so copying the paragraph copies only the paragraph. Nothing gets a tab " +
    "stop except an author with an href, whose words become a link. The legend is a named list placed " +
    "between the toggle and the text, so the next thing heard after pressing is who wrote what: each author " +
    'with their kind in words and a share, "Claude (agent) 31%". Agent and source marks differ in underline ' +
    "shape, solid and heavy against dashed, so they stay apart in monochrome and forced colours. No live " +
    "region: the only change the component makes is the one the person just asked for.",
});
