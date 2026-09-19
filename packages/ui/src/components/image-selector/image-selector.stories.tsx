import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ImageSelector, type SelectableImage } from "./image-selector";

const IMAGES: SelectableImage[] = [
  { id: "1", src: "https://picsum.photos/seed/orange/400/400", alt: "Portrait in orange" },
  { id: "2", src: "https://picsum.photos/seed/nature/400/400", alt: "Girl in nature" },
  {
    id: "3",
    src: "https://picsum.photos/seed/metro/400/400",
    alt: "Woman on a metro platform",
  },
  { id: "4", src: "https://picsum.photos/seed/designer/400/400", alt: "Designer at work" },
  { id: "5", src: "https://picsum.photos/seed/glass/400/400", alt: "Girl behind glass" },
  { id: "6", src: "https://picsum.photos/seed/manup/400/400", alt: "Man looking up" },
];

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof ImageSelector> = {
  title: "Form/Image Selector",
  component: ImageSelector,
  args: { images: IMAGES, columns: 3, showReset: true, label: "Photos" },
  argTypes: { columns: { control: "select", options: [2, 3, 4] } },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImageSelector>;

/** Press Select, tick photos, then delete them; Reset brings them back. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Interactive Image Selector" → the demo: six photos in three
 *   columns, controlled selection, Share reporting the ids, Delete removing
 *   them and Reset restoring the set. Photos become real checkboxes in Select
 *   mode.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [selected, setSelected] = useState<string[]>([]);
    const [note, setNote] = useState("");
    return (
      <figure className="flex flex-col gap-4">
        <ImageSelector
          images={IMAGES}
          value={selected}
          onValueChange={setSelected}
          onShare={(ids) => setNote(`Share images: ${ids.join(", ")}`)}
          onDelete={(ids) => setNote(`Deleted: ${ids.join(", ")}`)}
        />
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {note}
        </p>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Interactive Image Selector
        </figcaption>
      </figure>
    );
  },
};

export const StartInSelectMode: Story = {
  args: { defaultSelecting: true, defaultValue: ["2"] },
};

export const FourColumns: Story = { args: { columns: 4, showReset: false } };
