import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cover-flow",
  title: "Cover Flow",
  description:
    "A perspective stack of cards — the centre one large and in front, neighbours smaller, turned and dimmed — that springs to a new centre with ‹ › buttons or arrow keys.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["cover-flow.tsx"],
  a11y:
    'A focusable region with aria-roledescription="carousel" and a name (label, default "Gallery"). With ' +
    "focus on it, ArrowLeft and ArrowRight move between cards (swapped in right-to-left layouts, where the " +
    'stack also mirrors), and Home and End jump to the ends. Each card is a group named "2 of 5"; the cards ' +
    "off-centre are aria-hidden and their contents inert, so focus cannot land on a half-hidden card. The " +
    'Previous and Next buttons are named, mirror in RTL and disable at the ends unless `loop` is set. "Slide 2 ' +
    'of 5" is announced politely after each move. Under reduced motion the stack re-forms without animating.',
  guidance: {
    useWhen: [
      "browsing a short set of covers, cards or previews where the neighbours give context",
    ],
    avoidWhen: [
      "long lists or content that must be read side by side — use carousel or a grid",
      "autoplaying promotional slides — use carousel with its pause controls",
    ],
    alternatives: ["carousel", "carousel-3d", "card-stack"],
  },
});
