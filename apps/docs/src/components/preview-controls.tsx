"use client";

import { RotateCcw } from "lucide-react";
import { useMemo } from "react";

import type { GeneratedControl } from "~/lib/controls.generated";
import {
  componentTag,
  controlsFor,
  generateJsx,
  initialValue,
  type Control,
} from "~/lib/playground";
import { asStory, asStoryMeta, type StoryArgs } from "~/lib/story-types";

import { ControlField } from "./control-fields";
import { CodePanel } from "./site/code-panel";
import { useStoryModule } from "./story-preview";

/*
 * Controls on a component's own page: the playground's panel, beside the
 * example it changes.
 *
 * The values start where the example starts — the story's args, then the
 * component's defaults — so opening the panel changes nothing until a control
 * is touched, and only what was touched is passed on as an override. Both parts
 * read the story module, which the preview has already loaded, so neither
 * waits on anything the stage did not.
 */

interface ControlState {
  controls: Control[];
  values: Record<string, unknown>;
}

function useControlState(
  component: string,
  story: string,
  derived: readonly GeneratedControl[],
  overrides: StoryArgs,
): ControlState {
  const storyModule = useStoryModule(component);
  const meta = asStoryMeta(storyModule?.default);
  const resolved = asStory(storyModule?.[story]);
  const controls = useMemo(() => controlsFor(derived, meta), [derived, meta]);

  const values = useMemo(() => {
    const base: StoryArgs = { ...meta?.args, ...resolved?.args };
    const next: Record<string, unknown> = {};
    for (const control of controls) {
      next[control.prop] =
        control.prop in overrides ? overrides[control.prop] : initialValue(control, base);
    }
    return next;
  }, [controls, overrides, meta?.args, resolved?.args]);

  return { controls, values };
}

export function PreviewControlsPanel({
  component,
  story,
  derived,
  overrides,
  onChange,
  onReset,
}: {
  component: string;
  story: string;
  derived: readonly GeneratedControl[];
  overrides: StoryArgs;
  onChange: (prop: string, value: unknown) => void;
  onReset: () => void;
}) {
  const { controls, values } = useControlState(component, story, derived, overrides);
  const modified = Object.keys(overrides).length > 0;

  return (
    <div className="grid content-start gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
          Props
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={!modified}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Reset
        </button>
      </div>
      {controls.map((control) => (
        <ControlField
          key={control.prop}
          idPrefix={`${component}-control`}
          control={control}
          value={values[control.prop]}
          onChange={(value) => {
            onChange(control.prop, value);
          }}
        />
      ))}
    </div>
  );
}

/** The component's tag with the props set, once any has been. */
export function PreviewControlsCode({
  component,
  story,
  derived,
  overrides,
}: {
  component: string;
  story: string;
  derived: readonly GeneratedControl[];
  overrides: StoryArgs;
}) {
  const { controls, values } = useControlState(component, story, derived, overrides);
  if (Object.keys(overrides).length === 0) return null;

  return (
    <CodePanel
      code={generateJsx(componentTag(component), values, controls, "")}
      language="tsx"
      title={`${componentTag(component)} · props as set`}
      className="rounded-none border-0 border-t border-[var(--hairline)]"
    />
  );
}
