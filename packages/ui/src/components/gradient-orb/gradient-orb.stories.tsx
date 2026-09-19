import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { GradientOrb, type GradientOrbState } from "./gradient-orb";

const STATES: GradientOrbState[] = [
  "idle",
  "listening",
  "thinking",
  "streaming",
  "speaking",
  "done",
  "error",
];

const meta: Meta<typeof GradientOrb> = {
  title: "Effects/Gradient Orb",
  component: GradientOrb,
  args: { size: 192 },
  argTypes: {
    state: { control: "select", options: [undefined, ...STATES] },
    amplitude: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    duration: { control: { type: "number", min: 2, max: 60 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A speech-like envelope written straight to `--orb-amplitude` through the ref,
 * so a 60fps signal never re-renders React — the pattern to copy for a real
 * microphone level.
 */
function SimulatedVoice({ state, size }: { state: GradientOrbState; size: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = (time: number) => {
      const t = time / 1000;
      const level =
        0.5 +
        0.3 * Math.sin(t * 2.1) +
        0.14 * Math.sin(t * 5.3 + 1.7) +
        0.06 * Math.sin(t * 11.7);
      ref.current?.style.setProperty("--orb-amplitude", level.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <GradientOrb ref={ref} size={size} state={state} />;
}

/** SmoothUI "Siri Orb": every state side by side, then one large orb to drive. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [state, setState] = useState<GradientOrbState>("idle");
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-xs text-muted-foreground">SmoothUI — Siri Orb (all states)</p>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 sm:grid-cols-7">
          {STATES.map((option) => (
            <figure key={option} className="flex flex-col items-center gap-2">
              <SimulatedVoice size={72} state={option} />
              <figcaption className="text-xs text-muted-foreground capitalize">
                {option}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">SmoothUI — Siri Orb (interactive demo)</p>
        <SimulatedVoice size={160} state={state} />
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="State">
          {STATES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={state === option}
              onClick={() => setState(option)}
              className="rounded-full border border-border px-3 py-1.5 text-xs capitalize aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-6">
      {[24, 40, 72, 128, 192].map((size) => (
        <GradientOrb key={size} size={size} />
      ))}
    </div>
  ),
};

export const CustomColours: Story = {
  args: {
    colors: {
      c1: "var(--color-success)",
      c2: "var(--color-warning)",
      c3: "var(--color-destructive)",
      c4: "var(--color-primary)",
    },
  },
};
