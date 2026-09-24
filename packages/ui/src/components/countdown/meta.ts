import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "countdown",
  title: "Countdown",
  description:
    "A countdown to a date whose days, hours, minutes and seconds roll digit by digit, compact or as labelled tiles.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["number-flow"],
  files: ["countdown.tsx"],
  a11y:
    'role="timer" with aria-live off: a timer that spoke every second would drown out everything else. The ' +
    'rolling digits are aria-hidden; assistive technology reads one sentence — "2 days, 3 hours, and 4 minutes ' +
    'remaining" — as text content, which changes at most once a minute. `live` makes that sentence (and only ' +
    "that sentence) a polite live region. Unit names are localised through Intl; the surrounding sentences " +
    "are in `labels`. Before hydration the digits are dashes and the sentence is empty, so server and client " +
    "agree. Under reduced motion the digits change without rolling.",
});
