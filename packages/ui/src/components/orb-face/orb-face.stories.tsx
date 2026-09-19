import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { OrbFace, type OrbFaceState } from "./orb-face";

const STATES: OrbFaceState[] = [
  "idle",
  "listening",
  "thinking",
  "streaming",
  "speaking",
  "done",
  "error",
];

const meta: Meta<typeof OrbFace> = {
  title: "AI/Orb Face",
  component: OrbFace,
  args: { size: 150, state: "idle", gaze: true },
  argTypes: {
    state: { control: "select", options: STATES },
    amplitude: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A speech-like envelope for the listening state, no microphone involved. */
function useSimulatedAmplitude(active: boolean) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = performance.now() / 1000;
      setLevel(0.5 + 0.3 * Math.sin(t * 2.1) + 0.14 * Math.sin(t * 5.3 + 1.7));
    }, 50);
    return () => clearInterval(id);
  }, [active]);
  return level;
}

/**
 * SmoothUI "AI Orb Face": every state side by side with gaze off (seven faces
 * tracking the cursor is noise), then one large face that watches the pointer.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [state, setState] = useState<OrbFaceState>("idle");
    const amplitude = useSimulatedAmplitude(state === "listening");
    return (
      <div className="flex flex-col items-center gap-8 p-8">
        <p className="text-xs text-muted-foreground">SmoothUI — AI Orb Face (all states)</p>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 sm:grid-cols-7">
          {STATES.map((option) => (
            <figure key={option} className="flex flex-col items-center gap-2">
              <OrbFace gaze={false} size={72} state={option} amplitude={0.6} />
              <figcaption className="text-xs text-muted-foreground capitalize">
                {option}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          SmoothUI — AI Orb Face (interactive demo)
        </p>
        <OrbFace
          aria-label={`Assistant: ${state}`}
          size={150}
          state={state}
          amplitude={amplitude}
        />
        <p className="text-xs text-muted-foreground">
          Move your cursor — it watches. Switch to thinking and it looks away.
        </p>
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

export const CustomColours: Story = {
  args: {
    colors: {
      body: "var(--color-success)",
      bodyEdge: "color-mix(in oklab, var(--color-success) 70%, var(--color-foreground))",
      feature: "var(--color-success-foreground)",
    },
  },
};
