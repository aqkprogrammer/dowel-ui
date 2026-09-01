import type { Meta, StoryObj } from "@storybook/react-vite";

import { SignupBlock } from "./signup";

const meta = {
  title: "Blocks/Sign up",
  component: SignupBlock,
  parameters: { layout: "centered", controls: { disable: true } },
} satisfies Meta<typeof SignupBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type a password to see the strength hint — it advises, it does not gate. */
export const Default: Story = {};

export const ShorterMinimum: Story = {
  args: { minPasswordLength: 8 },
};

export const WithServerError: Story = {
  args: { error: "An account already exists for that address." },
};

export const Submitting: Story = {
  args: { pending: true },
};
