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

/**
 * One control, as a story author declared it.
 *
 * Storybook's own `ArgTypes` is far wider than this — tables, mapping,
 * descriptions, per-control configuration — and none of the rest is used here.
 * Restating the parts that are keeps this from breaking when the rest changes.
 */
export interface StoryArgType {
  /** "select", "inline-radio", "boolean", "number", "range", "text". */
  control?: string;
  options?: string[];
  /** True when the author hid the control from the panel. */
  disabled: boolean;
}

export interface StoryMeta {
  component?: ComponentType<StoryArgs>;
  args?: StoryArgs;
  argTypes: Record<string, StoryArgType>;
  /** The author disabled controls for the whole component. */
  controlsDisabled: boolean;
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
 * A story is a plain object export.
 *
 * Requiring a `render` or `args` seemed like the safer guard and was not: the
 * canonical story is `export const Default: Story = {}`, which takes everything
 * from the meta and carries neither. Rejecting it hid 34 stories from the site,
 * including the default example on 25 component pages.
 *
 * A function or an array is not a story; anything else in a story file is one,
 * and `getStoryNames` excludes the meta by name rather than by shape.
 */
export function asStory(value: unknown): Story | undefined {
  // `isRecord` already excludes functions; an array is an object, so it does not.
  if (!isRecord(value) || Array.isArray(value)) return undefined;

  return {
    render:
      typeof value.render === "function"
        ? (value.render as ComponentType<StoryArgs>)
        : undefined,
    args: isRecord(value.args) ? value.args : undefined,
  };
}

export function asStoryMeta(value: unknown): StoryMeta | undefined {
  if (!isRecord(value)) return undefined;

  return {
    component:
      typeof value.component === "function"
        ? (value.component as ComponentType<StoryArgs>)
        : undefined,
    args: isRecord(value.args) ? value.args : undefined,
    argTypes: toArgTypes(value.argTypes),
    controlsDisabled: controlsDisabled(value.parameters),
    // Storybook accepts a single decorator or an array of them.
    decorators: toDecorators(value.decorators),
  };
}

/**
 * `control` is either a shorthand string or an object with a `type`.
 *
 * Both forms appear in this repository, so both are read rather than one being
 * declared canonical — the stories are written for Storybook, not for this.
 */
function controlType(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.type === "string") return value.type;
  return undefined;
}

function toArgTypes(value: unknown): Record<string, StoryArgType> {
  if (!isRecord(value)) return {};

  const found: Record<string, StoryArgType> = {};

  for (const [name, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;

    const table = isRecord(raw.table) ? raw.table : undefined;

    found[name] = {
      control: controlType(raw.control),
      options: Array.isArray(raw.options)
        ? raw.options.filter((option): option is string => typeof option === "string")
        : undefined,
      // `table.disable` hides a control the component has but the author did
      // not want in the panel — `asChild`, mostly. Offering it anyway would be
      // overriding a decision already made.
      disabled: raw.control === false || table?.disable === true,
    };
  }

  return found;
}

function controlsDisabled(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const controls = value.controls;
  return isRecord(controls) && controls.disable === true;
}

function toDecorators(value: unknown): StoryDecorator[] {
  if (typeof value === "function") return [value as StoryDecorator];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is StoryDecorator => typeof entry === "function");
}
