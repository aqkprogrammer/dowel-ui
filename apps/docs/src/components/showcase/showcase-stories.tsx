"use client";

import * as aiChatStories from "@ui/blocks/ai-chat/ai-chat.stories";
import * as analyticsStories from "@ui/blocks/analytics/analytics.stories";
import * as dashboardStories from "@ui/blocks/dashboard/dashboard.stories";
import * as loginStories from "@ui/blocks/login/login.stories";
import * as pricingThreeTierStories from "@ui/blocks/pricing-three-tier/pricing-three-tier.stories";
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
 * the front page's live previews are one small chunk rather than the whole
 * library. A tile naming a story missing from here renders nothing — the
 * home page's lists and this map are kept in step for that reason.
 */
const modules: Record<string, StoryModule> = {
  "ai-chat": aiChatStories,
  analytics: analyticsStories,
  "contribution-graph": contributionGraphStories,
  dashboard: dashboardStories,
  dial: dialStories,
  "dither-donut": ditherDonutStories,
  "fluid-orb": fluidOrbStories,
  "liquid-toggle": liquidToggleStories,
  login: loginStories,
  "magnify-dock": magnifyDockStories,
  "orb-face": orbFaceStories,
  "pricing-three-tier": pricingThreeTierStories,
  "shimmer-text": shimmerTextStories,
  "typewriter-text": typewriterTextStories,
};

export function ShowcaseStory({ component, story }: { component: string; story: string }) {
  const storyModule = modules[component];
  if (!storyModule) return null;
  return <StoryRender module={storyModule} story={story} />;
}
