import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "theme-toggle",
  title: "Theme Toggle",
  description:
    "A light/dark switch whose sun retracts its rays and is eclipsed into a crescent moon — as an icon button or a switch track.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["theme-toggle.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked (on = dark), toggled by click, Space ' +
    'or Enter, with the shared focus ring. It is named "Dark mode" unless given aria-label or aria-labelledby. ' +
    "A switch rather than an aria-pressed button because it flips a setting that applies at once, and on/off " +
    "says what is true now, where a pressed sun or moon is ambiguous. The glyph is aria-hidden. It never " +
    "changes the document itself; the consumer applies the theme from onThemeChange. Under reduced motion " +
    "the sun and moon swap instantly.",
});
