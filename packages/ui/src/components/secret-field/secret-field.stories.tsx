import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SecretField } from "./secret-field";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const KEY = "sk_live_EXAMPLE_not_a_real_key_0000";

const meta = {
  title: "Form/Secret Field",
  component: SecretField,
  decorators: [withWidth],
  args: {
    label: "Live secret key",
    value: KEY,
  },
} satisfies Meta<typeof SecretField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hidden, with the prefix and last four standing in. The secret is not in the DOM. */
export const Default: Story = {};

/**
 * The state that costs people money. The key is on screen for the only time
 * it ever will be, the field says so beside it, and the way out is a button
 * that says what it means. Press it and the value is gone.
 */
export const ShownOnce: Story = {
  parameters: { controls: { disable: true } },
  render: function ShownOnce() {
    const [value, setValue] = useState<string | undefined>(KEY);
    return (
      <SecretField
        label="Live secret key"
        value={value}
        preview="sk_live_…0000"
        once
        onAcknowledge={() => {
          setValue(undefined);
        }}
        onRegenerate={() => {
          setValue(`sk_live_${Math.random().toString(36).slice(2).padEnd(24, "x")}`);
        }}
      >
        <p className="text-xs text-muted-foreground">Created just now</p>
      </SecretField>
    );
  },
};

/** A secret the server can show again. Each reveal is reported, so it can be logged. */
export const Revealable: Story = {
  parameters: { controls: { disable: true } },
  render: function Revealable() {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <SecretField
          label="Webhook signing secret"
          value="whsec_9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b"
          onRevealChange={(revealed) => {
            setLog((current) => [
              ...current,
              `${new Date().toLocaleTimeString()} — ${revealed ? "revealed" : "hidden"}`,
            ]);
          }}
        >
          <p className="text-xs text-muted-foreground">Last used 2 minutes ago</p>
        </SecretField>
        {log.length > 0 ? (
          <ul className="m-0 list-none p-0 font-mono text-2xs text-muted-foreground">
            {log.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
};

/** Gone. Only the prefix and last four remain, and the one thing left to do asks first. */
export const Gone: Story = {
  args: {
    value: undefined,
    preview: "sk_live_…0000",
    onRegenerate: () => undefined,
    regenerateWarning:
      "Regenerating revokes this key immediately. Every server using it will fail until it is updated.",
  },
};
