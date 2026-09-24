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
    variant: "default",
  },
  argTypes: {
    shape: { control: "select", options: ["pill", "rounded", "square"] },
    variant: { control: "inline-radio", options: ["default", "icon"] },
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

/**
 * `variant="icon"`: a compact round bin. Press it and the lid lifts while a
 * panel slides out beside it — the check confirms, the cross (or the bin
 * again, or Escape) backs out and the lid settles shut. Confirming draws a
 * check where the bin was and offers Undo for the window.
 */
export const Icon: Story = {
  args: { variant: "icon" },
  render: (args) => (
    <div className="flex items-center gap-3 rounded-xl bg-muted py-6 ps-6 pe-40">
      <span className="text-sm">quarterly-report.pdf</span>
      <InlineConfirm {...args} />
    </div>
  ),
};

/** With `undoWindow={0}` the icon variant rests on its check once confirmed. */
export const IconWithoutUndo: Story = {
  args: { variant: "icon", undoWindow: 0, label: "Delete draft", doneLabel: "Draft deleted" },
  render: Icon.render,
};

/** The icon variant in every shape, with and without the hairline. */
export const IconShapes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted py-10 ps-10 pe-40">
      {(["pill", "rounded", "square"] as const).map((shape) => (
        <figure key={shape} className="flex items-center gap-4">
          <InlineConfirm variant="icon" shape={shape} />
          <InlineConfirm variant="icon" shape={shape} stroke={false} />
          <figcaption className="text-xs text-muted-foreground">{shape}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
