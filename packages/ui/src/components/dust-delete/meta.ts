import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "dust-delete",
  title: "Dust Delete",
  description:
    "Deletes an item by turning it to dust: the row breaks into tiles of its own content that drift away, then it closes.",
  category: "effects",
  status: "beta",
  dependencies: [],
  registryDependencies: ["use-reduced-motion"],
  files: ["dust-delete.tsx"],
  a11y:
    'The deletion is announced through a polite role="status" region ("Deleted", or `announcement`). The dust is ' +
    "an aria-hidden layer of inert copies, so nothing in it can be focused, read or clicked, and the item itself goes " +
    "inert as soon as the effect starts. Move focus somewhere sensible in `onDeleted` — the next row, or the list — " +
    "since the deleted item's controls disappear. Every duration follows --motion-scale; under reduced motion there " +
    "is no dust, only a short fade and close.",
  guidance: {
    useWhen: [
      "a deliberate, final removal of one item in a list, where the moment deserves weight",
    ],
    avoidWhen: [
      "bulk deletes of many rows at once — animate the list, not each row",
      "deletions that can be undone with a toast — keep the row recoverable instead",
    ],
    alternatives: ["inline-confirm", "hold-button"],
  },
  composesWith: ["inline-confirm", "hold-button"],
});
