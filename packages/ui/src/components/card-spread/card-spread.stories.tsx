import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardSpread, CardSpreadItem, type CardSpreadProps } from "./card-spread";
import { CARD_SPREAD_LAYOUTS, type CardSpreadLayout } from "./card-spread-layouts";

const PHOTOS = ["beach", "hills", "forest", "woods", "valley", "harbour", "desert"];

function photo(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/560`;
}

/** Neutral token-driven placeholders, as amicro's grey cards. */
function plainCards(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <CardSpreadItem key={i} className="grid place-items-center text-sm font-medium">
      {i + 1}
    </CardSpreadItem>
  ));
}

const meta: Meta<typeof CardSpread> = {
  title: "Display/Card Spread",
  component: CardSpread,
  args: {
    layout: "arc",
    trigger: "hover",
    stagger: 30,
    "aria-label": "Photo stack",
  },
  argTypes: {
    layout: { control: "select", options: CARD_SPREAD_LAYOUTS },
    trigger: { control: "select", options: ["hover", "click", "manual"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    edge: { control: "select", options: [undefined, "rounded", "stamp"] },
    arc: { control: { type: "range", min: 0, max: 45, step: 0.5 } },
    gap: { control: { type: "range", min: 0, max: 120, step: 1 } },
    offset: { control: { type: "range", min: 0, max: 20, step: 0.1 } },
    open: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div className="grid min-h-96 place-items-center p-16">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <CardSpread {...args}>
      {PHOTOS.slice(0, 5).map((seed) => (
        <CardSpreadItem key={seed}>
          <img src={photo(seed)} alt={seed} className="size-full object-cover" />
        </CardSpreadItem>
      ))}
    </CardSpread>
  ),
};

export default meta;
type Story = StoryObj<typeof CardSpread>;

/** Hover, focus, or click to pin. */
export const Default: Story = {};

type Item = {
  source: string;
  layout: CardSpreadLayout;
  count?: number;
} & Partial<CardSpreadProps>;

/*
 * Every amicro card spread, in source order. amicro's cards page also lists
 * three monochrome carousels (Interactive, CoverFlow, Time Machine): they are
 * the carousels with grey cards, not spreads, and belong to the carousel.
 */
const ITEMS: Item[] = [
  { source: "ARC (5 Cards)", layout: "arc" },
  { source: "ARC (7 Cards)", layout: "arc", count: 7 },
  { source: "Long ARC (5 Cards)", layout: "long-arc" },
  { source: "Linear Spread", layout: "linear" },
  { source: "Corner Fan", layout: "corner" },
  { source: "Stamp Arc (Adjustable)", layout: "stamp" },
  { source: "Cascade Stagger Fan", layout: "cascade" },
  { source: "Scatter Desk Deal", layout: "scatter" },
  { source: "Wheel Radial Fan", layout: "wheel" },
];

/** Each source item, pinned open with `defaultOpen` so the layouts can be compared. Click to close. */
export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-x-24 gap-y-40 py-16 sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.map(({ source, layout, count = 5, ...rest }) => (
        <figure key={source} className="flex flex-col items-center gap-16">
          <CardSpread layout={layout} size="sm" defaultOpen aria-label={source} {...rest}>
            {plainCards(count)}
          </CardSpread>
          <figcaption className="text-sm text-muted-foreground">{source}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** amicro's Stamp Arc, with its arc / gap / offset sliders as controls, and coloured stamps. */
export const StampArc: Story = {
  args: { layout: "stamp", arc: 12.5, gap: 70, offset: 7.1, defaultOpen: true },
  render: (args) => (
    <CardSpread {...args}>
      {["bg-destructive", "bg-info", "bg-success", "bg-warning", "bg-primary"].map((tone) => (
        <CardSpreadItem key={tone} className={tone} />
      ))}
    </CardSpread>
  ),
};

/** Cards that are links: the deck is reached through them and opens as focus enters. */
export const LinkCards: Story = {
  args: { layout: "linear", "aria-label": "Destinations" },
  render: (args) => (
    <CardSpread {...args}>
      {PHOTOS.slice(0, 5).map((seed) => (
        <CardSpreadItem key={seed} asChild>
          <a href={`#${seed}`} className="relative">
            <img src={photo(seed)} alt="" className="size-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-background/80 p-2 text-center text-xs font-medium text-foreground capitalize">
              {seed}
            </span>
          </a>
        </CardSpreadItem>
      ))}
    </CardSpread>
  ),
};

/** Mirrors toward the inline start in right-to-left text. */
export const RightToLeft: Story = {
  args: { layout: "corner", defaultOpen: true },
  render: (args) => (
    <div dir="rtl">
      <CardSpread {...args}>{plainCards(5)}</CardSpread>
    </div>
  ),
};
