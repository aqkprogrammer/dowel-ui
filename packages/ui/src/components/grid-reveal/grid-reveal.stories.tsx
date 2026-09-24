import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

import { GridReveal } from "./grid-reveal";

const PHOTO = (seed: string, width = 1024, height = 1024) =>
  `https://picsum.photos/seed/${seed}/${String(width)}/${String(height)}`;

const meta: Meta<typeof GridReveal> = {
  title: "AI/Grid Reveal",
  component: GridReveal,
  args: {
    src: null,
    alt: "A generated landscape",
    aspect: 1,
    caption: "Generating image…",
    estimatedDuration: 10000,
    gutter: "sm",
  },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    aspect: { control: { type: "range", min: 0.5, max: 2, step: 0.05 } },
    gutter: { control: "inline-radio", options: ["none", "sm", "md"] },
    src: { control: "text" },
  },
  // The frame fills its parent's width, so every story gives it one.
  render: (args) => (
    <div className="w-80 max-w-full">
      <GridReveal {...args} />
    </div>
  ),
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Still generating: the grid keeps splitting, paced by `estimatedDuration`. */
export const Default: Story = {};

const STEPS = ["Composing the scene…", "Adding detail…", "Finishing up…"];

/**
 * Rare UI "Grid Reveal" (original design): press Generate. The frame opens as
 * four cells and keeps splitting while the (simulated) request runs; the
 * status pill changes as it goes, and when the picture lands the busiest cells
 * sharpen first. The photo host sends CORS headers, so `crossOrigin` lets the
 * reveal read the pixels.
 */
export const Generate: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [run, setRun] = useState(0);
    const [src, setSrc] = useState<string | null>(null);
    const [step, setStep] = useState(0);
    const [finished, setFinished] = useState(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(
      () => () => {
        for (const timer of timers.current) clearTimeout(timer);
      },
      [],
    );

    function generate() {
      for (const timer of timers.current) clearTimeout(timer);
      setSrc(null);
      setStep(0);
      setFinished(false);
      const next = run + 1;
      setRun(next);
      timers.current = [
        setTimeout(() => setStep(1), 1800),
        setTimeout(() => setStep(2), 3800),
        setTimeout(() => setSrc(PHOTO(`dowel-${String(next)}`)), 5200),
      ];
    }

    return (
      <div className="grid w-80 max-w-full gap-3">
        <GridReveal
          src={run === 0 ? PHOTO("dowel-0") : src}
          alt="A randomly chosen photograph"
          caption={STEPS[step]}
          estimatedDuration={5000}
          crossOrigin="anonymous"
          onRevealComplete={() => setFinished(true)}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {finished ? "Image ready" : run === 0 ? "" : "Generating…"}
          </p>
          <button
            type="button"
            onClick={generate}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Generate
          </button>
        </div>
      </div>
    );
  },
};

/** Drive the split from real progress. It holds at 0.72 until an image arrives. */
export const ControlledProgress: Story = {
  args: { progress: 0.3, caption: "Step 12 of 40" },
};

/** The frame takes any aspect ratio and fills its parent's width. */
export const Aspects: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-[min(40rem,90vw)] grid-cols-3 items-start gap-4">
      <GridReveal aspect={16 / 9} caption="Wide" />
      <GridReveal aspect={1} caption="Square" />
      <GridReveal aspect={3 / 4} caption="Portrait" />
    </div>
  ),
};

/** Seams between the cells: none, a hairline (default) or a clear gap. */
export const Gutters: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-[min(40rem,90vw)] grid-cols-3 items-start gap-4">
      <GridReveal gutter="none" progress={0.5} />
      <GridReveal gutter="sm" progress={0.5} />
      <GridReveal gutter="md" progress={0.5} />
    </div>
  ),
};

/** An image that is already there when the frame mounts reveals straight away. */
export const Revealed: Story = {
  args: { src: PHOTO("dowel-ready", 1200, 900), aspect: 4 / 3, caption: undefined },
};
