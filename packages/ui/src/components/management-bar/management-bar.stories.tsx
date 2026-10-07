import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Download, Share2, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

import { ManagementBar, type ManagementBarAction } from "./management-bar";

const FILES = [
  { name: "Quarterly report.pdf", size: "2.4 MB" },
  { name: "Brand guidelines.fig", size: "18.1 MB" },
  { name: "Launch video.mp4", size: "212 MB" },
  { name: "Pricing model.xlsx", size: "640 KB" },
  { name: "Customer interviews.docx", size: "1.1 MB" },
  { name: "Roadmap 2027.key", size: "9.8 MB" },
];

const ACTIONS: ManagementBarAction[] = [
  { label: "Tag", icon: <Tag />, onSelect: () => {} },
  { label: "Share", icon: <Share2 />, onSelect: () => {} },
  { label: "Download", icon: <Download />, onSelect: () => {}, tone: "primary" },
  { label: "Archive", icon: <Archive />, onSelect: () => {} },
  { label: "Delete", icon: <Trash2 />, onSelect: () => {}, tone: "destructive" },
];

function FilesDemo({ labels }: { labels?: "hover" | "always" }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([FILES[0]?.name ?? "", FILES[2]?.name ?? ""]),
  );
  const [page, setPage] = useState(1);
  const toggle = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  return (
    <div className="flex w-[min(34rem,92vw)] flex-col gap-4">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {FILES.map((file) => (
          <li key={file.name}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selected.has(file.name)}
                onChange={() => {
                  toggle(file.name);
                }}
              />
              <span className="flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="grid min-h-14 place-items-center">
        <ManagementBar
          placement="inline"
          selectedCount={selected.size}
          onClearSelection={() => {
            setSelected(new Set());
          }}
          actions={ACTIONS}
          labels={labels}
          page={page}
          pageCount={12}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

const meta = {
  title: "Data/Management Bar",
  component: ManagementBar,
  args: {
    selectedCount: 3,
    actions: ACTIONS,
    pageCount: 8,
    placement: "inline",
    labels: "hover",
  },
  argTypes: {
    placement: { control: "inline-radio", options: ["inline", "floating"] },
    labels: { control: "inline-radio", options: ["hover", "always"] },
    actions: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ManagementBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Tick and untick rows: the bar springs up with the first selection, the
 * count rolls, and it drops away when you clear it. Hover or Tab through the
 * actions to spring their labels open.
 */
export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: () => <FilesDemo />,
};

/** Every label open, for a bar with room to spare. */
export const LabelsAlways: Story = {
  parameters: { controls: { disable: true } },
  render: () => <FilesDemo labels="always" />,
};

/** The count alone, driven from Storybook's controls. */
export const Playground: Story = {
  args: { onClearSelection: () => {} },
};

function FloatingDemo() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            setCount((current) => current + 1);
          }}
        >
          Select one more
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => {
            setCount((current) => current + 25);
          }}
        >
          Select 25 more
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        The bar floats at the bottom of the viewport.
      </p>
      <ManagementBar
        selectedCount={count}
        onClearSelection={() => {
          setCount(0);
        }}
        actions={ACTIONS.slice(2)}
      />
    </div>
  );
}

/** `placement="floating"`: pinned to the bottom of the viewport, above the page. */
export const Floating: Story = {
  parameters: { controls: { disable: true } },
  render: () => <FloatingDemo />,
};
