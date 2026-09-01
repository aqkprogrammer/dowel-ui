import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ForgotPasswordBlock } from "./forgot-password";

const meta = {
  title: "Blocks/Forgot password",
  component: ForgotPasswordBlock,
  parameters: { layout: "centered", controls: { disable: true } },
} satisfies Meta<typeof ForgotPasswordBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Neutral about whether the address exists — otherwise this form enumerates accounts. */
export const Sent: Story = {
  args: { sent: true },
};

export const Interactive: Story = {
  render: function Interactive() {
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);

    return (
      <ForgotPasswordBlock
        pending={pending}
        sent={sent}
        onSubmit={() => {
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
            setSent(true);
          }, 900);
        }}
      />
    );
  },
};
