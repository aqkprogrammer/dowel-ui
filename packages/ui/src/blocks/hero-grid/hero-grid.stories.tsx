import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroGridBlock } from "./hero-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroGridBlock> = {
  title: "Blocks/Hero grid",
  component: HeroGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer over the grid: each square lights up and fades back. */
export const Default: Story = {};

/** The source's layout and copy (product name swapped for a placeholder), captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroGridBlock
        title="Build your next project with"
        highlight="Acme"
        description="Acme gives you the building blocks to create stunning, animated interfaces in minutes."
        primaryAction={{ label: "Learn more", href: "#" }}
        secondaryAction={{ label: "Get Started", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 1</figcaption>
    </figure>
  ),
};

/** Any CSS colours; up to five are cycled across the cells. */
export const CustomColours: Story = {
  args: {
    colors: ["var(--color-primary)", "var(--color-muted-foreground)"],
  },
};

/** As the page's h1, with one call to action. */
export const PageHeading: Story = {
  args: { headingLevel: 1, secondaryAction: null },
};
