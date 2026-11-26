import type { Meta, StoryObj } from "@storybook/react-vite";

import { MiniPlayer } from "./mini-player";

const TRACKS = [
  { title: "Golden Hour", artist: "Lumen", duration: 194 },
  { title: "Night Swim", artist: "Halcyon", duration: 221 },
  { title: "Low Tide", artist: "Marrow", duration: 168 },
];

const meta = {
  title: "Display/Mini Player",
  component: MiniPlayer,
  args: { tracks: TRACKS },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MiniPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press play: the clock runs, and the next track comes in at the end of each one. */
export const Default: Story = {};

/** Two-second tracks, playing on their own, on a dark tile like the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-80 items-center justify-center rounded-3xl bg-[#161618] p-10">
      <MiniPlayer
        className="w-60"
        defaultPlaying
        tracks={[
          { title: "Golden Hour", artist: "Lumen", duration: 2 },
          { title: "Night Swim", artist: "Halcyon", duration: 2 },
        ]}
      />
    </div>
  ),
};

/** With real cover art. */
export const WithArtwork: Story = {
  args: {
    tracks: [
      {
        title: "Golden Hour",
        artist: "Lumen",
        artwork: <img src="https://picsum.photos/seed/golden/96" alt="" />,
      },
      {
        title: "Night Swim",
        artist: "Halcyon",
        artwork: <img src="https://picsum.photos/seed/night/96" alt="" />,
      },
    ],
  },
};
