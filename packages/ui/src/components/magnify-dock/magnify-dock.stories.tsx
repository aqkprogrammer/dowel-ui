import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark, Folder, House, Search, User } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DirectionProvider } from "@/components/direction";

import { MagnifyDock, type MagnifyDockItem } from "./magnify-dock";

/* bencho's five apps. */
const APPS: MagnifyDockItem[] = [
  { value: "home", label: "Home", icon: <House strokeWidth={1.75} /> },
  { value: "search", label: "Search", icon: <Search strokeWidth={1.75} /> },
  { value: "files", label: "Files", icon: <Folder strokeWidth={1.75} /> },
  { value: "saved", label: "Saved", icon: <Bookmark strokeWidth={1.75} /> },
  { value: "you", label: "You", icon: <User strokeWidth={1.75} /> },
];

// Annotated: an inline decorator makes the inferred type unnameable (TS2883).
const meta: Meta<typeof MagnifyDock> = {
  title: "Navigation/Magnify Dock",
  component: MagnifyDock,
  args: {
    items: APPS,
    defaultValue: "home",
    magnify: 1.32,
    lift: 8,
    reach: 2,
    fill: "light",
    stroke: false,
  },
  argTypes: {
    magnify: { control: { type: "range", min: 1, max: 2, step: 0.02 } },
    lift: { control: { type: "range", min: 0, max: 22, step: 1 } },
    reach: { control: { type: "range", min: 0, max: 4, step: 1 } },
    fill: { control: "inline-radio", options: ["light", "dark"] },
    items: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="grid min-h-[12rem] place-items-center rounded-xl bg-muted p-8 pt-16">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover an icon, or Tab in and use the arrow keys: the lens follows either. */
export const Default: Story = {};

function Cell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-3">
      <div className="grid min-h-[10rem] place-items-center rounded-xl bg-muted px-8 pt-14 pb-8">
        {children}
      </div>
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** bencho Magnifying dock: the source block and its workbench feel settings. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  decorators: [(Story) => <Story />],
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Cell caption="bencho Magnifying dock">
        <MagnifyDock items={APPS} defaultValue="home" />
      </Cell>
      <Cell caption="bencho Magnifying dock · Magnify 1.8, Lift 16">
        <MagnifyDock items={APPS} defaultValue="home" magnify={1.8} lift={16} />
      </Cell>
      <Cell caption="bencho Magnifying dock · Reach 0">
        <MagnifyDock items={APPS} defaultValue="home" reach={0} />
      </Cell>
      <Cell caption="bencho Magnifying dock · Reach 4">
        <MagnifyDock items={APPS} defaultValue="home" reach={4} />
      </Cell>
      <Cell caption="bencho Magnifying dock · Fill dark">
        <MagnifyDock items={APPS} defaultValue="home" fill="dark" />
      </Cell>
      <Cell caption="bencho Magnifying dock · Stroke on">
        <MagnifyDock items={APPS} defaultValue="home" stroke />
      </Cell>
    </div>
  ),
};

/** Items with an `href` render links; the active one is aria-current="page". */
export const Links: Story = {
  args: {
    items: APPS.map((app) => ({ ...app, href: `#${app.value}` })),
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState("files");
    return (
      <div className="flex flex-col items-center gap-4">
        <MagnifyDock {...args} value={value} onValueChange={setValue} />
        <output className="text-xs text-muted-foreground">Active: {value}</output>
      </div>
    );
  },
};

/** Disabled items are skipped by the arrow keys and never magnify on hover. */
export const WithDisabled: Story = {
  args: {
    items: APPS.map((app) => (app.value === "saved" ? { ...app, disabled: true } : app)),
  },
};

/** Arrow keys mirror: ArrowLeft moves toward the inline end. */
export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl">
        <MagnifyDock {...args} aria-label="الشريط" />
      </div>
    </DirectionProvider>
  ),
};
