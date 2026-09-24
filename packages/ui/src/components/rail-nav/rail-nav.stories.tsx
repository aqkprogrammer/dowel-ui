import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DirectionProvider } from "../direction";
import { RailNav, type RailNavItem } from "./rail-nav";

const DOCS: RailNavItem[] = [
  { label: "Getting started", heading: true },
  "Introduction",
  "Installation",
  "Theming",
  { label: "Components", heading: true },
  "Button",
  "Card",
  "Dialog",
  { label: "Data table", disabled: true },
];

const PAGE: RailNavItem[] = [
  { label: "Overview", href: "#overview" },
  { label: "Anatomy", href: "#anatomy" },
  { label: "Usage", href: "#usage" },
  { label: "Accessibility", href: "#accessibility" },
  { label: "API reference", href: "#api" },
];

const meta = {
  title: "Navigation/Rail Nav",
  component: RailNav,
  args: { items: DOCS, label: "Documentation", indicator: "bounce", dashed: true },
  argTypes: {
    indicator: { control: "inline-radio", options: ["bounce", "hook"] },
    color: { control: "color" },
    items: { control: false },
  },
  parameters: { layout: "centered" },
  render: (args) => (
    <div className="w-56">
      <RailNav {...args} />
    </div>
  ),
} satisfies Meta<typeof RailNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a row: the dot springs over, stretching as it travels and wobbling round as it lands. */
export const Default: Story = {};

/**
 * The dashed rail runs down from the top of the list and hooks into the active
 * row. Hover or Tab to another row to see the dimmer rail it would take.
 */
export const Hook: Story = {
  args: { indicator: "hook", items: PAGE, label: "On this page" },
};

/** `dashed={false}` draws the rail as one solid line. */
export const SolidRail: Story = {
  args: { indicator: "hook", dashed: false, items: DOCS },
};

/** Both indicators side by side, with the same rows. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-md grid-cols-2 gap-12">
      <RailNav items={DOCS} label="Bounce" defaultValue={2} />
      <RailNav items={DOCS} label="Hook" indicator="hook" defaultValue={2} />
    </div>
  ),
};

/** Any CSS colour for the marker; the rest of the list keeps the theme. */
export const CustomColour: Story = {
  args: { color: "var(--color-destructive)", indicator: "hook", items: PAGE },
};

/** Driving the selection from outside — a router, say. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState(2);
    return (
      <div className="grid gap-4">
        <RailNav items={PAGE} aria-label="Sections" value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground">Active index: {value}</p>
      </div>
    );
  },
};

/** Right-to-left: the rail and marker move to the start edge, and the hook turns the other way. */
export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <DirectionProvider dir="rtl">
      <div dir="rtl" lang="ar" className="grid w-md grid-cols-2 gap-12">
        <RailNav items={["مقدمة", "التثبيت", "السمات", "المكونات"]} label="الوثائق" />
        <RailNav
          items={["مقدمة", "التثبيت", "السمات", "المكونات"]}
          label="الوثائق"
          indicator="hook"
          defaultValue={2}
        />
      </div>
    </DirectionProvider>
  ),
};
