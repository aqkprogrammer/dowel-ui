import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "story-viewer",
  title: "Story Viewer",
  description:
    "A story card whose segmented progress bars fill in turn while the slides crossfade, with tap zones to step through.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["story-viewer.tsx"],
  a11y:
    'The root is a labelled region with aria-roledescription="carousel" (named "Stories" unless you pass aria-label), and ' +
    'each slide is a group named "2 of 3: <label>", with inactive slides aria-hidden. The start and end halves of the ' +
    'media are real buttons ("Previous story", "Next story", renameable through `labels`) with a visible focus ring, and ' +
    "ArrowLeft and ArrowRight step through anywhere in the card, swapped in right-to-left layouts. Hovering the card or " +
    "moving focus into it pauses the auto-advance, as does `paused`, so nobody has to race the timer; the slide area is a " +
    "polite live region only while paused, so the user's own steps are announced and the auto-advance is not. Progress " +
    "bars and placeholder art are aria-hidden. Under reduced motion slides swap without the crossfade.",
  guidance: {
    useWhen: [
      "a short sequence of full-bleed media that plays on its own, like a recap or onboarding story",
    ],
    avoidWhen: [
      "content people need to read at their own pace — use carousel",
      "a long or essential sequence, which auto-advance makes harder to follow",
    ],
    alternatives: ["carousel", "swipe-carousel", "photo-stack"],
  },
});
