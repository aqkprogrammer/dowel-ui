import type { Meta, StoryObj } from "@storybook/react-vite";

import { GridLoader, gridLoaderAliases, gridLoaderVariantNames } from "./grid-loader";

const meta = {
  title: "Feedback/Grid Loader",
  component: GridLoader,
  args: { variant: "plus-hollow", size: "md", mode: "pulse", speed: "normal" },
  argTypes: {
    variant: { control: "select", options: gridLoaderVariantNames },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
    mode: { control: "inline-radio", options: ["pulse", "stagger"] },
    speed: { control: "inline-radio", options: ["slow", "normal", "fast"] },
  },
} satisfies Meta<typeof GridLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

/**
 * All 68 variants. Each is a value of `variant`, not a separate component.
 * Aliases (other SmoothUI names for the same matrix) show their canonical pattern.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {gridLoaderVariantNames.map((variant) => (
        <figure
          key={variant}
          className="flex h-28 flex-col items-center justify-between rounded-lg border border-border p-4"
        >
          <div className="flex flex-1 items-center">
            <GridLoader mode="stagger" variant={variant} />
          </div>
          <figcaption className="text-xs text-muted-foreground">
            {variant in gridLoaderAliases
              ? `${variant} → ${gridLoaderAliases[variant as keyof typeof gridLoaderAliases]}`
              : variant}
          </figcaption>
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
        <GridLoader key={size} size={size} variant="frame" />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <GridLoader className="text-primary" mode="stagger" variant="frame" />
      <GridLoader className="text-success" rounded variant="plus-full" />
      <GridLoader className="text-muted-foreground" variant="thinking" />
    </div>
  ),
};
