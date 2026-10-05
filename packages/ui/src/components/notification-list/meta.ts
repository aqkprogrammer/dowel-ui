import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "notification-list",
  title: "Notification List",
  description:
    "Notifications resting as a receding deck that springs open into a list on hover, focus or toggle, with cards that slide out when dismissed or swiped and a count that rolls.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority", "motion"],
  registryDependencies: ["number-flow"],
  files: ["notification-list.tsx"],
  a11y:
    "A section named by its header label, containing a real list (ul, role=list) of every notification — the deck " +
    "is presentation only, so collapsed cards stay in the accessibility tree, and moving keyboard focus into the " +
    "list fans it open so nothing focusable is hidden. The header is a disclosure button (aria-expanded, " +
    'aria-controls) named with the count ("Notifications, 3"), since the rolling digits are aria-hidden. Escape ' +
    'folds the deck. Every card has a dismiss button named "Dismiss <title>"; swiping is an optional extra, never ' +
    "the only way. When a dismissed card held focus, focus moves to the next card's button, else the previous, " +
    "else the toggle, and a polite status region announces the dismissal (empty on first paint). Icons are " +
    "aria-hidden, so put who or what in the title. Hover expansion is mouse-only. Under reduced motion the deck " +
    "opens, closes and reflows instantly.",
});
