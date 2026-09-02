import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "time-range-picker",
  title: "Time Range Picker",
  description:
    "A time range whose value is an expression, so it stays relative across a reload.",
  category: "form",
  status: "stable",
  dependencies: ["react-day-picker"],
  registryDependencies: ["button", "calendar", "input", "popover"],
  files: ["time-expression.ts", "time-range-picker.tsx"],
  a11y:
    'The trigger is named by the range it holds — "Last 6 hours" — and the window that ' +
    "resolves to is read after it, so the relative choice is not replaced by two timestamps. " +
    'The popover carries role="dialog" and is named. Presets are buttons rather than radios ' +
    "because choosing one both selects and dismisses, with aria-pressed carrying which matches " +
    "the current expression. The expression field reports why an unparseable entry is invalid " +
    "through one aria-describedby element that the preview and the error share, so a reader " +
    "hears the error replace the preview rather than both at once; an invalid expression is " +
    "never applied, because a chart silently re-scoping itself is worse than one that refuses.",
});
