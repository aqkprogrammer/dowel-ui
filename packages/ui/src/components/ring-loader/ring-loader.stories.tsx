import type { Meta, StoryObj } from "@storybook/react-vite";

import { RingLoader, ringLoaderVariantNames } from "./ring-loader";

const meta = {
  title: "Feedback/Ring Loader",
  component: RingLoader,
  args: { variant: "classic", size: "md" },
  argTypes: {
    variant: { control: "select", options: ringLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof RingLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/** All 30 motions. Each is a value of `variant`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
      {ringLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-28 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <RingLoader variant={variant} />
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
        <RingLoader key={size} size={size} variant="classic" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <RingLoader className="text-primary" variant="sweep" />
      <RingLoader className="text-success" variant="radar" />
      <RingLoader className="text-muted-foreground" variant="orbit" />
    </div>
  ),
};
