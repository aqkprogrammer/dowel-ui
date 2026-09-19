import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { Marquee } from "./marquee";

function Tiles({ count = 5, tone = "muted" }: { count?: number; tone?: "muted" | "primary" }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={
            tone === "primary"
              ? "flex size-20 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              : "flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          }
        >
          {index + 1}
        </div>
      ))}
    </>
  );
}

const meta = {
  title: "Display/Marquee",
  component: Marquee,
  args: {
    gap: 16,
    speed: 50,
    reverse: false,
    pauseOnHover: true,
    paused: false,
    orientation: "horizontal",
    repeat: 1,
  },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <Marquee {...args}>
        <Tiles />
      </Marquee>
    </div>
  ),
} satisfies Meta<typeof Marquee>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Infinite Slider": five tiles looping at 50 px/s. */
export const Default: Story = {};

/**
 * Every source item this component reproduces — the three rows of SmoothUI's
 * Infinite Slider demo.
 *
 * - "Basic horizontal slider" → `speed={50}`.
 * - "Slider with hover pause" (`speedOnHover={0}`) → `pauseOnHover`, which is
 *   the default here and also pauses while focus is inside. The source could
 *   also *slow* on hover to another speed; a CSS loop can pause but cannot
 *   change rate mid-flight without a jump, so only the pause is kept.
 * - "Reverse direction" → `reverse`.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-8">
      <figure className="flex flex-col gap-2">
        <Marquee speed={50} pauseOnHover={false}>
          <Tiles />
        </Marquee>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI Infinite Slider — basic horizontal
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <Marquee speed={50} pauseOnHover>
          <Tiles tone="primary" />
        </Marquee>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI Infinite Slider — hover pause
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-2">
        <Marquee speed={50} reverse>
          <Tiles />
        </Marquee>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI Infinite Slider — reverse direction
        </figcaption>
      </figure>
    </div>
  ),
};

export const Vertical: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Marquee orientation="vertical" className="h-72 w-20" speed={40}>
      <Tiles />
    </Marquee>
  ),
};

/** Short content repeated so the loop fills a wide viewport without a gap. */
export const Repeat: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Marquee repeat={3} speed={60} className="w-full max-w-3xl">
      <Tiles count={3} />
    </Marquee>
  ),
};

/** A visible pause control, for content that moves for longer than five seconds (WCAG 2.2.2). */
export const WithPauseControl: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [paused, setPaused] = useState(false);
    return (
      <div className="flex w-full max-w-md items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPaused((value) => !value);
          }}
          aria-label={paused ? "Play" : "Pause"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border"
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <Marquee paused={paused} className="min-w-0 flex-1">
          <Tiles />
        </Marquee>
      </div>
    );
  },
};

/** Under dir="rtl" the loop runs toward the inline start, which is now the right. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="w-full max-w-md">
      <Marquee>
        <Tiles />
      </Marquee>
    </div>
  ),
};
