"use client";

import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { CodeBlock } from "@dowel-ui/react/code-block";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@dowel-ui/react/combobox";
import { Label } from "@dowel-ui/react/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dowel-ui/react/select";
import { Slider } from "@dowel-ui/react/slider";
import { Switch } from "@dowel-ui/react/switch";
import { cn } from "@dowel-ui/react";
import { THEME_PRESETS } from "@dowel-ui/themes";
import { RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  componentTag,
  controlsFor,
  generateJsx,
  initialValue,
  type Control,
} from "~/lib/playground";
import { storyModules } from "~/lib/previews.generated";
import { asStory, asStoryMeta, type StoryArgs } from "~/lib/story-types";

import { getStoryNames } from "./story-preview";

export interface PlaygroundEntry {
  name: string;
  title: string;
  category: string;
  description: string;
}

/**
 * A component, its knobs, and the code for what you are looking at.
 *
 * Everything the controls offer is derived — from the stories that run in CI
 * and from each component's own `cva()` call — so the playground cannot drift
 * from the components the way a hand-written examples page does. What it cannot
 * derive it does not pretend to have: a component with no variant axes gets its
 * stories and the theme controls, not an empty panel captioned "no options".
 */
export function Playground({ entries }: { entries: PlaygroundEntry[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const initialName = params.get("c") ?? entries[0]?.name ?? "button";
  const [name, setName] = useState(
    entries.some((entry) => entry.name === initialName)
      ? initialName
      : (entries[0]?.name ?? ""),
  );

  const [preset, setPreset] = useState<string>(params.get("theme") ?? "default");
  const [dark, setDark] = useState(params.get("dark") === "1");
  const [radius, setRadius] = useState(Number(params.get("radius") ?? "1"));

  /**
   * Radius is applied to the document, not to the preview surface.
   *
   * Not a shortcut — it is the only place it can work. The radius tokens are
   * declared as `calc(0.5rem * var(--radius-scale, 1))` at `:root`, and a
   * custom property containing `var()` is substituted where it is *declared*,
   * so what inherits down the tree is an already-resolved length. Setting
   * `--radius-scale` further down changes nothing.
   *
   * That is also the honest demonstration: one property re-proportions every
   * corner in the system at once, including this page's own chrome. Cleared on
   * unmount so it does not follow the reader to the next page.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--radius-scale", String(radius));
    return () => {
      root.style.removeProperty("--radius-scale");
    };
  }, [radius]);

  const entry = entries.find((item) => item.name === name);
  const storyModule = storyModules[name];
  const meta = asStoryMeta(storyModule?.default);

  // Through the shared helper, so the first example here is the same one the
  // component's documentation page opens on — source order, not the alphabetical
  // order a module namespace object hands back.
  const storyNames = useMemo(() => getStoryNames(name), [name]);

  const [storyName, setStoryName] = useState<string | undefined>(undefined);
  const story = asStory(storyModule?.[storyName ?? storyNames[0] ?? ""]);

  const controls = useMemo(() => controlsFor(name, meta), [name, meta]);

  const baseArgs: StoryArgs = useMemo(
    () => ({ ...meta?.args, ...story?.args }),
    [meta?.args, story?.args],
  );

  /**
   * Overrides only, not a full copy of the args.
   *
   * Keyed by component so switching away and back does not lose a selection,
   * and so a prop the next component does not have cannot leak onto it.
   */
  const [overrides, setOverrides] = useState<Record<string, StoryArgs>>({});

  // Memoised because the `?? {}` fallback is a fresh object every render, which
  // would make the memo below recompute on every render and defeat itself.
  const current = useMemo(() => overrides[name] ?? {}, [overrides, name]);

  const values = useMemo(() => {
    const resolved: Record<string, unknown> = {};
    for (const control of controls) {
      resolved[control.prop] =
        control.prop in current ? current[control.prop] : initialValue(control, baseArgs);
    }
    return resolved;
  }, [controls, current, baseArgs]);

  const setValue = useCallback(
    (prop: string, value: unknown) => {
      setOverrides((previous) => ({
        ...previous,
        [name]: { ...previous[name], [prop]: value },
      }));
    },
    [name],
  );

  const selectComponent = useCallback(
    (next: string) => {
      setName(next);
      setStoryName(undefined);
      // Replace, not push: forty knob turns should not mean forty presses of
      // the back button to leave the page.
      router.replace(`/playground?c=${next}`, { scroll: false });
    },
    [router],
  );

  const reset = useCallback(() => {
    setOverrides((previous) => ({ ...previous, [name]: {} }));
    setStoryName(undefined);
  }, [name]);

  const args: StoryArgs = { ...baseArgs, ...values };
  const Render = story?.render ?? meta?.component;

  const modified = Object.keys(current).length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-5 lg:sticky lg:top-20">
        <Field label="Component" htmlFor="playground-component">
          <Combobox value={name} onValueChange={selectComponent}>
            <ComboboxTrigger id="playground-component" placeholder="Choose a component…" />
            <ComboboxContent label="Search components">
              <ComboboxInput placeholder="Search…" aria-label="Search components" />
              <ComboboxEmpty>Nothing matches.</ComboboxEmpty>
              <ComboboxList>
                {entries.map((item) => (
                  <ComboboxItem
                    key={item.name}
                    value={item.name}
                    keywords={[item.title, item.category, item.description]}
                  />
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>

        {storyNames.length > 1 ? (
          <Field label="Example" htmlFor="playground-story">
            <Select
              value={storyName ?? storyNames[0]}
              onValueChange={(value) => {
                setStoryName(value);
              }}
            >
              <SelectTrigger id="playground-story">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {storyNames.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {controls.map((control) => (
          <ControlField
            key={control.prop}
            control={control}
            value={values[control.prop]}
            onChange={(value) => {
              setValue(control.prop, value);
            }}
          />
        ))}

        {controls.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {entry?.title ?? "This component"} has no variant props. Its examples and the theme
            below still apply.
          </p>
        ) : null}

        <hr className="border-border" />

        <Field label="Theme" htmlFor="playground-theme">
          <Select
            value={preset}
            onValueChange={(value) => {
              setPreset(value);
            }}
          >
            <SelectTrigger id="playground-theme" className="capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_PRESETS.map((item) => (
                <SelectItem key={item} value={item} className="capitalize">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="playground-dark">Dark mode</Label>
          <Switch
            id="playground-dark"
            checked={dark}
            onCheckedChange={(next) => {
              setDark(next);
            }}
          />
        </div>

        <SliderField
          id="playground-radius"
          label="Radius"
          hint={`${radius.toFixed(2)}×`}
          valueText={`${radius.toFixed(2)} times the designed radius, applied to the whole page`}
          min={0}
          max={2}
          step={0.05}
          value={radius}
          onChange={setRadius}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={!modified && storyName === undefined}
        >
          <RotateCcw />
          Reset
        </Button>
      </div>

      <div className="grid min-w-0 gap-4">
        {entry ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{entry.title}</h2>
            <Badge size="sm" variant="secondary">
              {entry.category}
            </Badge>
            <p className="w-full text-sm text-muted-foreground">{entry.description}</p>
          </div>
        ) : null}

        {/*
          The preset and mode are scoped here rather than set on <html>, so the
          rest of the page keeps the reader's own choice — a playground that
          flips the documentation into dark mode as a side effect of previewing
          dark mode is doing something the reader did not ask for.

          Radius cannot be scoped the same way, for a reason CSS decides rather
          than this file; see the effect above.
        */}
        <div
          data-theme={preset}
          className={cn(
            "grid min-h-72 place-items-center overflow-x-auto rounded-xl border border-border bg-background p-8 text-foreground",
            dark && "dark",
          )}
        >
          {Render ? (
            <Render {...args} />
          ) : (
            <p className="text-sm text-muted-foreground">No preview.</p>
          )}
        </div>

        <Code
          name={name}
          controls={controls}
          values={values}
          args={baseArgs}
          composed={story?.render !== undefined}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * A labelled slider.
 *
 * The name goes to the thumb, not to the root: the thumb is the element with
 * `role="slider"`, so a `<Label htmlFor>` pointing at the root names a div with
 * no role and leaves the control a keyboard user actually lands on unnamed.
 * The component says so in a development warning, which is how this was caught.
 */
function SliderField({
  id,
  label,
  hint,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  valueText?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const labelId = `${id}-label`;

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </div>
      <Slider
        aria-labelledby={labelId}
        aria-valuetext={valueText}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => {
          onChange(next ?? min);
        }}
      />
    </div>
  );
}

function ControlField({
  control,
  value,
  onChange,
}: {
  control: Control;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `playground-${control.prop}`;

  if (control.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="font-mono text-xs">
          {control.prop}
        </Label>
        <Switch id={id} checked={value === true} onCheckedChange={onChange} />
      </div>
    );
  }

  if (control.kind === "number") {
    const numeric = typeof value === "number" ? value : 0;
    return (
      <SliderField
        id={id}
        label={control.prop}
        hint={String(numeric)}
        min={0}
        max={100}
        step={1}
        value={numeric}
        onChange={onChange}
      />
    );
  }

  return (
    <Field label={control.prop} htmlFor={id}>
      <Select
        value={typeof value === "string" ? value : (control.options[0] ?? "")}
        onValueChange={onChange}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * The code for the current selection.
 *
 * Only generated when the playground is actually driving the component. A story
 * with its own `render` is a hand-written composition — often of several
 * components — and printing a single tag carrying the knob values would be a
 * lie about what produced the preview above it.
 */
function Code({
  name,
  controls,
  values,
  args,
  composed,
}: {
  name: string;
  controls: Control[];
  values: Record<string, unknown>;
  args: StoryArgs;
  composed: boolean;
}) {
  if (controls.length === 0 || composed) {
    return (
      <p className="text-sm text-muted-foreground">
        {composed
          ? "This example is a hand-written composition, so there is no single tag to generate. "
          : "This component has no variant props. "}
        Its source is on the{" "}
        <a className="underline underline-offset-4" href={`/docs/components/${name}`}>
          documentation page
        </a>
        .
      </p>
    );
  }

  const tag = componentTag(name);
  const children = typeof args.children === "string" ? args.children : tag;
  const code = generateJsx(tag, values, controls, children);

  return (
    <CodeBlock language="tsx" title={`${name}.tsx`} code={code}>
      {code}
    </CodeBlock>
  );
}
