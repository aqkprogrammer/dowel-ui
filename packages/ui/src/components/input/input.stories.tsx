import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/label";

import { Input } from "./input";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-72">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Input",
  component: Input,
  args: {
    placeholder: "acme-inc",
    inputSize: "md",
  },
  argTypes: {
    inputSize: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    type: { control: "select", options: ["text", "email", "password", "number", "search"] },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid gap-2">
      <Label htmlFor="project">Project name</Label>
      <Input id="project" {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      <Input inputSize="sm" placeholder="Small" aria-label="Small" />
      <Input inputSize="md" placeholder="Medium" aria-label="Medium" />
      <Input inputSize="lg" placeholder="Large" aria-label="Large" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        defaultValue="not-an-email"
        aria-invalid
        aria-describedby="email-error"
      />
      <p id="email-error" className="text-xs text-destructive">
        Enter a valid email address.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, value: "Read only" },
};

export const Types: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      <Input type="email" placeholder="you@example.com" aria-label="Email" />
      <Input type="password" placeholder="••••••••" aria-label="Password" />
      <Input type="number" placeholder="42" aria-label="Quantity" />
      <Input type="search" placeholder="Search…" aria-label="Search" />
    </div>
  ),
};
