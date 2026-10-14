"use client";

import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
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
import { Switch } from "@dowel-ui/react/switch";
import { cn } from "@dowel-ui/react";
import { THEME_PRESETS } from "@dowel-ui/themes";
import { RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  componentTag,
  controlsFor,
  decodeOverrides,
  encodeOverrides,
  generateJsx,
  initialValue,
  type Control,
} from "~/lib/playground";
import { componentControls } from "~/lib/controls.generated";
import { asStory, asStoryMeta, type StoryArgs } from "~/lib/story-types";

import { ControlField, Field, SliderField } from "./control-fields";
import { CodePanel } from "./site/code-panel";
import { getStoryNames, useStoryModule } from "./story-preview";

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
  const params = useSearchParams();

  const initialName = params.get("c") ?? entries[0]?.name ?? "button";
  const [name, setName] = useState(
    entries.some((entry) => entry.name === initialName)
      ? initialName
      : (entries[0]?.name ?? ""),
  );

  // Everything read from the URL is checked against what a control could have
  // chosen: an unknown preset falls back to the default, a radius is clamped.
  const [preset, setPreset] = useState<string>(() => {
    const requested = params.get("theme");
    return requested !== null && (THEME_PRESETS as readonly string[]).includes(requested)
      ? requested
      : "default";
  });
  const [dark, setDark] = useState(params.get("dark") === "1");
  const [radius, setRadius] = useState(() => {
    const requested = Number(params.get("radius") ?? "1");
    return Number.isFinite(requested) ? Math.min(2, Math.max(0, requested)) : 1;
  });

  /**
   * The link this page was opened with, for the component it names.
   *
   * Its prop values cannot be decoded yet — the controls they are checked
   * against arrive with the component's stories — so they are kept here and
   * read once those controls exist, then dropped the first time the reader
   * changes anything.
   */
  const [linked] = useState(() => ({ name: initialName, params: new URLSearchParams(params) }));

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
  // Suspends the first time a component is chosen, until its stories arrive.
  // The page's boundary covers the first load; after that, choosing another
  // component is a transition, so the stage keeps showing the last one rather
  // than blanking while the next is fetched.
  const storyModule = useStoryModule(name);
  const meta = asStoryMeta(storyModule?.default);

  // Through the shared helper, so the first example here is the same one the
  // component's documentation page opens on — source order, not the alphabetical
  // order a module namespace object hands back.
  const storyNames = useMemo(() => getStoryNames(name), [name]);

  const [storyName, setStoryName] = useState<string | undefined>(() => {
    const requested = linked.params.get("s");
    return requested ?? undefined;
  });
  // A story named in a link that the component does not have is ignored.
  const activeStory =
    storyName !== undefined && storyNames.includes(storyName) ? storyName : undefined;
  const story = asStory(storyModule?.[activeStory ?? storyNames[0] ?? ""]);

  const controls = useMemo(() => controlsFor(componentControls[name], meta), [name, meta]);

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
  const current = useMemo(
    () =>
      overrides[name] ?? (name === linked.name ? decodeOverrides(linked.params, controls) : {}),
    [overrides, name, linked, controls],
  );

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
        [name]: { ...current, ...previous[name], [prop]: value },
      }));
    },
    [name, current],
  );

  const selectComponent = useCallback((next: string) => {
    startTransition(() => {
      setName(next);
      setStoryName(undefined);
    });
  }, []);

  const reset = useCallback(() => {
    setOverrides((previous) => ({ ...previous, [name]: {} }));
    setStoryName(undefined);
  }, [name]);

  /**
   * The URL is the configuration: component, example, theme, mode, radius and
   * every prop the reader changed, so copying the address shares exactly what
   * is on the stage. Replaced, not pushed — forty knob turns should not mean
   * forty presses of the back button to leave the page — and through the
   * History API, which the router follows without a server round trip.
   */
  useEffect(() => {
    const query = new URLSearchParams({ c: name });
    if (activeStory !== undefined) query.set("s", activeStory);
    if (preset !== "default") query.set("theme", preset);
    if (dark) query.set("dark", "1");
    if (radius !== 1) query.set("radius", String(radius));
    for (const [key, value] of encodeOverrides(current, controls)) query.set(key, value);
    const next = `?${query.toString()}`;
    // A task later, not now: on the first load the router writes its own
    // history entry after this page's effects have run, and would put the
    // opening URL back over this one.
    const timer = window.setTimeout(() => {
      if (next !== window.location.search) {
        window.history.replaceState(window.history.state, "", next);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [name, activeStory, preset, dark, radius, current, controls]);

  const args: StoryArgs = { ...baseArgs, ...values };
  const Render = story?.render ?? meta?.render ?? meta?.component;

  const modified = Object.keys(current).length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)] shadow-[0_40px_120px_-60px_var(--glow-blue)]">
      {/* The toolbar: what is on the stage, and how the stage is lit. */}
      <div className="flex flex-wrap items-end gap-4 border-b border-[var(--hairline)] px-4 py-3">
        <div className="w-full sm:w-64">
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
        </div>

        {storyNames.length > 1 ? (
          <div className="w-full sm:w-52">
            <Field label="Example" htmlFor="playground-story">
              <Select
                value={activeStory ?? storyNames[0]}
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
          </div>
        ) : null}

        <div className="ms-auto flex flex-wrap items-end gap-4">
          <div className="w-36">
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
          </div>
          <div className="flex h-9 items-center gap-2">
            <Label htmlFor="playground-dark">Dark</Label>
            <Switch
              id="playground-dark"
              checked={dark}
              onCheckedChange={(next) => {
                setDark(next);
              }}
            />
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={reset}
            disabled={!modified && activeStory === undefined}
          >
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Controls: read from the component itself. */}
        <div className="grid content-start gap-5 border-b border-[var(--hairline)] p-5 lg:border-e lg:border-b-0">
          <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
            Props
          </p>
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
            <p className="text-xs text-pretty text-muted-foreground">
              {entry?.title ?? "This component"} has no props a control can set. Its examples
              and the theme still apply.
            </p>
          ) : null}

          <hr className="border-[var(--hairline)]" />

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
        </div>

        <div className="grid min-w-0 content-start">
          {entry ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--hairline)] px-5 py-3">
              <h2 className="font-semibold tracking-tight">{entry.title}</h2>
              <Badge size="sm" variant="secondary">
                {entry.category}
              </Badge>
              <a
                href={`/docs/components/${name}`}
                className="ms-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Documentation
              </a>
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
              "stage-surface grid min-h-[26rem] place-items-center overflow-x-auto p-10 text-foreground",
              "[--color-primary-foreground:var(--primary-foreground)] [--color-primary-hover:var(--primary-hover)] [--color-primary:var(--primary)]",
              dark && "dark",
            )}
          >
            {Render ? (
              <Render {...args} />
            ) : (
              <p className="text-sm text-muted-foreground">No preview.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--hairline)]">
        <Code
          name={name}
          controls={controls}
          values={values}
          args={baseArgs}
          composed={(story?.render ?? meta?.render) !== undefined}
        />
      </div>
    </div>
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
  if (controls.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        This component has no props a control can set. Its source is on the{" "}
        <a className="underline underline-offset-4" href={`/docs/components/${name}`}>
          documentation page
        </a>
        .
      </p>
    );
  }

  const tag = componentTag(name);

  // A story with its own render is a hand-written composition, often of several
  // components, so the code for the whole example is its source, not a tag
  // printed from the knobs. What the knobs do describe is the component itself,
  // so that is what is generated: its tag, with the props as set.
  if (composed) {
    return (
      <div>
        <p className="px-5 pt-4 text-sm text-pretty text-muted-foreground">
          This example is a hand-written composition. Below is the {tag} in it with the props
          you set; the whole example is on the{" "}
          <a className="underline underline-offset-4" href={`/docs/components/${name}`}>
            documentation page
          </a>
          .
        </p>
        <CodePanel
          code={generateJsx(tag, values, controls, "")}
          language="tsx"
          title={`Generated · ${tag} props`}
          className="rounded-none border-0"
        />
      </div>
    );
  }

  const children = typeof args.children === "string" ? args.children : tag;
  const code = generateJsx(tag, values, controls, children);

  return (
    <CodePanel
      code={code}
      language="tsx"
      title={`Generated · ${name}.tsx`}
      className="rounded-none border-0"
    />
  );
}
