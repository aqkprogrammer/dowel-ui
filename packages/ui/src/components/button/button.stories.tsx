import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "Foundation/Button",
  component: Button,
  args: {
    children: "Continue",
    variant: "primary",
    size: "md",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "outline",
        "ghost",
        "destructive",
        "link",
        "soft",
        "gradient",
      ],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
    shape: { control: "select", options: ["default", "pill", "square"] },
    press: { control: "inline-radio", options: ["scale", "none"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    asChild: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Add item">
        <Plus />
      </Button>
      <Button size="icon-sm" variant="outline" aria-label="Delete item">
        <Trash2 />
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus />
        New project
      </Button>
      <Button variant="outline">
        Continue
        <ArrowRight />
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true },
};

export const LoadingAcrossVariants: Story = {
  name: "Loading (all variants)",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading>Saving</Button>
      <Button variant="secondary" loading>
        Saving
      </Button>
      <Button variant="outline" loading>
        Saving
      </Button>
      <Button variant="destructive" loading>
        Deleting
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AsLink: Story = {
  name: "asChild (renders a link)",
  parameters: { controls: { disable: true } },
  render: () => (
    <Button asChild>
      <a href="#pricing">View pricing</a>
    </Button>
  ),
};

/** Icon-only buttons need an accessible name; the a11y addon fails without one. */
export const IconOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="icon" aria-label="Add item">
        <Plus />
      </Button>
      <Button size="icon" variant="outline" aria-label="Delete item">
        <Trash2 />
      </Button>
    </div>
  ),
};

/**
 * SmoothUI's SmoothButton, reproduced with Dowel tokens: the `soft` and
 * `gradient` ("candy") variants, the `shape` axis, and press feedback — which
 * every button except `link` has by default. Hold one down to see it.
 */
export const SmoothButton: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft">Soft</Button>
        <Button variant="gradient">Candy</Button>
        <Button variant="gradient" shape="pill">
          Candy pill <ArrowRight />
        </Button>
        <Button variant="outline" shape="pill">
          Outline pill
        </Button>
        <Button variant="secondary" shape="square">
          Square
        </Button>
        <Button size="icon" variant="soft" shape="pill" aria-label="Add item">
          <Plus />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button press="none">No press feedback</Button>
        <Button variant="gradient" loading>
          Saving
        </Button>
      </div>
    </div>
  ),
};
