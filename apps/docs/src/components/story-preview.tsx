"use client";

import type { ComponentType, ReactNode } from "react";

import { storyModules } from "~/lib/previews.generated";
import {
  asStory,
  asStoryMeta,
  type StoryArgs,
  type StoryDecoratorContext,
} from "~/lib/story-types";

/**
 * Renders a Storybook story as a documentation preview.
 *
 * The examples on a component page are the same stories that run in CI, so
 * there is no second set of examples to quietly stop matching the component.
 * That is the rule the registry already follows for source.
 */

export interface StoryPreviewProps {
  /** Registry name of the component, e.g. "button". */
  component: string;
  /** Named export of the story. Defaults to the first one available. */
  story?: string;
  fallback?: ReactNode;
}

/** Story exports in file order, minus the meta and any plain helpers. */
export function getStoryNames(component: string): string[] {
  const storyModule = storyModules[component];
  if (!storyModule) return [];

  return Object.keys(storyModule).filter(
    (name) => name !== "default" && asStory(storyModule[name]) !== undefined,
  );
}

export function StoryPreview({ component, story, fallback }: StoryPreviewProps) {
  const storyModule = storyModules[component];
  if (!storyModule) return <>{fallback}</>;

  const name = story ?? getStoryNames(component)[0];
  const resolved = name === undefined ? undefined : asStory(storyModule[name]);
  const meta = asStoryMeta(storyModule.default);
  if (!resolved || !meta) return <>{fallback}</>;

  const args: StoryArgs = { ...meta.args, ...resolved.args };

  // Rendered as a component, not called as a function: stories use hooks, and
  // invoking them directly would break the rules of hooks.
  const Render: ComponentType<StoryArgs> | undefined = resolved.render ?? meta.component;
  if (!Render) return <>{fallback}</>;

  const context: StoryDecoratorContext = { args, globals: {}, parameters: {} };

  let node: ReactNode = <Render {...args} />;
  for (const decorator of meta.decorators) {
    const current = node;
    const Wrapped = () => <>{current}</>;
    node = decorator(Wrapped, context);
  }

  return <>{node}</>;
}
