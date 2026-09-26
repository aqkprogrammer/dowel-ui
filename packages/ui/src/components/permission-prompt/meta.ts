import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "permission-prompt",
  title: "Permission Prompt",
  description:
    "Ask for a capability when it is needed — what it allows and doesn't, the risk in words — and allow once, for the session, always, or not at all.",
  category: "ai",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["permission-prompt.tsx", "permission-grants.ts", "permission-queue.ts"],
  a11y:
    'A section named by its heading — "Claude wants to read your calendar" — so it is a region a reader can ' +
    'find and hears announced by name. What it allows and does not are two lists, each named by its own line ("This ' +
    'lets Claude:", "Claude can\'t:"). Risk is a word with a decorative icon beside it, never a border colour ' +
    'alone, and each Allow button is described by it, so someone tabbing straight to Allow still hears "High ' +
    'risk". A prompt does not take focus by default, because one that does can take a keypress meant for ' +
    "something else; instead a polite status region, present from mount and filled a moment later, says a " +
    "request has arrived. With autoFocus, focus lands on the section itself rather than on Allow, so a stray " +
    "Enter grants nothing, and the announcement is skipped because the focus already says it. After a choice " +
    "made from inside the prompt, focus moves to the one-line result (tabindex -1, never a Tab stop); Change " +
    "returns it to the current choice and Cancel back to Change. A decision applied from elsewhere never moves " +
    "focus. usePermissionPrompt shows one request at a time, states how many are waiting, and when the person " +
    "answers from inside the prompt, moves focus to the next request rather than letting it fall to the page. " +
    "The root is data-agent-ui, so answering never counts as taking over an agent surface.",
});
