import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { HeroPerspectiveGridBlock } from "./hero-perspective-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof HeroPerspectiveGridBlock> = {
  title: "Blocks/Hero perspective grid",
  component: HeroPerspectiveGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Sweep the pointer across the plane: tiles light up and fade back. */
export const Default: Story = {};

/** The source's layout and copy (product name swapped for a placeholder), captioned with its name. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <HeroPerspectiveGridBlock
        title="Build your next project with"
        highlight="Acme"
        description="Acme gives you the building blocks to create stunning, animated interfaces in minutes."
        primaryAction={{ label: "Learn more", href: "#" }}
        secondaryAction={{ label: "Get Started", href: "#" }}
      />
      <figcaption className="px-4 text-sm text-muted-foreground">SmoothUI Hero 4</figcaption>
    </figure>
  ),
};

/** Four hover colours, cycled with the source's nth-child pattern. */
export const FourColours: Story = {
  args: {
    hoverColors: [
      "var(--color-primary)",
      "var(--color-info)",
      "var(--color-success)",
      "var(--color-warning)",
    ],
  },
};
