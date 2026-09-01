import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { Spinner } from "./spinner";

const meta = {
  title: "Feedback/Spinner",
  component: Spinner,
  args: { size: "md" },
  argTypes: { size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] } },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Loading" },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <Spinner key={size} size={size} />
      ))}
    </div>
  ),
};

export const InheritsColour: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="text-primary" />
      <Spinner className="text-destructive" />
      <Spinner className="text-muted-foreground" />
    </div>
  ),
};

/** Inside a control that already reports its own busy state, omit `label`. */
export const InsideAButton: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Button loading>Saving changes</Button>,
};
