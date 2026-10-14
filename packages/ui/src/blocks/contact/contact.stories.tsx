import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { ContactBlock } from "./contact";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof ContactBlock> = {
  title: "Blocks/Contact",
  component: ContactBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
  args: {
    onSubmit: () => new Promise((resolve) => setTimeout(resolve, 900)),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Submit empty to see the checks; fill it in to see it send and confirm. */
export const Default: Story = {};

/** The send fails: the error shows above the form and nothing typed is lost. */
export const SendFails: Story = {
  args: {
    onSubmit: () =>
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("We couldn't reach the server. Please try again in a moment."));
        }, 700),
      ),
  },
};
