import type { ComponentType, ReactNode } from "react";

/**
 * The slice of Storybook's Component Story Format the docs previews rely on.
 *
 * Story modules are typed by Storybook's own generics, which are far more
 * elaborate than anything needed to render one. Rather than restate those types
 * — and break every time they change — modules cross this boundary as `unknown`
 * and are narrowed at runtime. The guards below are the whole contract.
 */

export type StoryArgs = Record<string, unknown>;

export interface StoryDecoratorContext {
  args: StoryArgs;
  globals: Record<string, unknown>;
  parameters: Record<string, unknown>;
}

export type StoryDecorator = (
  Story: ComponentType,
  context: StoryDecoratorContext,
) => ReactNode;

export interface StoryMeta {
  component?: ComponentType<StoryArgs>;
  args?: StoryArgs;
  decorators: StoryDecorator[];
}

export interface Story {
  args?: StoryArgs;
  render?: ComponentType<StoryArgs>;
}

/** A story module, before narrowing. */
export interface StoryModule {
  default?: unknown;
  [exportName: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * A story is an object with a `render` or `args`.
 *
 * Checked rather than assumed because a story file also exports its meta and,
 * occasionally, plain helpers.
 */
export function asStory(value: unknown): Story | undefined {
  if (!isRecord(value)) return undefined;

  const render =
    typeof value.render === "function" ? (value.render as ComponentType<StoryArgs>) : undefined;
  const args = isRecord(value.args) ? (value.args as StoryArgs) : undefined;

  if (!render && !args) return undefined;
  return { render, args };
}

export function asStoryMeta(value: unknown): StoryMeta | undefined {
  if (!isRecord(value)) return undefined;

  return {
    component:
      typeof value.component === "function"
        ? (value.component as ComponentType<StoryArgs>)
        : undefined,
    args: isRecord(value.args) ? value.args : undefined,
    // Storybook accepts a single decorator or an array of them.
    decorators: toDecorators(value.decorators),
  };
}

function toDecorators(value: unknown): StoryDecorator[] {
  if (typeof value === "function") return [value as StoryDecorator];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is StoryDecorator => typeof entry === "function");
}
