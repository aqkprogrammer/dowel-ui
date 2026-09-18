import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Carousel3D, type Carousel3DItem } from "./carousel-3d";

const items: Carousel3DItem[] = [
  { title: "Sunset Beach", image: "https://picsum.photos/seed/beach/600/400" },
  { title: "Misty Mountains", image: "https://picsum.photos/seed/mountain/600/400" },
  { title: "Forest Trail", image: "https://picsum.photos/seed/forest/600/400" },
  { title: "Sunlight in Woods", image: "https://picsum.photos/seed/woods/600/400" },
  { title: "Green Hills", image: "https://picsum.photos/seed/hills/600/400" },
];

const mono: Carousel3DItem[] = items.map((_, i) => ({ title: `Card ${String(i + 1)}` }));

const meta: Meta<typeof Carousel3D> = {
  title: "Display/3D Carousel",
  component: Carousel3D,
  args: {
    items,
    "aria-label": "Places",
    variant: "arc",
    size: "md",
    spread: "hover",
    tone: "media",
    loop: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["arc", "coverflow"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    spread: { control: "inline-radio", options: ["hover", "always", "never"] },
    tone: { control: "inline-radio", options: ["media", "mono"] },
    items: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CoverFlow: Story = { args: { variant: "coverflow" } };

/** Every amicro carousel this component covers, captioned with its source name. */
export const Gallery: Story = {
  render: () => (
    <div className="grid gap-8 sm:grid-cols-2">
      {(
        [
          ["Interactive Carousel (by vivi)", { variant: "arc", spread: "always", items }],
          ["CoverFlow Carousel", { variant: "coverflow", items }],
          [
            "Interactive Carousel (Monochrome)",
            { variant: "arc", spread: "always", tone: "mono", items: mono },
          ],
          [
            "CoverFlow Carousel (Monochrome)",
            { variant: "coverflow", tone: "mono", items: mono },
          ],
        ] as const
      ).map(([caption, props]) => (
        <figure
          key={caption}
          className="grid gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <Carousel3D aria-label={caption} size="sm" {...props} />
          <figcaption className="text-center text-xs text-muted-foreground">
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: (args) => {
    const [index, setIndex] = useState(0);
    return (
      <div className="grid gap-3">
        <Carousel3D {...args} index={index} onIndexChange={setIndex} loop />
        <p className="text-center text-sm text-muted-foreground">
          Showing {items[index]?.title} ({index + 1} of {items.length})
        </p>
      </div>
    );
  },
};

/** Next moves toward the inline end: arrows, swipe and the strip all mirror. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <Carousel3D
        {...args}
        aria-label="أماكن"
        previousLabel="الشريحة السابقة"
        nextLabel="الشريحة التالية"
        dotsLabel="الشرائح"
      />
    </div>
  ),
};

export const CustomContent: Story = {
  args: {
    variant: "coverflow",
    items: ["Q1", "Q2", "Q3", "Q4"].map((quarter) => ({
      title: `${quarter} report`,
      content: (
        <span className="grid gap-1 p-2 text-center">
          <span className="text-lg font-semibold">{quarter}</span>
          <span className="text-xs text-muted-foreground">Report</span>
        </span>
      ),
    })),
  },
};
