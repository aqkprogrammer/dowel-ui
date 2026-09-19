import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { TokenCount, TokenUsage } from "./ai-token-usage";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-72">
    <Story />
  </div>
);

const meta = {
  title: "AI/Token Usage",
  component: TokenUsage,
  args: { used: 42000, limit: 200000 },
  argTypes: {
    used: { control: { type: "range", min: 0, max: 240000, step: 1000 } },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof TokenUsage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Running out of context is a cliff, not a slope — so the gauge warns early. */
export const Thresholds: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-5">
      <TokenUsage used={42000} limit={200000} />
      <TokenUsage used={175000} limit={200000} />
      <TokenUsage used={212000} limit={200000} />
    </div>
  ),
};

export const CustomFormat: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TokenUsage
      used={128000}
      limit={200000}
      label="Context"
      format={(value) => `${String(Math.round(value / 1000))}k`}
    />
  ),
};

export const InlineCount: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <TokenCount value={1284} />
      <TokenCount value={412} label="output tokens" />
    </div>
  ),
};

const BREAKDOWN = [
  { label: "System prompt", tokens: 2400 },
  { label: "Conversation", tokens: 61000 },
  { label: "Attached files", tokens: 56600 },
];

/**
 * `variant="ring"`: a compact gauge for toolbars. It changes hue as it fills,
 * never size; the visible figures are compact and a hidden sentence carries
 * the full ones. From SmoothUI AI Context Meter.
 */
export const Ring: Story = {
  args: { variant: "ring", used: 120000 },
};

/**
 * With a breakdown the gauge is a button: click, Enter or Space opens it, a
 * mouse hover previews it without taking focus, and a click pins a preview.
 */
export const RingWithBreakdown: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="pt-24">
      <TokenUsage variant="ring" used={120000} limit={200000} breakdown={BREAKDOWN} />
    </div>
  ),
};

/** `notation="compact"`: locale-aware "48K" in the bar variant too, with a breakdown. */
export const Compact: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      <TokenUsage used={120000} limit={200000} notation="compact" breakdown={BREAKDOWN} />
      <TokenCount value={1800} notation="compact" />
    </div>
  ),
};

/** `dangerAt` adds a second threshold: critical before the limit, not only past it. */
export const DangerThreshold: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-5">
      <TokenUsage used={175000} limit={200000} dangerAt={0.95} />
      <TokenUsage used={194000} limit={200000} dangerAt={0.95} />
      <div className="flex gap-4">
        {[40000, 175000, 194000, 212000].map((used) => (
          <TokenUsage key={used} variant="ring" used={used} limit={200000} dangerAt={0.95} />
        ))}
      </div>
    </div>
  ),
};
