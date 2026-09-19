import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { FeaturesAlternatingBlock } from "./features-alternating";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FeaturesAlternatingBlock> = {
  title: "Blocks/Features alternating",
  component: FeaturesAlternatingBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FeaturesAlternatingBlock>;

function photo(seed: string, alt: string) {
  return (
    <img
      src={`https://picsum.photos/seed/${seed}/800/450`}
      alt={alt}
      width={800}
      height={450}
      className="aspect-video h-auto w-full object-cover"
    />
  );
}

/** SmoothUI "Features 3": three rows swapping sides, with placeholder photographs. */
export const Default: Story = {
  args: {
    features: [
      {
        title: "Intuitive design",
        description: "Clean interfaces people understand from the first interaction.",
        media: photo("dowel-design", "A desk with a sketchbook and a laptop"),
      },
      {
        title: "Blazing performance",
        description: "Animations touch only transform and opacity.",
        media: photo("dowel-speed", "Light trails on a road at night"),
      },
      {
        title: "Developer experience",
        description: "Typed props and one-command installation.",
        media: photo("dowel-code", "A code editor on a monitor"),
      },
    ],
  },
};

/** Every source item: SmoothUI "Features 3" (Features Alternating), with its default copy. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FeaturesAlternatingBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Features 3 — Features Alternating (media replaced by the decorative fallback)
      </figcaption>
    </figure>
  ),
};

/** Right to left: the sides and the slide both mirror. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <FeaturesAlternatingBlock heading="لماذا يختارنا المطورون" description={null} />
    </div>
  ),
};
