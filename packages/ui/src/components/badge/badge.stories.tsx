import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check } from "lucide-react";

import { Badge } from "./badge";

const meta = {
  title: "Display/Badge",
  component: Badge,
  args: { children: "Active", variant: "default", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "destructive", "success", "warning", "info"],
    },
    size: { control: "select", options: ["sm", "md"] },
    asChild: { table: { disable: true } },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="success">Deployed</Badge>
      <Badge variant="warning">Degraded</Badge>
      <Badge variant="info">Queued</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Badge variant="success">
      <Check />
      Verified
    </Badge>
  ),
};

export const AsLink: Story = {
  name: "asChild (renders a link)",
  parameters: { controls: { disable: true } },
  render: () => (
    <Badge asChild variant="outline">
      <a href="#status">View status</a>
    </Badge>
  ),
};
