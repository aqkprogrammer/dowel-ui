import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "radial-menu",
  title: "Radial Menu",
  description:
    "A round button whose options fan out along an arc: press and drag onto one, click, or walk the ring with the keyboard.",
  category: "navigation",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["radial-menu.tsx"],
  a11y:
    'The core is a menu button (aria-haspopup="menu", aria-expanded, aria-controls) named by `label`; the ' +
    'options are role="menuitem" buttons named by their labels, in a role="menu" that is inert and ' +
    "aria-hidden while closed. Enter/Space opens and focuses the first option (Down/Up open onto the first " +
    "or last); Left/Right and Up/Down walk around the ring with wrap-around (Left/Right follow the visual " +
    "order in RTL), Home/End jump, Enter/Space select and return focus to the core, Escape closes and " +
    "refocuses the core, Tab and an outside press close. The press-and-drag marking gesture is a pointer " +
    "shortcut only; clicking and the keyboard reach every option. Captions are aria-hidden duplicates of " +
    "the names. The fly-out settles instantly under reduced motion.",
});
