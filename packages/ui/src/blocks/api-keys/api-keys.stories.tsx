import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { ApiKeysBlock } from "./api-keys";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof ApiKeysBlock> = {
  title: "Blocks/API keys",
  component: ApiKeysBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Create a key to see it shown once; revoke one to see the confirmation. */
export const Default: Story = {};

export const Empty: Story = { args: { keys: [] } };
