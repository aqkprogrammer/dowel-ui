import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { ShaderTransition, type ShaderTransitionProps } from "./shader-transition";
import {
  SHADER_TRANSITION_PRESETS,
  type ShaderTransitionPresetName,
} from "./shader-transition-presets";

function Panel({ eyebrow, title, tone }: { eyebrow: string; title: string; tone: "a" | "b" }) {
  return (
    <div
      className={
        tone === "a"
          ? "flex min-h-48 flex-col justify-center gap-2 bg-card p-6 text-card-foreground"
          : "flex min-h-48 flex-col justify-center gap-2 bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_oklab,var(--color-primary)_55%,var(--color-background)))] p-6 text-primary-foreground"
      }
    >
      <span className="text-xs font-medium tracking-wide uppercase opacity-80">{eyebrow}</span>
      <p className="text-xl font-semibold text-balance">{title}</p>
    </div>
  );
}

const FROM = <Panel tone="a" eyebrow="Draft" title="Quarterly report, ready to review." />;
const TO = <Panel tone="b" eyebrow="Published" title="The report is live for your team." />;

function Demo({
  preset,
  caption,
  ...props
}: Omit<ShaderTransitionProps, "from" | "to" | "active"> & { caption?: string }) {
  const [active, setActive] = useState(false);
  return (
    <figure className="flex flex-col gap-2">
      <ShaderTransition
        preset={preset}
        from={FROM}
        to={TO}
        active={active}
        className="rounded-xl border border-border"
        {...props}
      />
      <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{caption}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActive((value) => !value);
          }}
        >
          {active ? "Back" : "Publish"}
        </Button>
      </figcaption>
    </figure>
  );
}

const meta: Meta<typeof ShaderTransition> = {
  title: "Effects/Shader Transition",
  component: ShaderTransition,
  args: { preset: "noise" },
  argTypes: {
    preset: { control: "select", options: Object.keys(SHADER_TRANSITION_PRESETS) },
    duration: { control: { type: "number", min: 200, max: 4000, step: 100 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-md">
      <Demo {...args} caption="Press Publish to run the transition." />
    </div>
  ),
};

const ENGINE_VARIANTS: ShaderTransitionPresetName[] = [
  "noise",
  "zoom",
  "circle",
  "wipe",
  "luma",
  "planetary",
  "stripes",
  "push",
];

/** SmoothUI's ShaderRevealTransition: the engine itself, with its eight variants on a switch. */
function EngineDemo() {
  const [variant, setVariant] = useState<ShaderTransitionPresetName>("noise");
  return (
    <div className="flex flex-col gap-2">
      <Demo preset={variant} caption={`ShaderRevealTransition — variant "${variant}"`} />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Variant">
        {ENGINE_VARIANTS.map((name) => (
          <Button
            key={name}
            size="sm"
            variant={variant === name ? "secondary" : "ghost"}
            aria-pressed={variant === name}
            onClick={() => {
              setVariant(name);
            }}
          >
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Every SmoothUI shader transition, each captioned with its SmoothUI name and
 * the preset that reproduces it. Thirteen of the shaders are original (their
 * SmoothUI sources are Codrops-derived); see shader-transition-presets.ts.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(SHADER_TRANSITION_PRESETS) as ShaderTransitionPresetName[]).map((name) => {
        const preset = SHADER_TRANSITION_PRESETS[name];
        return (
          <Demo
            key={name}
            preset={name}
            caption={`SmoothUI ${preset.source} — preset="${name}"${preset.origin === "original" ? " (original shader)" : ""}`}
          />
        );
      })}
      <EngineDemo />
    </div>
  ),
};

/** The keyed API: any number of states, each change runs the transition. */
export const Keyed: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const steps = ["Account", "Workspace", "Invite", "Done"];
    const [index, setIndex] = useState(0);
    return (
      <div className="flex max-w-md flex-col gap-3">
        <ShaderTransition
          preset="sdf-blob"
          transitionKey={index}
          className="rounded-xl border border-border"
        >
          <Panel
            tone={index % 2 === 0 ? "a" : "b"}
            eyebrow={`Step ${String(index + 1)} of ${String(steps.length)}`}
            title={steps[index] ?? ""}
          />
        </ShaderTransition>
        <Button
          onClick={() => {
            setIndex((value) => (value + 1) % steps.length);
          }}
        >
          Next step
        </Button>
      </div>
    );
  },
};

/** Colours are tokens: the cover takes the surface it sits on, the glow any accent. */
export const CustomTokens: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="max-w-md rounded-2xl bg-muted p-4">
      <Demo
        preset="wipe"
        surface="muted"
        accent="success"
        caption='surface="muted" accent="success"'
      />
    </div>
  ),
};
