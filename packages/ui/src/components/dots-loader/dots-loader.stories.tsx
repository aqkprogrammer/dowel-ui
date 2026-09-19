import type { Meta, StoryObj } from "@storybook/react-vite";

import { DotsLoader, dotsLoaderVariantNames } from "./dots-loader";

const meta = {
  title: "Feedback/Dots Loader",
  component: DotsLoader,
  args: { variant: "pulse", size: "md" },
  argTypes: {
    variant: { control: "select", options: dotsLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof DotsLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/** All 25 motions. Each is a value of `variant`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
      {dotsLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-28 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <DotsLoader variant={variant} />
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
        <DotsLoader key={size} size={size} variant="bounce" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <DotsLoader className="text-primary" variant="ripple" />
      <DotsLoader className="text-success" variant="orbit" />
      <DotsLoader className="text-muted-foreground" variant="thinking" />
    </div>
  ),
};
