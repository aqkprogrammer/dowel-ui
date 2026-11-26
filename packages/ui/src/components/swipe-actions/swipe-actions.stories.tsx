import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { SwipeActions, type SwipeAction } from "./swipe-actions";

function ArchiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <path d="M5 9v10h14V9M10 13h4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

const ACTIONS: SwipeAction[] = [
  { id: "archive", label: "Archive", icon: <ArchiveIcon />, tone: "contrast" },
  { id: "delete", label: "Delete", icon: <TrashIcon />, tone: "neutral" },
];

/** The reference row: an avatar dot beside two lines. */
function RowContent() {
  return (
    <>
      <span className="size-6 shrink-0 rounded-full bg-foreground" />
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-1 w-full rounded-full bg-foreground/80" />
        <span className="h-1 w-3/5 rounded-full bg-foreground/30" />
      </span>
    </>
  );
}

const meta = {
  title: "Data/Swipe Actions",
  component: SwipeActions,
  args: { actions: ACTIONS, size: "md", "aria-label": "Message from Lumen" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    actions: { control: false },
  },
  parameters: { layout: "centered" },
  render: (args) => (
    <div className="w-72">
      <SwipeActions {...args}>
        <RowContent />
      </SwipeActions>
    </div>
  ),
} satisfies Meta<typeof SwipeActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag the row toward the start, or Tab to an action. */
export const Default: Story = {};

function Playing() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setOpen((current) => !current);
    }, 1200);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <div className="w-52">
      <SwipeActions aria-label="Message" actions={ACTIONS} open={open} onOpenChange={setOpen}>
        <RowContent />
      </SwipeActions>
    </div>
  );
}

/** Opens and closes on its own on a dark tile, as in the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <Playing />
      <span className="text-sm font-medium">Swipe Actions</span>
    </div>
  ),
};

function Inbox() {
  const [rows, setRows] = useState(["Lumen", "Halcyon", "Golden Hour"]);
  return (
    <ul className="flex w-80 flex-col gap-2">
      {rows.map((name) => (
        <li key={name}>
          <SwipeActions
            aria-label={`Message from ${name}`}
            actions={[
              { id: "archive", label: "Archive", icon: <ArchiveIcon />, tone: "contrast" },
              {
                id: "delete",
                label: "Delete",
                icon: <TrashIcon />,
                tone: "destructive",
                onSelect: () => {
                  setRows((current) => current.filter((row) => row !== name));
                },
              },
            ]}
          >
            <span className="size-8 shrink-0 rounded-full bg-primary" />
            <span className="text-sm font-medium">{name}</span>
          </SwipeActions>
        </li>
      ))}
    </ul>
  );
}

/** A list where Delete removes the row. */
export const List: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Inbox />,
};
