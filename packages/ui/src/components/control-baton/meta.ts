import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "control-baton",
  title: "Control Baton",
  description:
    "Shows whether the agent or the person has control, and lets the person take over and hand back with a note the agent receives.",
  category: "ai",
  status: "experimental",
  dependencies: ["class-variance-authority"],
  registryDependencies: ["agent-surface"],
  files: ["control-baton.tsx"],
  a11y:
    "A named group whose status is a sentence — who has control, and why when the agent asked for help — never " +
    "the colour of the presence dot alone. Outside an AgentSurface the status line is itself a polite live " +
    "region present from first paint; inside one it is not, since the surface already announces the change and " +
    "two regions would say it twice. There is one action button whose label and purpose follow the holder, so " +
    "focus stays on it as control changes. Hand back… opens a labelled note field and moves focus into it; " +
    "Ctrl/⌘+Enter hands back, Escape cancels, and either returns focus to the button. If control moves " +
    "elsewhere while the note is open, the note closes and focus returns to the button rather than falling to " +
    "the page. The baton is marked data-agent-ui, so using it never counts as taking over by input.",
});
