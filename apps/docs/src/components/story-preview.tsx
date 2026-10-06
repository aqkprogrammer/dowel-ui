"use client";

import { use, type ReactNode } from "react";

import { storyLoaders, storyNames } from "~/lib/previews.generated";
import { StoryRender } from "~/lib/story-render";
import type { StoryModule } from "~/lib/story-types";

/**
 * Renders a Storybook story as a documentation preview.
 *
 * The examples on a component page are the same stories that run in CI, so
 * there is no second set of examples to quietly stop matching the component.
 * That is the rule the registry already follows for source.
 *
 * Each story file is its own chunk, fetched the first time something renders
 * one of its stories. Until it arrives the preview suspends, and the boundary
 * above it decides what holds its place: the component page's stage keeps its
 * height, and a gallery card keeps its placeholder.
 */

export interface StoryPreviewProps {
  /** Registry name of the component, e.g. "button". */
  component: string;
  /** Named export of the story. Defaults to the first one available. */
  story?: string;
  /** Shown when there is no such story — not while one is loading. */
  fallback?: ReactNode;
}

/**
 * Story exports in file order, minus the meta and any plain helpers.
 *
 * Read from the generated table, which the build takes from each file's source,
 * so a page can list a component's examples without fetching them. A module
 * namespace object would have sorted them, and showed whichever story was
 * alphabetically first as the canonical one.
 */
export function getStoryNames(component: string): string[] {
  return storyNames[component] ?? [];
}

const loaded = new Map<string, StoryModule>();
const loading = new Map<string, Promise<StoryModule>>();

/**
 * Starts fetching a component's stories, once, and returns the promise.
 *
 * Shared rather than per-render, because `use` needs the same promise on every
 * attempt to know it is the one it is already waiting for. A failed fetch is
 * forgotten, so the next render asks again rather than failing forever on a
 * dropped connection.
 */
function load(component: string): Promise<StoryModule> | undefined {
  const pending = loading.get(component);
  if (pending) return pending;

  const loader = storyLoaders[component];
  if (!loader) return undefined;

  const promise = loader().then(
    (storyModule) => {
      loaded.set(component, storyModule);
      return storyModule;
    },
    (error: unknown) => {
      loading.delete(component);
      throw error;
    },
  );
  loading.set(component, promise);
  return promise;
}

/**
 * A component's story module, suspending until it has arrived.
 *
 * A module already in hand is returned directly rather than through `use`,
 * which only learns a promise has settled by waiting on it: switching between
 * two examples of the same component would otherwise flash the fallback for a
 * frame each time.
 */
export function useStoryModule(component: string): StoryModule | undefined {
  const ready = loaded.get(component);
  if (ready) return ready;

  const pending = load(component);
  return pending ? use(pending) : undefined;
}

export function StoryPreview({ component, story, fallback }: StoryPreviewProps) {
  const storyModule = useStoryModule(component);
  if (!storyModule) return <>{fallback}</>;

  const name = story ?? getStoryNames(component)[0];
  if (name === undefined) return <>{fallback}</>;

  return <StoryRender module={storyModule} story={name} fallback={fallback} />;
}
