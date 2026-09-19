import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "browser-tabs",
  title: "Browser Tabs",
  description:
    "A miniature browser window whose tabs are a real tablist: a card-coloured leaf springs under the active tab, and tabs reorder by drag or keyboard.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["browser-tabs.tsx", "browser-tabs-spring.ts"],
  a11y:
    'The strip is role="tablist" (named by labels.tabList) of role="tab" buttons with aria-selected, aria-controls and ' +
    'aria-posinset/aria-setsize reporting each tab\'s visual position; one role="tabpanel" is labelled by the active ' +
    "tab. Left/Right (mirrored in right-to-left layouts) move focus and select with wrap-around, Home/End jump to the " +
    "ends. Alt+Left/Right and Ctrl+Shift+PageUp/PageDown move the focused tab one slot, and every move — keyboard or " +
    'drag — is announced through a polite live region ("Moved Finds to position 1 of 2"), so dragging is never the ' +
    "only way to reorder. Back, forward and reload are decorative (aria-hidden) unless onBack/onForward/onReload are " +
    "given, when they become named buttons. The leaf and its ears are aria-hidden; the springs are CSS transitions " +
    "that settle at once under reduced motion.",
});
