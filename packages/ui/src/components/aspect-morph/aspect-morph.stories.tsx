import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { AspectMorph } from "./aspect-morph";

const PHOTO = "https://picsum.photos/seed/meadow/800/800";

const meta: Meta<typeof AspectMorph> = {
  title: "Display/Aspect Morph",
  component: AspectMorph,
  args: {
    src: PHOTO,
    alt: "Placeholder landscape photo",
    morph: 50,
    corner: 18,
    size: 276,
  },
  argTypes: {
    morph: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 40, step: 2 } },
    size: { control: { type: "range", min: 160, max: 400, step: 4 } },
    ratios: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="grid place-items-center rounded-xl bg-muted p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AspectMorph>;

/** bencho "Aspect ratio": pick landscape, square or portrait and the picture reshapes. */
export const Default: Story = {};

function Caption({ source, children }: { source: string; children: ReactNode }) {
  return (
    <figure className="grid justify-items-center gap-3">
      {children}
      <figcaption className="text-center text-xs text-muted-foreground">{source}</figcaption>
    </figure>
  );
}

/** A neutral token gradient standing in for the source's illustrated landscape. */
function Placeholder() {
  return (
    <div
      className="size-full bg-linear-to-br from-primary/40 via-muted to-info/40"
      aria-hidden="true"
    />
  );
}

/**
 * Every workbench state of the source block.
 *
 * - Morph slider → `morph` (0 = 832ms, 50 = 520ms, 100 = 208ms).
 * - Corner slider → `corner` (px).
 * - The excluded illustration → `src` (placeholder photo) or `children`.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Caption source="Aspect ratio — default (Morph 50, Corner 18)">
        <AspectMorph src={PHOTO} alt="Placeholder photo" />
      </Caption>
      <Caption source="Morph 0 (slow) / Corner 0">
        <AspectMorph
          src={PHOTO}
          alt="Placeholder photo"
          morph={0}
          corner={0}
          defaultValue="1:1"
        />
      </Caption>
      <Caption source="Morph 100 (fast) / Corner 40">
        <AspectMorph
          src={PHOTO}
          alt="Placeholder photo"
          morph={100}
          corner={40}
          defaultValue="3:4"
        />
      </Caption>
      <Caption source="Custom picture node (children)">
        <AspectMorph>
          <Placeholder />
        </AspectMorph>
      </Caption>
    </div>
  ),
};

/** Any set of ratios: here cinema and story crops alongside the square. */
export const CustomRatios: Story = {
  args: {
    label: "Crop",
    ratios: [
      { value: "16:9", label: "Widescreen, 16 by 9", ratio: 16 / 9 },
      { value: "1:1", label: "Square, 1 by 1", ratio: 1 },
      { value: "9:16", label: "Story, 9 by 16", ratio: 9 / 16 },
      { value: "4:5", label: "Portrait, 4 by 5", ratio: 4 / 5 },
    ],
  },
};

/** Controlled, with the value shown beneath it. */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState("1:1");
    return (
      <div className="grid justify-items-center gap-4">
        <AspectMorph {...args} value={value} onValueChange={setValue} />
        <output className="text-sm text-muted-foreground">Ratio: {value}</output>
      </div>
    );
  },
};

/** Right-to-left: the thumb slides toward the inline end and ArrowRight moves back. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <AspectMorph {...args} />
    </div>
  ),
};
