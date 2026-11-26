import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryViewer, type StorySlide } from "./story-viewer";

const SLIDES: StorySlide[] = [
  { label: "Morning light" },
  { label: "Afternoon haze" },
  { label: "Evening stripes" },
];

const meta = {
  title: "Display/Story Viewer",
  component: StoryViewer,
  args: { slides: SLIDES, interval: 2000, loop: true, paused: false, size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof StoryViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Plays on its own; hover or focus to hold it, tap either half to step. */
export const Default: Story = {};

/** On the dark tile, sized like the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark rounded-3xl bg-[#161618] p-10 text-white">
      <StoryViewer slides={SLIDES} size="sm" />
    </div>
  ),
};

/** Real images and captions. */
export const WithMedia: Story = {
  args: {
    caption: "Lumen",
    slides: [
      {
        label: "Dunes",
        caption: "Dunes at dusk",
        media: <img alt="" src="https://picsum.photos/seed/dowel-dunes/400" />,
      },
      {
        label: "Coast",
        caption: "The long coast",
        media: <img alt="" src="https://picsum.photos/seed/dowel-coast/400" />,
      },
      {
        label: "Forest",
        media: <img alt="" src="https://picsum.photos/seed/dowel-forest/400" />,
      },
    ],
  },
};
