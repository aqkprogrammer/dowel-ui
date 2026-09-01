import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { LoginBlock } from "./login";

const meta = {
  title: "Blocks/Login",
  component: LoginBlock,
  parameters: { layout: "centered", controls: { disable: true } },
} satisfies Meta<typeof LoginBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithServerError: Story = {
  args: { error: "Those credentials did not match our records." },
};

export const Submitting: Story = {
  args: { pending: true },
};

/** The whole round trip: submit, wait, fail. */
export const Interactive: Story = {
  render: function Interactive() {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    return (
      <LoginBlock
        pending={pending}
        error={error}
        onSubmit={() => {
          setError(undefined);
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
            setError("Those credentials did not match our records.");
          }, 1200);
        }}
      />
    );
  },
};
