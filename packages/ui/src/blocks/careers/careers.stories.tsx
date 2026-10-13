import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { CareersBlock } from "./careers";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof CareersBlock> = {
  title: "Blocks/Careers",
  component: CareersBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No open roles at all: the empty state, with the general application. */
export const NoRoles: Story = { args: { roles: [] } };
