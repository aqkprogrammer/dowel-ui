import type { GeneratedControl } from "./controls.generated";
import type { StoryArgs, StoryMeta } from "./story-types";

/**
 * The controls the playground offers for one component.
 *
 * Two sources. The registry derives a control for every prop whose type names
 * its values — a union of literals, `boolean`, `number`, `string` — refined by
 * the component's `meta.controls` hints (a number's range, mostly). A story's
 * `argTypes` is hand-curated for Storybook and wins where both describe a prop:
 * an author who narrowed a select's options, or gave a slider a tighter range,
 * did so on purpose.
 */

export type ControlKind = "select" | "boolean" | "number" | "text" | "color";

export type ControlValue = string | number | boolean;

export interface Control {
  prop: string;
  kind: ControlKind;
  /** A select's values. Numbers stay numbers, so `level={2}` is written as one. */
  options: (string | number)[];
  /** A number's bounds and step. With both bounds, it is a slider. */
  min?: number;
  max?: number;
  step?: number;
  /** Value the component uses when the prop is absent. */
  fallback?: ControlValue;
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
  // Identity, not appearance: an id typed into the preview can collide with
  // one on the page around it.
  "id",
]);

/** Kinds in the order the panel lists them: choices first, free text last. */
const KIND_ORDER: Record<ControlKind, number> = {
  select: 0,
  boolean: 1,
  number: 2,
  color: 3,
  text: 4,
};

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
    case "text":
      return "text";
    case "color":
      return "color";
    default:
      return undefined;
  }
}

/**
 * `derived` is the item's entry in the generated controls table. It is passed
 * in rather than looked up, so a page that shows one component can be handed
 * that component's controls by the server instead of shipping every item's.
 */
export function controlsFor(
  derived: readonly GeneratedControl[] | undefined,
  meta: StoryMeta | undefined,
): Control[] {
  const controls = new Map<string, Control>();

  for (const entry of derived ?? []) {
    if (NEVER_CONTROLLED.has(entry.prop)) continue;
    controls.set(entry.prop, {
      prop: entry.prop,
      kind: entry.kind,
      options: entry.kind === "select" ? entry.options : [],
      ...(entry.kind === "number" ? { min: entry.min, max: entry.max, step: entry.step } : {}),
      fallback: entry.default,
    });
  }

  // Curated second, so it overwrites.
  for (const [prop, argType] of Object.entries(meta?.argTypes ?? {})) {
    if (NEVER_CONTROLLED.has(prop) || argType.disabled) {
      controls.delete(prop);
      continue;
    }

    const kind = kindOf(argType.control);
    if (!kind) continue;
    const known = controls.get(prop);
    const options =
      (argType.options?.length ?? 0) >= 2 ? (argType.options ?? []) : (known?.options ?? []);
    if (kind === "select" && options.length < 2) continue;

    controls.set(prop, {
      prop,
      kind,
      options: kind === "select" ? options : [],
      ...(kind === "number"
        ? {
            min: argType.min ?? known?.min,
            max: argType.max ?? known?.max,
            step: argType.step ?? known?.step,
          }
        : {}),
      fallback: known?.fallback,
    });
  }

  return [...controls.values()].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.prop.localeCompare(b.prop),
  );
}

/** A number control with both bounds is a slider; without them, a number field. */
export function hasRange(control: Control): control is Control & { min: number; max: number } {
  return (
    control.kind === "number" &&
    control.min !== undefined &&
    control.max !== undefined &&
    control.max > control.min
  );
}

/**
 * The value a control starts on: what the story shows, else the component's
 * own default. A prop with neither starts unset rather than on an invented
 * value — a number field that opens on 0 would pass 0, which is not the same
 * as passing nothing.
 */
export function initialValue(control: Control, args: StoryArgs): ControlValue | undefined {
  const fromStory = args[control.prop];
  if (
    typeof fromStory === "string" ||
    typeof fromStory === "number" ||
    typeof fromStory === "boolean"
  ) {
    return fromStory;
  }
  if (control.fallback !== undefined) return control.fallback;
  return control.kind === "boolean" ? false : undefined;
}

function attribute(control: Control, value: unknown): string | undefined {
  const { prop } = control;
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true) return prop;
  // `loading={false}` is the same as omitting it — unless the component
  // defaults to true, in which case false is the whole point.
  if (value === false) return control.fallback === true ? `${prop}={false}` : undefined;
  if (typeof value === "number") return `${prop}={${String(value)}}`;
  if (typeof value === "string") {
    return value.includes('"') ? `${prop}={${JSON.stringify(value)}}` : `${prop}="${value}"`;
  }
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
      return attribute(control, value);
    })
    .filter((entry): entry is string => entry !== undefined);

  // No children: a self-closing tag, as it would be written.
  if (children === "") {
    const oneLine = `<${tag}${attributes.map((entry) => ` ${entry}`).join("")} />`;
    if (oneLine.length <= 72) return oneLine;
    return [`<${tag}`, ...attributes.map((entry) => `  ${entry}`), `/>`].join("\n");
  }

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

/*
 * Sharing a configuration through the URL.
 *
 * Only what the reader changed is written, one `p.<prop>` parameter each, so a
 * link is as short as the change. Reading goes back through the same control
 * definitions: a URL can only set a prop the panel could set, to a value the
 * panel could have chosen. Nothing in it is evaluated, and nothing reaches the
 * component that a control would not have put there.
 */

export const PROP_PARAM = "p.";

/** The longest text a link may carry into a prop. */
export const MAX_TEXT_PARAM = 200;

/**
 * What a colour from a URL may contain: names, hex, and functional notation
 * (`oklch(…)`, `var(--color-primary)`, `color-mix(…)`). No quotes, colons,
 * slashes or semicolons — so no `url()`, and nothing that could end the value.
 */
const SAFE_COLOR = /^[\w#(),.%\s-]+$/;

export function encodeOverrides(
  overrides: Record<string, unknown>,
  controls: Control[],
): [string, string][] {
  const entries: [string, string][] = [];
  for (const control of controls) {
    const value = overrides[control.prop];
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean")
      entries.push([PROP_PARAM + control.prop, value ? "1" : "0"]);
    else if (typeof value === "number" || typeof value === "string") {
      entries.push([PROP_PARAM + control.prop, String(value)]);
    }
  }
  return entries;
}

export function decodeOverrides(
  params: Pick<URLSearchParams, "get">,
  controls: Control[],
): Record<string, ControlValue> {
  const decoded: Record<string, ControlValue> = {};
  for (const control of controls) {
    const raw = params.get(PROP_PARAM + control.prop);
    if (raw === null) continue;
    const value = decodeValue(control, raw);
    if (value !== undefined) decoded[control.prop] = value;
  }
  return decoded;
}

function decodeValue(control: Control, raw: string): ControlValue | undefined {
  switch (control.kind) {
    case "boolean":
      return raw === "1" ? true : raw === "0" ? false : undefined;
    case "number": {
      if (raw.trim() === "") return undefined;
      const number = Number(raw);
      if (!Number.isFinite(number)) return undefined;
      if (hasRange(control)) return Math.min(control.max, Math.max(control.min, number));
      return number;
    }
    case "select":
      return control.options.find((option) => String(option) === raw);
    case "color":
      return raw.length <= MAX_TEXT_PARAM && SAFE_COLOR.test(raw) ? raw : undefined;
    case "text":
      return raw.length <= MAX_TEXT_PARAM ? raw : undefined;
  }
}
