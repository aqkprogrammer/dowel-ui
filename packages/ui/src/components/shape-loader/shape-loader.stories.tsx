import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShapeLoader, shapeLoaderVariantNames } from "./shape-loader";

const meta = {
  title: "Feedback/Shape Loader",
  component: ShapeLoader,
  args: { variant: "flip-square", size: "md" },
  argTypes: {
    variant: { control: "select", options: shapeLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof ShapeLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/** All 35 motions. Each is a value of `variant`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
      {shapeLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-28 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <ShapeLoader variant={variant} />
          </div>
          <figcaption className="text-xs text-muted-foreground">{variant}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <ShapeLoader key={size} size={size} variant="hexagon-spinner" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <ShapeLoader className="text-primary" variant="pumping-heart" />
      <ShapeLoader className="text-success" variant="hourglass" />
      <ShapeLoader className="text-muted-foreground" variant="spinning-squares" />
    </div>
  ),
};
