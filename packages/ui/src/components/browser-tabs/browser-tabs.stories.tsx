import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bookmark, Globe, Newspaper } from "lucide-react";
import { useState } from "react";

import { BrowserTabs, type BrowserTab } from "./browser-tabs";

/** bencho's two tabs, with a neutral globe in place of its site logo. */
const TABS: BrowserTab[] = [
  { value: "home", label: "Home", icon: <Globe />, url: "example.com" },
  { value: "finds", label: "Finds", icon: <Bookmark />, url: "example.com/finds" },
];

const THREE: BrowserTab[] = [
  ...TABS,
  { value: "news", label: "News", icon: <Newspaper />, url: "example.com/news" },
];

const meta: Meta<typeof BrowserTabs> = {
  title: "Navigation/Browser Tabs",
  component: BrowserTabs,
  args: {
    tabs: TABS,
    bounce: 15,
    corner: 20,
    tabWidth: 100,
    stroke: false,
    tone: "default",
  },
  argTypes: {
    bounce: { control: { type: "range", min: 0, max: 30, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 28, step: 1 } },
    tabWidth: { control: { type: "range", min: 78, max: 140, step: 2 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-72 items-center justify-center bg-background p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrowserTabs>;

/**
 * Press a tab to select it; drag it sideways past its neighbour to reorder. From the keyboard:
 * Left/Right select, Alt+Left/Right or Ctrl+Shift+PageUp/PageDown move the focused tab.
 */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - bencho "Browser tabs" (parked) → the two-tab window (select, drag to reorder,
 *   leaf ears collapsing at slot 0), its Bounce / Corner / Width sliders at their
 *   extremes, the Fill switch (`tone`), and a Stroke hairline.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        <BrowserTabs tabs={TABS} />
        <BrowserTabs tabs={TABS} defaultValue="finds" tone="inverted" />
        <BrowserTabs tabs={TABS} corner={0} tabWidth={78} bounce={0} />
        <BrowserTabs tabs={TABS} corner={28} tabWidth={140} bounce={30} stroke />
      </div>
      <figcaption className="text-xs text-muted-foreground">bencho Browser tabs</figcaption>
    </figure>
  ),
};

/** Value and order held by the parent, with page content per tab and working nav buttons. */
export const Controlled: Story = {
  render: function Render(args) {
    const [value, setValue] = useState("home");
    const [order, setOrder] = useState(THREE.map((tab) => tab.value));
    const [reloads, setReloads] = useState(0);
    return (
      <div className="flex flex-col items-center gap-3">
        <BrowserTabs
          {...args}
          tabs={THREE}
          value={value}
          onValueChange={setValue}
          order={order}
          onOrderChange={setOrder}
          onReload={() => {
            setReloads((count) => count + 1);
          }}
          renderPanel={(tab) => (
            <p className="p-4 text-sm text-muted-foreground">
              {tab.label} page · reloaded {reloads}×
            </p>
          )}
        />
        <p className="text-xs text-muted-foreground">Order: {order.join(" → ")}</p>
      </div>
    );
  },
};

/** Right-to-left: the strip starts at the right, and Left/Right and dragging follow it. */
export const RightToLeft: Story = {
  args: { tabs: THREE, dir: "rtl" },
};
