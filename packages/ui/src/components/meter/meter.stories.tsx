import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Meter, MeterLegend, MeterValue } from "./meter";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-80">
    <Story />
  </div>
);

const gigabytes = (value: number) => `${String(value)} GB`;

const meta = {
  title: "Feedback/Meter",
  component: Meter,
  args: {
    label: "Storage",
    max: 100,
    segments: [{ id: "used", label: "Used", value: 42 }],
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One quantity, split by what makes it up. The bar stays a single meter. */
export const Segmented: Story = {
  args: {
    label: "Storage",
    max: 100,
    format: gigabytes,
    segments: [
      { id: "docs", label: "Documents", value: 30, tone: "primary" },
      { id: "images", label: "Images", value: 22, tone: "info" },
      { id: "video", label: "Video", value: 14, tone: "success" },
    ],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
      <MeterLegend />
    </Meter>
  ),
};

/**
 * Widths are a share of capacity, not of the total — so a half-full meter
 * renders half full. Dividing by the total is the usual hand-rolled bug, and it
 * makes every meter look completely full.
 */
export const PlentyRemaining: Story = {
  args: {
    label: "API calls",
    max: 10000,
    segments: [
      { id: "read", label: "Reads", value: 900, tone: "primary" },
      { id: "write", label: "Writes", value: 300, tone: "info" },
    ],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
      <MeterLegend />
    </Meter>
  ),
};

/** Strain is presentation only. The reported value never changes. */
export const NearCapacity: Story = {
  args: {
    label: "Seats",
    max: 25,
    warnAt: 0.9,
    segments: [{ id: "used", label: "Assigned", value: 24, tone: "warning" }],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
    </Meter>
  ),
};

/** Over capacity is a real state, and the accessible text says so out loud. */
export const OverCapacity: Story = {
  args: {
    label: "Seats",
    max: 25,
    segments: [{ id: "used", label: "Assigned", value: 31, tone: "destructive" }],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
    </Meter>
  ),
};

/** A soft limit inside the capacity — the point where billing changes. */
export const WithThreshold: Story = {
  args: {
    label: "Bandwidth",
    max: 1000,
    format: gigabytes,
    threshold: { value: 800, label: "Included in plan" },
    segments: [{ id: "used", label: "Transferred", value: 610, tone: "primary" }],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
      <MeterLegend />
    </Meter>
  ),
};

/** Token spend by model — the shape an AI product needs on every workspace. */
export const TokenSpend: Story = {
  args: {
    label: "Monthly token budget",
    max: 5_000_000,
    format: (value: number) => `${(value / 1_000_000).toFixed(2)}M`,
    segments: [
      { id: "opus", label: "Opus", value: 1_900_000, tone: "primary" },
      { id: "sonnet", label: "Sonnet", value: 1_200_000, tone: "info" },
      { id: "haiku", label: "Haiku", value: 260_000, tone: "success" },
    ],
  },
  render: (args) => (
    <Meter {...args}>
      <MeterValue />
      <MeterLegend />
    </Meter>
  ),
};
