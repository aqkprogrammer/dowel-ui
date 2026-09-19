import type { Meta, StoryObj } from "@storybook/react-vite";
import { Eye } from "lucide-react";

import { NotifyButton } from "./notify-button";

const meta = {
  title: "Form/Notify Button",
  component: NotifyButton,
  args: {
    label: "Notify me",
    activeLabel: "You’ll be notified",
    stroke: true,
  },
  argTypes: { icon: { control: false } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof NotifyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** bencho "Notify", with its Corner and Stroke switches. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <NotifyButton />
        <figcaption className="text-xs text-muted-foreground">bencho Notify</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <NotifyButton stroke={false} className="rounded-lg" />
        <figcaption className="text-xs text-muted-foreground">Corner 8 · Stroke off</figcaption>
      </figure>
    </div>
  ),
};

export const CustomIcon: Story = {
  args: {
    label: "Watch",
    activeLabel: "Watching this thread",
    icon: <Eye className="size-4" />,
    announcement: "You are now watching this thread",
  },
};
