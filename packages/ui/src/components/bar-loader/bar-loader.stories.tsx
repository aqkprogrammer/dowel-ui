import type { Meta, StoryObj } from "@storybook/react-vite";

import { BarLoader, barLoaderVariantNames } from "./bar-loader";

const meta = {
  title: "Feedback/Bar Loader",
  component: BarLoader,
  args: { variant: "cascade", size: "md" },
  argTypes: {
    variant: { control: "select", options: barLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
} satisfies Meta<typeof BarLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/** All 21 motions. Each is a value of `variant`, not a separate component. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
      {barLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-40 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <BarLoader variant={variant} size={variant === "wave-physics" ? "sm" : "md"} />
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
        <BarLoader key={size} size={size} variant="cascade" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <BarLoader className="text-primary" variant="equalizer" />
      <BarLoader className="text-success" variant="voice-wave" />
      <BarLoader className="text-muted-foreground" variant="indeterminate" />
    </div>
  ),
};
