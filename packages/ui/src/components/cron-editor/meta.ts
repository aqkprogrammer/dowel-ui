import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "cron-editor",
  title: "Cron Editor",
  description:
    "A schedule as a cron expression, with a plain-language reading and the next runs.",
  category: "form",
  status: "stable",
  dependencies: [],
  registryDependencies: ["input", "select"],
  files: ["cron-expression.ts", "cron-editor.tsx"],
  a11y:
    "The expression field is described by one element that holds either the plain-language " +
    "reading or the reason the expression is invalid, so a reader hears the error replace the " +
    "reading rather than both at once; an invalid expression is never applied. The builder's " +
    "day buttons are a named group of aria-pressed toggles with the full day name as the " +
    "accessible name, and the last selected day cannot be removed silently — the group says why. " +
    "Days 29 to 31 say in text that shorter months skip them. Next runs are a list of time " +
    "elements with machine-readable datetimes, headed by the zone they are in, because a time " +
    "with no zone is the classic scheduling mistake. Nothing clock-dependent renders until the " +
    "clock is known, so server and client cannot disagree.",
});
