import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "marquee",
  title: "Marquee",
  description:
    "Scrolls its children in a seamless, endless loop — horizontal or vertical, at a set speed, pausing on hover and focus.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["marquee.tsx"],
  a11y:
    "The content is rendered once for assistive technology: the copy that closes the loop, and any " +
    "`repeat` copies, are aria-hidden and inert, so nothing is announced or focused twice. It pauses " +
    "while hovered or while focus is inside it, and `paused` stops it outright for a visible pause " +
    "control (WCAG 2.2.2). Under prefers-reduced-motion it stops and becomes an ordinary, " +
    'keyboard-focusable scroller. The loop runs toward the inline start, so it mirrors under dir="rtl".',
});
