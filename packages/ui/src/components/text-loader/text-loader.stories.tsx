import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextLoader, textLoaderVariantNames } from "./text-loader";

const meta = {
  title: "Feedback/Text Loader",
  component: TextLoader,
  args: { variant: "shimmer", size: "md" },
  argTypes: {
    variant: { control: "select", options: textLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof TextLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/** All 19 motions. Each is a value of `variant`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {textLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-28 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <TextLoader variant={variant} />
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
        <TextLoader key={size} size={size} variant="typing" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <TextLoader className="text-primary" variant="shimmer" />
      <TextLoader className="text-success" variant="app-icon" />
      <TextLoader className="text-muted-foreground" variant="dots" />
    </div>
  ),
};
