import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { MatrixOrb, type MatrixOrbState } from "./matrix-orb";

const STATES: MatrixOrbState[] = ["idle", "listening", "thinking"];

const LABELS = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "Thinking…",
} satisfies Record<MatrixOrbState, string>;

const meta = {
  title: "AI/Matrix Orb",
  component: MatrixOrb,
  args: { state: "idle", size: 140, dots: 17, tone: "primary" },
  argTypes: {
    state: { control: "inline-radio", options: STATES },
    level: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    size: { control: { type: "range", min: 48, max: 320, step: 4 } },
    dots: { control: { type: "range", min: 5, max: 41, step: 1 } },
    tone: { control: "inline-radio", options: ["primary", "foreground", "muted"] },
    color: { control: "text" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MatrixOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Rare UI "Matrix orb" (original design): switch between the three states and
 * watch it blend rather than cut. Listening uses the built-in envelope here —
 * no microphone involved.
 */
export const Interactive: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [state, setState] = useState<MatrixOrbState>("idle");
    return (
      <div className="flex flex-col items-center gap-6">
        <MatrixOrb state={state} size={180} labels={LABELS} announce />
        <div className="flex gap-2" role="group" aria-label="Orb state">
          {STATES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={state === option}
              onClick={() => setState(option)}
              className="rounded-full border border-border px-3 py-1.5 text-xs capitalize focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:outline-none aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  },
};

/** Each state at rest, side by side. */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-10">
      {STATES.map((state) => (
        <MatrixOrb key={state} state={state} size={120} labels={LABELS} />
      ))}
    </div>
  ),
};

/** A level driven from outside — a stand-in for a microphone meter. */
export const LiveLevel: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [level, setLevel] = useState(0);
    useEffect(() => {
      const id = setInterval(() => {
        const t = performance.now() / 1000;
        setLevel(Math.max(0, 0.45 + 0.35 * Math.sin(t * 3.1) * Math.sin(t * 1.3)));
      }, 50);
      return () => clearInterval(id);
    }, []);
    return <MatrixOrb state="listening" level={level} size={180} labels={LABELS} />;
  },
};

/** Tones follow the theme; `color` takes any CSS colour, tokens included. */
export const Colours: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <MatrixOrb tone="primary" state="thinking" size={96} />
      <MatrixOrb tone="foreground" state="thinking" size={96} />
      <MatrixOrb tone="muted" state="thinking" size={96} />
      <MatrixOrb color="var(--color-success)" state="thinking" size={96} />
    </div>
  ),
};

/** Density is a prop: a coarse 9-dot grid reads as an icon, 33 as a texture. */
export const Density: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <MatrixOrb state="listening" dots={9} size={96} />
      <MatrixOrb state="listening" dots={17} size={96} />
      <MatrixOrb state="listening" dots={33} size={96} />
    </div>
  ),
};
