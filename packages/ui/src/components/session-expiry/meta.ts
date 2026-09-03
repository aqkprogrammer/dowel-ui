import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "session-expiry",
  title: "Session Expiry",
  description:
    "The idle-timeout warning WCAG 2.2.1 asks for: warned, extendable, and not dismissable by accident.",
  category: "feedback",
  status: "stable",
  dependencies: [],
  registryDependencies: ["button", "dialog"],
  files: ["session-expiry.tsx"],
  a11y:
    "An alert dialog, named by its heading and described by the sentence that says how long is " +
    "left. Escape and the backdrop do nothing, because dismissing a session warning without " +
    "choosing is choosing nothing; the two buttons are the way out, and focus opens on the safe " +
    "one. The visible countdown is not live — a number every second for two minutes drowns the " +
    "question — and a separate status region speaks four times: when the warning opens, at one " +
    "minute, thirty seconds and ten, still saying a threshold a slow tick skipped over. The " +
    "clock is read in an effect, so the server renders nothing rather than a countdown from the " +
    "wrong instant. This satisfies the warn-and-extend half of WCAG 2.2.1 Timing Adjustable; the " +
    "twenty-second minimum is the default window's business and the application's.",
});
