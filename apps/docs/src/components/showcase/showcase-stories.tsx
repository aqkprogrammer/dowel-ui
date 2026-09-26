"use client";

import * as contributionGraphStories from "@ui/components/contribution-graph/contribution-graph.stories";
import * as dialStories from "@ui/components/dial/dial.stories";
import * as ditherDonutStories from "@ui/components/dither-donut/dither-donut.stories";
import * as fluidOrbStories from "@ui/components/fluid-orb/fluid-orb.stories";
import * as liquidToggleStories from "@ui/components/liquid-toggle/liquid-toggle.stories";
import * as magnifyDockStories from "@ui/components/magnify-dock/magnify-dock.stories";
import * as orbFaceStories from "@ui/components/orb-face/orb-face.stories";
import * as shimmerTextStories from "@ui/components/shimmer-text/shimmer-text.stories";
import * as typewriterTextStories from "@ui/components/typewriter-text/typewriter-text.stories";

import { StoryRender } from "~/lib/story-render";
import type { StoryModule } from "~/lib/story-types";

/**
 * The stories the home page shows, and only those.
 *
 * Imported by name rather than through the generated table of every story, so
 * the front page's showcase is one small chunk rather than the whole library.
 * A tile naming a component missing from here renders nothing — the tile list
 * and this map are kept side by side in the showcase for that reason.
 */
const modules: Record<string, StoryModule> = {
  "contribution-graph": contributionGraphStories,
  dial: dialStories,
  "dither-donut": ditherDonutStories,
  "fluid-orb": fluidOrbStories,
  "liquid-toggle": liquidToggleStories,
  "magnify-dock": magnifyDockStories,
  "orb-face": orbFaceStories,
  "shimmer-text": shimmerTextStories,
  "typewriter-text": typewriterTextStories,
};

export function ShowcaseStory({ component, story }: { component: string; story: string }) {
  const storyModule = modules[component];
  if (!storyModule) return null;
  return <StoryRender module={storyModule} story={story} />;
}
