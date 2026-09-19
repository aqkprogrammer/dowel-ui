import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "now-playing",
  title: "Now Playing",
  description:
    "A compact music mini-player that expands in place, with a morphing play button, a like and a seek slider.",
  category: "display",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["now-playing.tsx"],
  a11y:
    "The track itself is the expand control: a button named by track and artist with aria-expanded. Restart, " +
    'Play/Pause (its name follows the state), Next and a Like toggle (aria-pressed) are real buttons. Progress is a role="slider" ' +
    'with "0:52 of 3:34" value text: arrows seek 5 seconds (mirrored in right-to-left layouts), PageUp/PageDown 30, ' +
    "Home/End the ends, and Space plays or pauses while it has focus. Controls that are hidden while collapsed " +
    "leave the tab order. Album art is decorative unless artworkAlt is given. Motion stops under reduced motion.",
});
