import type { Meta, StoryObj } from "@storybook/react-vite";
import { Share2 } from "lucide-react";

import { GooeyPopover } from "./gooey-popover";

function DemoContent() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium opacity-90">
        This popover uses an SVG goo filter to create a viscous blob morphing effect between the
        trigger and content panel.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-background/10 px-3 py-1.5 text-sm hover:bg-background/20 focus-visible:ring-2 focus-visible:outline-none"
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-lg bg-background px-3 py-1.5 text-sm text-foreground hover:bg-background/90 focus-visible:ring-2 focus-visible:outline-none"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

const meta: Meta<typeof GooeyPopover> = {
  title: "Overlays/Gooey Popover",
  component: GooeyPopover,
  args: {
    triggerLabel: "Show details",
    contentWidth: 260,
    side: "top",
    tone: "inverted",
    duration: 250,
    triggerSize: 44,
    children: <DemoContent />,
  },
  argTypes: {
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
    tone: { control: "inline-radio", options: ["inverted", "primary", "card"] },
    duration: { control: { type: "range", min: 100, max: 1000, step: 50 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Gooey Popover" demo: the panel pours upward out of the plus button. */
export const Default: Story = {
  render: (args) => (
    <div className="flex min-h-72 items-end justify-center pb-8">
      <GooeyPopover {...args} />
    </div>
  ),
};

/**
 * Every source item this component covers.
 *
 * - SmoothUI "Gooey Popover" → the default (`side="top"`, 260px content,
 *   Cancel / Confirm actions).
 * - The same popover opening downward, in the primary tone, with a custom icon
 *   and a slower morph — the source's `side`, `trigger`, `bgClassName` and
 *   `speed` props.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-24">
      <figure className="flex flex-col items-center gap-2">
        <GooeyPopover triggerLabel="Show details" contentWidth={260}>
          <DemoContent />
        </GooeyPopover>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI Gooey Popover
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <GooeyPopover
          triggerLabel="Share"
          trigger={<Share2 className="size-5" />}
          side="bottom"
          tone="primary"
          duration={450}
        >
          <p className="text-sm">Link copied to your clipboard.</p>
        </GooeyPopover>
        <figcaption className="text-xs text-muted-foreground">
          side=bottom, primary, slower
        </figcaption>
      </figure>
    </div>
  ),
};
