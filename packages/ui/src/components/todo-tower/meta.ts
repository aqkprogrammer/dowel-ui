import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "todo-tower",
  title: "Todo Tower",
  description:
    "To-do cards stacked like bricks: tick one and it flicks away as the cards above drop; drag one and the stack sways.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: [],
  files: ["todo-tower.tsx"],
  a11y:
    'A labelled list. Each card\'s check is a real button named "Done: <task>", so Tab and Enter/Space complete ' +
    "tasks; completion is announced politely and focus moves to the card that drops into the gap. Dragging and " +
    "swaying the stack is decoration with no keyboard equivalent because it does nothing. Under reduced motion " +
    "there is no sway, flick or drop.",
});
