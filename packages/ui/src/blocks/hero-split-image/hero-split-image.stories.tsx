import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroSplitImageBlock } from "./hero-split-image";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const avatar = (seed: string) => `https://picsum.photos/seed/${seed}/96/96`;

const REVIEWERS = [
  { name: "Amara Okafor", src: avatar("dowel-reviewer-1") },
  { name: "Lukas Weber", src: avatar("dowel-reviewer-2") },
  { name: "Priya Raman", src: avatar("dowel-reviewer-3") },
  { name: "Mateo Silva", src: avatar("dowel-reviewer-4") },
  { name: "Hana Sato", src: avatar("dowel-reviewer-5") },
];

const meta: Meta<typeof HeroSplitImageBlock> = {
  title: "Blocks/Hero split image",
  component: HeroSplitImageBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab into the avatars: they spread apart. */
export const Default: Story = {
  args: {
    reviews: { avatars: REVIEWERS, count: 200, rating: 4.9 },
    image: {
      src: "https://picsum.photos/seed/dowel-hero-split/1200/900",
      alt: "An application screen",
      width: 1200,
      height: 900,
    },
  },
};

/** The source's layout and copy (product name swapped for a placeholder), captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroSplitImageBlock
        title="Build beautiful UIs, effortlessly."
        description="Acme gives you the building blocks to create stunning, animated interfaces in minutes."
        reviews={{ avatars: REVIEWERS, count: 200, rating: 5 }}
        primaryAction={{ label: "Get Started", href: "#" }}
        secondaryAction={{ label: "Watch demo", href: "#" }}
        image={{
          src: "https://picsum.photos/seed/dowel-hero-3/1200/900",
          alt: "An application screen",
        }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 3</figcaption>
    </figure>
  ),
};

/** No images anywhere: initials stand in for avatars, a gradient for the picture. */
export const Placeholders: Story = {};

export const WithoutSocialProof: Story = {
  args: { reviews: null },
};
