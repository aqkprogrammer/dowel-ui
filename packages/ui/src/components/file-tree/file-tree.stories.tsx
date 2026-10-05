import type { Meta, StoryObj } from "@storybook/react-vite";
import { Braces, FileCode2, FileText, Image, Palette } from "lucide-react";
import { useState } from "react";

import { FileTree, type FileTreeNode } from "./file-tree";

const PROJECT: FileTreeNode[] = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "app/layout", name: "layout.tsx" },
      { id: "app/page", name: "page.tsx", status: "modified" },
      {
        id: "app/settings",
        name: "settings",
        children: [
          { id: "app/settings/page", name: "page.tsx", status: "added" },
          { id: "app/settings/actions", name: "actions.ts", status: "added" },
        ],
      },
    ],
  },
  {
    id: "components",
    name: "components",
    children: [
      {
        id: "components/ui",
        name: "ui",
        children: [
          { id: "components/ui/button", name: "button.tsx", status: "modified" },
          { id: "components/ui/card", name: "card.tsx" },
          { id: "components/ui/dialog", name: "dialog.tsx" },
          { id: "components/ui/old-modal", name: "old-modal.tsx", status: "deleted" },
        ],
      },
      { id: "components/site-header", name: "site-header.tsx" },
    ],
  },
  {
    id: "lib",
    name: "lib",
    children: [{ id: "lib/utils", name: "utils.ts" }],
  },
  { id: "public", name: "public", children: [] },
  { id: "package", name: "package.json", status: "modified" },
  { id: "readme", name: "README.md" },
  { id: "tsconfig", name: "tsconfig.json" },
];

const meta = {
  title: "Navigation/File Tree",
  component: FileTree,
  args: {
    "aria-label": "Project files",
    items: PROJECT,
    defaultExpanded: ["app", "components", "components/ui"],
    defaultSelected: "components/ui/button",
    size: "md",
    guides: true,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md"] },
    items: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click a folder: its front panel tilts open, its children drop in one after
 * another beside a rail that draws down, and the highlight glides to it.
 * Then try the keyboard — arrows, Home/End, `*`, or type a letter.
 */
export const Default: Story = {
  render: (args) => (
    <div className="w-72 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-sm">
      <p className="px-2 pt-1 pb-2 text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
        Explorer
      </p>
      <FileTree {...args} />
    </div>
  ),
};

function ControlledDemo() {
  const folders = ["app", "app/settings", "components", "components/ui", "lib", "public"];
  const [expanded, setExpanded] = useState<string[]>(["app"]);
  const [selected, setSelected] = useState<string | null>("app/page");
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 hover:bg-accent"
          onClick={() => {
            setExpanded(folders);
          }}
        >
          Expand all
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 hover:bg-accent"
          onClick={() => {
            setExpanded([]);
          }}
        >
          Collapse all
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card p-2">
        <FileTree
          aria-label="Project files"
          items={PROJECT}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selected={selected}
          onSelectedChange={setSelected}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Selected: <code>{selected ?? "nothing"}</code>
      </p>
    </div>
  );
}

/** Controlled: the parent owns which folders are open and which file is selected. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledDemo />,
};

/** Compact rows without guide rails, for a dense sidebar. */
export const Compact: Story = {
  args: { size: "sm", guides: false },
  render: (args) => (
    <div className="w-60 rounded-lg border border-border bg-card p-1.5">
      <FileTree {...args} />
    </div>
  ),
};

const DESIGN: FileTreeNode[] = [
  {
    id: "brand",
    name: "brand",
    children: [
      { id: "logo", name: "logo.svg", icon: <Image className="text-info" /> },
      {
        id: "wordmark",
        name: "wordmark.png",
        icon: <Image className="text-info" />,
        status: "added",
      },
      { id: "palette", name: "palette.css", icon: <Palette className="text-warning" /> },
    ],
  },
  {
    id: "docs",
    name: "docs",
    children: [
      { id: "guide", name: "guide.md", icon: <FileText className="text-muted-foreground" /> },
      {
        id: "tokens",
        name: "tokens.json",
        icon: <Braces className="text-success" />,
        status: "modified",
      },
    ],
  },
  { id: "entry", name: "entry.tsx", icon: <FileCode2 className="text-primary" /> },
];

/** Any glyph per node — folders keep their tilting lid unless you replace it too. */
export const CustomIcons: Story = {
  args: {
    items: DESIGN,
    defaultExpanded: ["brand", "docs"],
    defaultSelected: "tokens",
    "aria-label": "Design assets",
  },
  render: (args) => (
    <div className="w-64 rounded-xl border border-border bg-card p-2">
      <FileTree {...args} />
    </div>
  ),
};
