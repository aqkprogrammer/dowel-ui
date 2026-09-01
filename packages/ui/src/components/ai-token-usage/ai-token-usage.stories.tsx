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
