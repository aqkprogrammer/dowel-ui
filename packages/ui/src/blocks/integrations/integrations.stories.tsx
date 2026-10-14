import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { IntegrationsBlock } from "./integrations";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof IntegrationsBlock> = {
  title: "Blocks/Integrations",
  component: IntegrationsBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Connecting fails after a moment, and the switch goes back. */
export const ConnectFails: Story = {
  args: {
    onConnectedChange: () =>
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("refused"));
        }, 600),
      ),
  },
};
