import type { Meta, StoryObj } from "@storybook/react-vite";
import { UserMinus } from "lucide-react";
import { useState } from "react";

import { InlineConfirm } from "./inline-confirm";

const meta = {
  title: "Form/Inline Confirm",
  component: InlineConfirm,
  args: {
    label: "Delete file",
    cancelLabel: "Keep",
    confirmLabel: "Delete",
    doneLabel: "Deleted",
    undoLabel: "Undo",
    undoWindow: 4000,
    shape: "pill",
    stroke: true,
  },
  argTypes: {
    shape: { control: "select", options: ["pill", "rounded", "square"] },
    icon: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof InlineConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Log() {
  const [events, setEvents] = useState<string[]>([]);
  const push = (event: string) => {
    setEvents((current) => [...current.slice(-3), event]);
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <InlineConfirm
        onConfirm={() => {
          push("confirmed");
        }}
        onUndo={() => {
          push("undone");
        }}
      />
      <output className="text-xs text-muted-foreground">{events.join(" · ") || "—"}</output>
    </div>
  );
}

/**
 * bencho "Inline confirm", with its Corner (shape) and Stroke switches. The
 * width springs between phases; Keep takes focus when asking, Undo once done.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <Log />
        <figcaption className="text-xs text-muted-foreground">bencho Inline confirm</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <InlineConfirm shape="rounded" stroke={false} />
        <figcaption className="text-xs text-muted-foreground">
          Corner 12 · Stroke off
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <InlineConfirm shape="square" />
        <figcaption className="text-xs text-muted-foreground">Corner 0</figcaption>
      </figure>
    </div>
  ),
};

export const CustomLabels: Story = {
  args: {
    label: "Remove member",
    icon: <UserMinus />,
    cancelLabel: "Cancel",
    confirmLabel: "Remove",
    doneLabel: "Removed",
    announcement: "Member removed",
  },
};
