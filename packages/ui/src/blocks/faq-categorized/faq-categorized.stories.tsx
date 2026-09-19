import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { FaqCategorizedBlock } from "./faq-categorized";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FaqCategorizedBlock> = {
  title: "Blocks/FAQ categorized",
  component: FaqCategorizedBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FaqCategorizedBlock>;

/** SmoothUI "FAQ 4": topic tabs with a sliding underline, each topic an accordion. */
export const Default: Story = {};

/** Every source item: SmoothUI "FAQ 4" (Faq Categorized), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FaqCategorizedBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI FAQ 4 — Faq Categorized
      </figcaption>
    </figure>
  ),
};

/** Opens on a topic other than the first. */
export const StartOnBilling: Story = {
  args: { defaultValue: "Billing" },
};
