import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { ChangelogBlock } from "./changelog";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof ChangelogBlock> = {
  title: "Blocks/Changelog",
  component: ChangelogBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Without the filters or the feed link. */
export const Plain: Story = { args: { filterable: false, subscribe: null } };
