import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { NowPlaying } from "./now-playing";

const meta: Meta<typeof NowPlaying> = {
  title: "Display/Now Playing",
  component: NowPlaying,
  args: {
    track: "Cabra Field",
    artist: "Side B",
    duration: 214,
    defaultPosition: 52,
    stroke: true,
  },
  argTypes: { artwork: { control: false } },
  decorators: [
    (Story) => (
      <div className="grid h-72 place-items-center rounded-xl bg-muted p-10">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof NowPlaying>;

/** Tap the track to expand it. Album art defaults to a token gradient. */
export const Default: Story = {};

function Playlist() {
  const tracks = [
    { track: "Cabra Field", artist: "Side B", duration: 214 },
    { track: "Low Tide", artist: "Side B", duration: 188 },
    { track: "Harbour Lights", artist: "Side B", duration: 251 },
  ];
  const [index, setIndex] = useState(0);
  const current = tracks[index % tracks.length]!;
  return (
    <NowPlaying
      key={index}
      {...current}
      artwork={`https://picsum.photos/seed/${String(index + 3)}/600/400`}
      defaultExpanded
      onNext={() => {
        setIndex((value) => value + 1);
      }}
    />
  );
}

/** bencho "Now playing", collapsed and expanded, with Stroke off; and a playlist driving Next. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex h-52 flex-col items-center gap-2">
        <NowPlaying track="Cabra Field" artist="Side B" defaultPosition={52} />
        <figcaption className="text-xs text-muted-foreground">
          bencho Now playing (collapsed)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <NowPlaying
          track="Cabra Field"
          artist="Side B"
          defaultPosition={52}
          defaultExpanded
          defaultLiked
          stroke={false}
        />
        <figcaption className="text-xs text-muted-foreground">Expanded · Stroke off</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <Playlist />
        <figcaption className="text-xs text-muted-foreground">
          Next advances a playlist
        </figcaption>
      </figure>
    </div>
  ),
};
