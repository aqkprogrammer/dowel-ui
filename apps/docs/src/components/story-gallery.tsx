"use client";

import { useMemo } from "react";

import { LiveStage } from "./live-stage";
import { StoryPreview, getStoryNames } from "./story-preview";

/**
 * Every example of a component at once, each live and operable.
 *
 * The preview above shows one example at a time at full size; this shows the
 * rest side by side, so variants and sizes can be compared at a glance rather
 * than flicked through. The same stories, so there is nothing here the tests
 * do not also run.
 */
export function StoryGallery({ component, limit = 12 }: { component: string; limit?: number }) {
  const stories = useMemo(() => getStoryNames(component).slice(0, limit), [component, limit]);
  if (stories.length < 2) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {stories.map((story) => (
        <li
          key={story}
          className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]"
        >
          <LiveStage
            interactive
            className="stage-surface h-56"
            stageWidth={460}
            fill={0.84}
            placeholder={<div className="absolute inset-0" />}
          >
            <StoryPreview component={component} story={story} />
          </LiveStage>
          <p className="border-t border-[var(--hairline)] px-4 py-2.5 font-mono text-xs text-muted-foreground">
            {story.replace(/([a-z])([A-Z])/g, "$1 $2")}
          </p>
        </li>
      ))}
    </ul>
  );
}
