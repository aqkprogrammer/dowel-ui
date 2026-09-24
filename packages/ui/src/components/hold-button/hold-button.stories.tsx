import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogOut, Trash2 } from "lucide-react";
import { useState } from "react";

import { HoldButton } from "./hold-button";

const meta = {
  title: "Form/Hold Button",
  component: HoldButton,
  args: {
    label: "Hold to confirm",
    confirmedLabel: "Confirmed",
    holdDuration: 1200,
    resetAfter: 1800,
    variant: "default",
    size: "md",
    disabled: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "destructive"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    holdDuration: { control: { type: "range", min: 300, max: 3000, step: 100 } },
    icon: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof HoldButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press and hold — pointer, Enter or Space. Let go early and the ink drains back. */
export const Default: Story = {};

/** The destructive ink, for an action worth a deliberate hold. */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    label: "Delete project",
    confirmedLabel: "Deleted",
    hint: "Press and hold to delete this project.",
    icon: <Trash2 />,
    holdDuration: 1600,
  },
};

/** Without resetAfter it stays confirmed, and the next step takes over. */
export const StaysConfirmed: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [signedOut, setSignedOut] = useState(false);
    return (
      <div className="grid justify-items-center gap-3">
        <HoldButton
          key={signedOut ? "done" : "ready"}
          label="Sign out everywhere"
          confirmedLabel="Signed out"
          icon={<LogOut />}
          hint="Press and hold to sign out of every device."
          onConfirm={() => {
            setSignedOut(true);
          }}
        />
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4"
          onClick={() => {
            setSignedOut(false);
          }}
        >
          {signedOut ? "Reset the demo" : "Nothing has happened yet"}
        </button>
      </div>
    );
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <HoldButton size="sm" label="Small" resetAfter={1200} />
      <HoldButton size="md" label="Medium" resetAfter={1200} />
      <HoldButton size="lg" label="Large" resetAfter={1200} />
    </div>
  ),
};

/** A quick hold, for actions that only need a moment's thought. */
export const Quick: Story = {
  args: { holdDuration: 500, label: "Archive", confirmedLabel: "Archived" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
