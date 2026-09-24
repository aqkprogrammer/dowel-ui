import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "notification-bell",
  title: "Notification Bell",
  description:
    "A round bell button with an unread badge: the bell swings when notifications land — harder when several land at once — and the count rolls.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority", "motion", "radix-ui"],
  registryDependencies: ["notification-badge"],
  files: ["notification-bell.tsx"],
  a11y:
    'The built-in bell is a button named "Notifications, 3 unread" (overridable with `label`, or a function of ' +
    "the count), so the count is part of its name; the bell glyph and the badge's digits are aria-hidden. With " +
    'asChild your element keeps its own name and the badge adds ", 3 unread" after it. Changes are silent by ' +
    "default (ADR 0004); `live` adds a polite status region that announces the settled name once the count " +
    "stops changing, not once per arrival. Colour is never the only signal — the number, or the dot's presence, " +
    "is. The swing is skipped under reduced motion, and the badge's pop and shrink snap.",
});
