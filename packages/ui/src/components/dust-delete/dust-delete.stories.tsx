import type { Meta, StoryObj } from "@storybook/react-vite";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/button";

import { DustDelete, type DustDeleteHandle } from "./dust-delete";

const meta = {
  title: "Effects/Dust Delete",
  component: DustDelete,
  args: { children: null },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DustDelete>;

export default meta;
type Story = StoryObj<typeof meta>;

const INITIAL = [
  { id: 1, title: "Quarterly report.pdf", detail: "2.4 MB · edited yesterday" },
  { id: 2, title: "Launch checklist", detail: "12 of 18 done" },
  { id: 3, title: "Team offsite photos", detail: "64 images" },
  { id: 4, title: "Invoice #1042", detail: "Paid · $1,280.00" },
];

function List() {
  const [items, setItems] = useState(INITIAL);
  const [deleting, setDeleting] = useState<number | null>(null);

  return (
    <div className="flex w-80 flex-col gap-2">
      {items.map((item) => (
        <DustDelete
          key={item.id}
          deleted={deleting === item.id}
          onDeleted={() => {
            setItems((current) => current.filter((entry) => entry.id !== item.id));
            setDeleting(null);
          }}
        >
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${item.title}`}
              disabled={deleting !== null}
              onClick={() => setDeleting(item.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </DustDelete>
      ))}
      {items.length === 0 ? (
        <Button variant="outline" onClick={() => setItems(INITIAL)}>
          Restore all
        </Button>
      ) : null}
    </div>
  );
}

/** Delete a row: it breaks into tiles of itself, drifts away, and the list closes up. */
export const Default: Story = {
  render: () => <List />,
};

function Card() {
  const handle = useRef<DustDeleteHandle>(null);
  const [key, setKey] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <DustDelete key={key} actionRef={handle}>
        <div className="w-72 rounded-xl border bg-card p-5">
          <p className="text-base font-semibold">Snap it away</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The dust is made from the real content, text and all, through an imperative handle.
          </p>
        </div>
      </DustDelete>
      <div className="flex gap-2">
        <Button onClick={() => void handle.current?.disintegrate()}>Disintegrate</Button>
        <Button variant="outline" onClick={() => setKey((value) => value + 1)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** A larger card, driven by `actionRef` instead of a `deleted` flag. */
export const Imperative: Story = {
  render: () => <Card />,
};
