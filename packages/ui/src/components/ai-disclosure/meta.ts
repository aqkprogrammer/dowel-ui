import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "ai-disclosure",
  title: "AI Disclosure",
  description: "Tells a reader they are looking at AI, and what is actually known about it.",
  category: "ai",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["popover"],
  files: ["ai-disclosure.tsx"],
  a11y:
    "The text is the disclosure and the icon is decoration, marked aria-hidden — a sparkle alone " +
    "is a mark a sighted reader may not decode and a screen reader passes over in silence, which " +
    "is the exact failure this component exists to prevent. Each of the four kinds carries " +
    "wording of its own, so the distinction between generated, manipulated and human-reviewed " +
    "survives for anyone who cannot see the styling. The provenance panel states in words " +
    "whether anyone checked the claims and who, rather than implying it with a tick, and its " +
    "three states are told apart by their sentences rather than by colour. " +
    "Scope: this renders the human-visible disclosures of EU AI Act Article 50(1) and 50(4). " +
    "It cannot satisfy 50(2), which requires machine-readable marking inside the artifact by " +
    "whoever generated it, and no React component can. Not legal advice.",
});
