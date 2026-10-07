import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "spinner",
  title: "Spinner",
  description: "An indeterminate loading indicator for buttons, panels and inline content.",
  category: "feedback",
  status: "stable",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["spinner.tsx"],
  a11y:
    "Renders aria-hidden by default so it does not announce inside controls that already " +
    'expose a busy state. Pass `label` to announce it standalone via role="status".',
  guidance: {
    useWhen: ["an indeterminate wait inside a button, panel or line of text"],
    avoidWhen: [
      "page content loading in place — use skeleton",
      "a task whose progress is known — use progress",
      "waiting on a model — use ai-loader",
    ],
    alternatives: ["skeleton", "progress", "ai-loader", "ring-loader"],
  },
});
