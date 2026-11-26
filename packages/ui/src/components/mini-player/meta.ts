import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "mini-player",
  title: "Mini Player",
  description:
    "A compact music card whose artwork crossfades and titles slide on a track change, with an equaliser, progress and transport controls.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: [],
  files: ["mini-player.tsx"],
  a11y:
    'A group named "Music player" with three real buttons: "Previous track", "Play"/"Pause" (the name changes ' +
    'with the state, as media players are announced) and "Next track", each with a visible focus ring. Position ' +
    'is a progressbar with a "0:42 of 3:10" value text that is never announced on its own. A track change is ' +
    "announced once in a polite live region. Artwork and the equaliser are aria-hidden. The progress bar and " +
    "transport controls keep left-to-right order in right-to-left layouts, as media timelines do; the titles " +
    "follow the page. Under reduced motion track changes land at once and the equaliser stops; the clock is " +
    "real time and unaffected.",
  guidance: {
    useWhen: [
      "a small persistent audio player, like a now-playing widget in a sidebar or dashboard",
    ],
    avoidWhen: [
      "a full player with seeking, volume and a queue — build one on slider and audio-visualizer",
      "showing what is playing without controls — use now-playing",
    ],
    alternatives: ["now-playing", "audio-visualizer"],
  },
});
