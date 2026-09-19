import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "tick-progress",
  title: "Tick Progress",
  description:
    "A percentage drawn as a row of waveform ticks under a big figure — a progress bar, or a slider with hover preview.",
  category: "data",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["tick-progress.tsx"],
  a11y:
    'Display mode is a role="progressbar" with aria-valuenow and a "%" value text. `interactive` makes it a ' +
    'role="slider": focusable, with a focus ring; arrows step one tick (mirrored in right-to-left layouts), ' +
    "PageUp/PageDown five, Home/End the ends, and keys commit immediately as the APG slider pattern requires. " +
    "Hover preview and click-to-commit are pointer conveniences over that. The ticks and the figure are " +
    "aria-hidden because the role already carries the value; name it with aria-label or aria-labelledby.",
});
