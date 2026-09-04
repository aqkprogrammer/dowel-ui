import { componentVariants } from "./variants.generated";
import type { StoryArgs, StoryMeta } from "./story-types";

/**
 * The controls the playground offers for one component.
 *
 * Two sources, and neither is complete on its own. A story's `argTypes` is
 * hand-curated and knows about props that are not variants — `loading`,
 * `disabled`, a numeric `value` — but only 22 of the 70 components declare it.
 * The `cva()` call is generated from and knows every variant axis, but nothing
 * else. Merging gives the union, with the curated source winning where both
 * describe the same prop.
 */

export type ControlKind = "select" | "boolean" | "number";

export interface Control {
  prop: string;
  kind: ControlKind;
  options: string[];
  /** Value the component uses when the prop is absent. */
  fallback?: string;
}

/** Props no control should ever set, whatever the metadata says. */
const NEVER_CONTROLLED = new Set([
  // Renders the child as the element. Nothing sensible to type into a control,
  // and setting it without a suitable child breaks the preview.
  "asChild",
  // Content, not configuration. The playground supplies its own.
  "children",
  "className",
  "style",
  "ref",
  "key",
]);

function kindOf(control: string | undefined): ControlKind | undefined {
  switch (control) {
    case "select":
    case "radio":
    case "inline-radio":
    case "check":
    case "inline-check":
      return "select";
    case "boolean":
      return "boolean";
    case "number":
    case "range":
      return "number";
    default:
      return undefined;
  }
}

export function controlsFor(name: string, meta: StoryMeta | undefined): Control[] {
  const controls = new Map<string, Control>();

  for (const axis of componentVariants[name] ?? []) {
    if (NEVER_CONTROLLED.has(axis.prop)) continue;
    controls.set(axis.prop, {
      prop: axis.prop,
      kind: "select",
      options: axis.options,
      fallback: axis.fallback,
    });
  }

  // Curated second, so it overwrites: a story author who narrowed the options
  // for a variant did so on purpose.
  for (const [prop, argType] of Object.entries(meta?.argTypes ?? {})) {
    if (NEVER_CONTROLLED.has(prop) || argType.disabled) {
      controls.delete(prop);
      continue;
    }

    const kind = kindOf(argType.control);
    if (!kind) continue;
    if (kind === "select" && (argType.options?.length ?? 0) < 2) continue;

    controls.set(prop, {
      prop,
      kind,
      options: argType.options ?? [],
      fallback: controls.get(prop)?.fallback,
    });
  }

  return [...controls.values()].sort((a, b) => a.prop.localeCompare(b.prop));
}

/** The value a control starts on: what the story shows, else the cva default. */
export function initialValue(control: Control, args: StoryArgs): unknown {
  const fromStory = args[control.prop];
  if (fromStory !== undefined) return fromStory;
  if (control.fallback !== undefined) return control.fallback;
  return control.kind === "boolean" ? false : control.options[0];
}

function attribute(prop: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  // `loading={false}` is the same as omitting it, and the shorter form is what
  // someone would actually write.
  if (value === false) return undefined;
  if (value === true) return prop;
  if (typeof value === "number") return `${prop}={${String(value)}}`;
  if (typeof value === "string") return `${prop}="${value}"`;
  return undefined;
}

/**
 * The JSX for the current selection.
 *
 * Written as someone would write it by hand, which means a prop left at the
 * component's own default is omitted rather than spelled out: a snippet full of
 * redundant defaults teaches the wrong thing about the API.
 */
export function generateJsx(
  tag: string,
  values: Record<string, unknown>,
  controls: Control[],
  children: string,
): string {
  const attributes = controls
    .map((control) => {
      const value = values[control.prop];
      if (control.fallback !== undefined && value === control.fallback) return undefined;
      return attribute(control.prop, value);
    })
    .filter((entry): entry is string => entry !== undefined);

  if (attributes.length === 0) {
    return `<${tag}>${children}</${tag}>`;
  }

  const oneLine = `<${tag} ${attributes.join(" ")}>${children}</${tag}>`;
  if (oneLine.length <= 72) return oneLine;

  return [
    `<${tag}`,
    ...attributes.map((entry) => `  ${entry}`),
    `>`,
    `  ${children}`,
    `</${tag}>`,
  ].join("\n");
}

/** PascalCase export name for a registry name, e.g. "ai-tool" -> "AiTool". */
export function componentTag(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
