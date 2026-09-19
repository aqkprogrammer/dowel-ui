import type { Meta, StoryObj } from "@storybook/react-vite";

import { CursorFollow } from "./cursor-follow";

const IMAGES = [
  { seed: "chair", label: "Portrait of a person sitting in a chair" },
  { seed: "curls", label: "A young man with curly hair" },
];

function Portraits() {
  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-8 py-8">
      {IMAGES.map((image) => (
        <img
          key={image.seed}
          src={`https://picsum.photos/seed/${image.seed}/384/683`}
          alt={image.label}
          data-cursor-text={image.label}
          className="aspect-[9/16] w-48 rounded-xl object-cover transition-transform duration-[var(--duration-normal)] hover:scale-105"
        />
      ))}
    </div>
  );
}

const meta: Meta<typeof CursorFollow> = {
  title: "Effects/Cursor Follow",
  component: CursorFollow,
  args: { appearance: "solid", hideCursor: true },
  argTypes: {
    appearance: { control: "select", options: ["solid", "invert", "blur"] },
  },
  render: (args) => (
    <CursorFollow {...args} className="min-h-80 rounded-xl border border-border">
      <Portraits />
    </CursorFollow>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Cursor Follow" demo: two portraits that label the dot on hover. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Cursor Follow" demo → `hideCursor` with `data-cursor-text` on
 *   each image (the label is also each image's alt text).
 * - The docs' "blend/blur styling options" → `appearance="invert"` and
 *   `appearance="blur"`.
 *
 * Touch input and reduced motion get no follower at all.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-8">
      {(["solid", "invert", "blur"] as const).map((appearance) => (
        <figure key={appearance} className="grid gap-2">
          <CursorFollow
            appearance={appearance}
            hideCursor={appearance === "solid"}
            className="rounded-xl border border-border bg-muted/30"
          >
            <Portraits />
          </CursorFollow>
          <figcaption className="text-xs text-muted-foreground">
            SmoothUI · Cursor Follow ({appearance})
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};
