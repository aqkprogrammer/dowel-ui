import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/input";

import { Label } from "./label";

const meta = {
  title: "Forms/Label",
  component: Label,
  args: { children: "Project name" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="project" {...args} />
      <Input id="project" placeholder="acme-inc" />
    </div>
  ),
};

export const Required: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="email">
        Email
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      </Label>
      <Input id="email" type="email" required placeholder="you@example.com" />
    </div>
  ),
};

/** A label dims alongside the control it describes. */
export const WithDisabledControl: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-72 gap-2">
      <Input id="locked" disabled placeholder="Locked" className="peer order-2" />
      <Label htmlFor="locked" className="order-1">
        Workspace slug
      </Label>
    </div>
  ),
};
