import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark, Folder, House, Search, User } from "lucide-react";
import type { ReactNode } from "react";

import { DirectionProvider } from "../direction";
import {
  GooTabs,
  GooTabsContent,
  GooTabsList,
  GooTabsTrigger,
  type GooTabsListProps,
  type GooTabsProps,
} from "./goo-tabs";

/** The bencho icon bar: house, search, folder, bookmark, user. */
const ITEMS = [
  { value: "home", label: "Home", icon: <House /> },
  { value: "search", label: "Search", icon: <Search /> },
  { value: "files", label: "Files", icon: <Folder /> },
  { value: "saved", label: "Saved", icon: <Bookmark /> },
  { value: "you", label: "You", icon: <User /> },
];

type BarProps = Omit<GooTabsListProps, "orientation" | "dir"> & {
  orientation?: GooTabsProps["orientation"];
  dir?: string;
};

function IconBar({
  orientation,
  dir,
  panels = true,
  ...list
}: BarProps & { panels?: boolean }) {
  return (
    <GooTabs
      defaultValue="home"
      orientation={orientation}
      dir={dir === "rtl" || dir === "ltr" ? dir : undefined}
    >
      <GooTabsList {...list}>
        {ITEMS.map((item) => (
          <GooTabsTrigger key={item.value} value={item.value} aria-label={item.label}>
            {item.icon}
          </GooTabsTrigger>
        ))}
      </GooTabsList>
      {panels
        ? ITEMS.map((item) => (
            <GooTabsContent key={item.value} value={item.value} className="mt-0 text-sm">
              {item.label}
            </GooTabsContent>
          ))
        : null}
    </GooTabs>
  );
}

/** The workbench stage: a flat muted surface the bar sits centred on. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl bg-muted p-8">{children}</div>
  );
}

const meta = {
  title: "Navigation/Goo Tabs",
  component: GooTabsList,
  args: {
    "aria-label": "Main",
    dilate: 100,
    bounce: 50,
    speed: 50,
    corner: 26,
    hug: 6,
    goo: true,
    tone: "default",
    stroke: false,
  },
  argTypes: {
    dilate: { control: { type: "range", min: 0, max: 100, step: 5 } },
    bounce: { control: { type: "range", min: 0, max: 100, step: 5 } },
    speed: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 26, step: 2 } },
    hug: { control: { type: "range", min: 3, max: 10, step: 0.5 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
  },
  render: (args) => (
    <Stage>
      <IconBar {...args} />
    </Stage>
  ),
} satisfies Meta<typeof GooTabsList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a tab, or focus the bar and use arrows and Home/End: the pill stretches, then snaps. */
export const Default: Story = {};

/**
 * Every bencho "Icon bar" setting: the default row, Axis Column, Fill Dark, Stroke,
 * Dilate 0 (the pill slides), Bounce 0 and 100, Speed 0 and 100, Corner 0 and Hug 10,
 * plus the goo-free fallback (`goo={false}`, also what reduced motion shows).
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const rows: { caption: string; props: Partial<BarProps> }[] = [
      { caption: "Icon bar — Row (default)", props: {} },
      { caption: "Icon bar — Column", props: { orientation: "vertical" } },
      { caption: "Icon bar — Fill Dark", props: { tone: "inverted" } },
      { caption: "Icon bar — Stroke on", props: { stroke: true } },
      { caption: "Icon bar — Dilate 0 (slides)", props: { dilate: 0 } },
      { caption: "Icon bar — Bounce 0", props: { bounce: 0 } },
      { caption: "Icon bar — Bounce 100", props: { bounce: 100 } },
      { caption: "Icon bar — Speed 0 (slow)", props: { speed: 0 } },
      { caption: "Icon bar — Speed 100 (fast)", props: { speed: 100 } },
      { caption: "Icon bar — Corner 0, Hug 10", props: { corner: 0, hug: 10 } },
      { caption: "Icon bar — plain pill (goo off)", props: { goo: false } },
    ];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ caption, props }) => (
          <figure key={caption} className="m-0 grid gap-2">
            <Stage>
              <IconBar aria-label={caption} panels={false} {...props} />
            </Stage>
            <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
          </figure>
        ))}
      </div>
    );
  },
};

/** Axis: Column. Up/Down move between tabs and the pill stretches on Y. */
export const Vertical: Story = {
  render: (args) => (
    <Stage>
      <IconBar {...args} orientation="vertical" />
    </Stage>
  ),
};

/** Without the goo filter: the same two-phase pill, as reduced motion renders it. */
export const PlainPill: Story = {
  args: { goo: false },
};

export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl">
        <Stage>
          <IconBar {...args} dir="rtl" />
        </Stage>
      </div>
    </DirectionProvider>
  ),
};
