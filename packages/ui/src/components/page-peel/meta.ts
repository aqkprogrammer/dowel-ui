import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "page-peel",
  title: "Page Peel",
  description:
    "A surface whose corner peels back like a sticker to reveal what is underneath — hinted on hover, dragged, or toggled.",
  category: "effects",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["page-peel.tsx"],
  a11y:
    'Peeling is a real toggle button at the lifting corner, named "Peel back" (or `label`) and exposed with ' +
    "aria-pressed, so it works by keyboard, touch and switch access, not only by dragging. The face peeled away is " +
    "inert and aria-hidden, and the revealed content stays inert until it is revealed, so Tab never lands on " +
    "something that cannot be seen. Hover and keyboard focus only hint with a small curl. Releasing a drag never also " +
    "counts as a click. The corner is logical: `bottom-end` lifts at the bottom-left in right-to-left text. Every " +
    "transition uses the duration tokens, so under reduced motion the peel is an instant swap.",
  guidance: {
    useWhen: [
      "a playful reveal of a secondary layer: a coupon code, a hidden detail, a back-of-card note",
    ],
    avoidWhen: [
      "content people need to compare front and back of repeatedly — use flip-card",
      "anything essential that should not hide behind a gesture",
    ],
    alternatives: ["flip-card", "comparison-slider"],
  },
});
