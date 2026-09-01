import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Response } from "@/components/ai-response";

import { Reasoning, ReasoningContent, ReasoningTrigger } from "./ai-reasoning";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-[32rem]">
    <Story />
  </div>
);

const meta = {
  title: "AI/Reasoning",
  component: Reasoning,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Reasoning>;

export default meta;
type Story = StoryObj<typeof meta>;

const WORKING =
  'The question is about keyboard access to overflowing tables.\n\nA scroll container is not focusable by default, so its content past the edge cannot be reached without a pointer. Adding tabindex="0" makes it a focus stop, and a role plus a name stops it being an unlabelled one.';

/** Collapsed by default: reasoning is supporting material, not the answer. */
export const Default: Story = {
  render: () => (
    <div className="grid gap-2">
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>{WORKING}</ReasoningContent>
      </Reasoning>
      <Response>
        Give the scrolling wrapper `tabindex=&quot;0&quot;`, a role and an accessible name.
      </Response>
    </div>
  ),
};

export const Streaming: Story = {
  render: () => (
    <Reasoning defaultOpen>
      <ReasoningTrigger streaming />
      <ReasoningContent>
        The question is about keyboard access to overflowing tables. A scroll container
      </ReasoningContent>
    </Reasoning>
  ),
};

export const Expanded: Story = {
  render: () => (
    <Reasoning defaultOpen>
      <ReasoningTrigger />
      <ReasoningContent>{WORKING}</ReasoningContent>
    </Reasoning>
  ),
};
