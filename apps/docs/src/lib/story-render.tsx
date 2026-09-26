"use client";

import type { ComponentType, ReactNode } from "react";

import {
  asStory,
  asStoryMeta,
  type StoryArgs,
  type StoryDecoratorContext,
  type StoryModule,
} from "./story-types";

/**
 * Renders one story from a module already in hand.
 *
 * Split from `StoryPreview` so a page can import the handful of story modules
 * it shows directly, rather than the generated table of every story in the
 * library — which is the difference between the home page shipping ten
 * components and shipping two hundred.
 */
export function StoryRender({
  module: storyModule,
  story,
  fallback,
}: {
  module: StoryModule;
  story: string;
  fallback?: ReactNode;
}) {
  const resolved = asStory(storyModule[story]);
  const meta = asStoryMeta(storyModule.default);
  if (!resolved || !meta) return <>{fallback}</>;

  const args: StoryArgs = { ...meta.args, ...resolved.args };

  // Rendered as a component, not called as a function: stories use hooks, and
  // invoking them directly would break the rules of hooks.
  // Storybook's precedence: the story's render, then the file's, then the bare
  // component.
  const Render: ComponentType<StoryArgs> | undefined =
    resolved.render ?? meta.render ?? meta.component;
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
