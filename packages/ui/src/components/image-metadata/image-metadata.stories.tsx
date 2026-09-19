import type { Meta, StoryObj } from "@storybook/react-vite";
import { Share } from "lucide-react";

import { Button } from "@/components/button";

import { ImageMetadata } from "./image-metadata";

const METADATA = [
  { label: "Created", value: "2024-01-15" },
  { label: "Updated", value: "2024-01-20" },
  { label: "By", value: "John Doe" },
  { label: "Source", value: "https://example.com/source" },
];

function SourceActions() {
  return (
    <>
      <Button variant="outline" size="icon" aria-label="Share" className="size-11 rounded-full">
        <Share />
      </Button>
      <Button variant="outline" disabled className="h-11 rounded-full px-4">
        Connect
      </Button>
    </>
  );
}

// Annotated rather than `satisfies`: decorators make the inferred type unnameable (TS2883).
const meta: Meta<typeof ImageMetadata> = {
  title: "Display/Image Metadata",
  component: ImageMetadata,
  args: {
    src: "https://picsum.photos/seed/canyon/600/800",
    alt: "A desert canyon under a clear sky",
    filename: "desert-canyon.jpg",
    description: "Beautiful mountain landscape with snow-capped peaks",
    metadata: METADATA,
    actions: <SourceActions />,
    shape: "rounded",
  },
  argTypes: { shape: { control: "select", options: ["rounded", "square"] } },
  decorators: [
    (Story) => (
      // Anchored at the bottom, as in the source, so the image lifts upward.
      <div className="flex min-h-[37.5rem] items-end justify-center p-8">
        <div className="w-full max-w-xs">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ImageMetadata>;

/** Press the chevron to open the metadata; Escape or Close returns. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Image Metadata Preview" → Share and a disabled Connect button
 *   beside the details toggle, the panel with filename, description and the
 *   Created / Updated / By / Source rows. The source's fixed fields are a
 *   `metadata` list and its buttons an `actions` slot.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <figure className="flex flex-col items-center gap-4">
      <ImageMetadata {...args} />
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI · Image Metadata Preview
      </figcaption>
    </figure>
  ),
};

export const OpenByDefault: Story = { args: { defaultOpen: true } };

export const WithoutActions: Story = { args: { actions: undefined, shape: "square" } };
