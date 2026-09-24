import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, House, Search, Settings, User } from "lucide-react";
import { useState } from "react";

import { DirectionProvider } from "../direction";
import { GooeyNav, type GooeyNavItem } from "./gooey-nav";

const ITEMS = ["Home", "Projects", "Journal", "About", "Contact"];

const WITH_ICONS: GooeyNavItem[] = [
  { label: "Home", icon: <House /> },
  { label: "Search", icon: <Search /> },
  { label: "Alerts", icon: <Bell /> },
  { label: "Profile", icon: <User /> },
  { label: "Settings", icon: <Settings /> },
];

const meta = {
  title: "Navigation/Gooey Nav",
  component: GooeyNav,
  args: { items: ITEMS, size: "md", "aria-label": "Main" },
  argTypes: {
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
    separation: { control: { type: "range", min: 0, max: 40, step: 2 } },
    radius: { control: { type: "range", min: 0, max: 24, step: 1 } },
    items: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof GooeyNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Click an item: it lifts out of the bar as its own tile and the rest close up.
 * Jump from one end to the other to see the gap travel across and heal behind it.
 */
export const Default: Story = {};

/** Each size sets its own padding, text and icon size, separation and radius. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid justify-items-center gap-6">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <GooeyNav
          key={size}
          items={ITEMS}
          size={size}
          aria-label={`Main, ${size}`}
          defaultValue={2}
        />
      ))}
    </div>
  ),
};

/** Icons render before the label and scale with the size. */
export const WithIcons: Story = {
  args: { items: WITH_ICONS, defaultValue: 1 },
};

/** Items with `href` are links; the selected one is the current page. */
export const Links: Story = {
  args: {
    items: [
      { label: "Overview", href: "#overview" },
      { label: "Pricing", href: "#pricing" },
      { label: "Customers", href: "#customers" },
      { label: "Docs", href: "#docs" },
    ],
  },
};

/** `activeClassName` styles the selected tile; `itemClassName` every tile. */
export const CustomColours: Story = {
  args: {
    activeClassName: "bg-foreground text-background",
    itemClassName: "bg-card text-card-foreground shadow-xs",
  },
};

/** Wider gaps and softer corners. */
export const Loose: Story = {
  args: { separation: 32, radius: 20, size: "lg" },
};

/** Driven from outside. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(0);
    return (
      <div className="grid justify-items-center gap-4">
        <GooeyNav items={ITEMS} aria-label="Main" value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground">Selected: {ITEMS[value]}</p>
      </div>
    );
  },
};

/** The bar never wraps; in a narrow space it scrolls instead. */
export const Overflow: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-72 rounded-xl border border-dashed border-border p-2">
      <GooeyNav items={[...ITEMS, "Archive", "Press"]} size="sm" aria-label="Main" />
    </div>
  ),
};

/** Right to left: gaps, corners and arrow keys all follow the reading direction. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <DirectionProvider dir="rtl">
      <div dir="rtl" lang="ar">
        <GooeyNav
          items={["الرئيسية", "المشاريع", "المدونة", "من نحن"]}
          aria-label="القائمة"
          defaultValue={1}
        />
      </div>
    </DirectionProvider>
  ),
};
