import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "pill-toast",
  title: "Pill Toast",
  description:
    "A compact pill toast that drops in from above with a blur and a slight overshoot, then dismisses itself upward.",
  category: "feedback",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["pill-toast.tsx"],
  a11y:
    'The root is an always-mounted polite live region (role="status", aria-atomic) and the message is inserted when the ' +
    "toast opens, so screen readers announce it once without interrupting. The icon is aria-hidden; the text carries the " +
    "meaning. Hovering or focusing the pill holds the auto-dismiss timer, and `duration={Infinity}` keeps it until you " +
    "close it. It is not a place for actions or anything the user must act on: use toast or alert for that. Under reduced " +
    "motion the pill appears and disappears without the drop, blur or overshoot.",
  guidance: {
    useWhen: [
      "a brief confirmation of something that just succeeded, such as saved, copied or added",
    ],
    avoidWhen: [
      "errors or messages with actions — use toast",
      "anything the user must not miss — use alert or alert-dialog",
    ],
    alternatives: ["toast", "alert", "copy-button"],
  },
});
