import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator";

const meta = {
  title: "Layout/Separator",
  component: Separator,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Radix primitives</h4>
        <p className="text-sm text-muted-foreground">An open source component library.</p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Blog</span>
        <Separator orientation="vertical" />
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
  ),
};

/** Exposed to assistive technology when it divides genuinely distinct groups. */
export const Semantic: Story = {
  render: () => (
    <div className="w-72 space-y-4">
      <p className="text-sm">Account settings</p>
      <Separator decorative={false} />
      <p className="text-sm">Danger zone</p>
    </div>
  ),
};
