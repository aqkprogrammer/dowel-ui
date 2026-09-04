import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ShortcutRecorder } from "./shortcut-recorder";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const meta = {
  title: "Form/Shortcut Recorder",
  component: ShortcutRecorder,
  decorators: [withWidth],
  args: {
    label: "Open search",
    defaultValue: "Mod+K",
  },
} satisfies Meta<typeof ShortcutRecorder>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Press the button, then the keys. Option-K records as Option K, a bare K
 * is refused with the reason, Escape cancels and Tab leaves. The platform
 * is detected; the stored value is `Mod+…` either way.
 */
export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: null },
};

export const OffAMac: Story = {
  args: { platform: "other", defaultValue: "Mod+Shift+K" },
};

/**
 * A settings page. Record ⌘K on "Go to project" and it says Search already
 * has it, with the choice to take it anyway — which then clears Search's.
 */
export const WithConflicts: Story = {
  parameters: { controls: { disable: true } },
  render: function WithConflicts() {
    const [bindings, setBindings] = useState<Record<string, string | null>>({
      search: "Mod+K",
      project: "Mod+P",
      compose: "Mod+Shift+N",
    });
    const commands = [
      { id: "search", label: "Search" },
      { id: "project", label: "Go to project" },
      { id: "compose", label: "New message" },
    ];

    return (
      <div className="flex flex-col gap-4">
        {commands.map((command) => (
          <ShortcutRecorder
            key={command.id}
            label={command.label}
            value={bindings[command.id] ?? null}
            taken={commands
              .filter((other) => other.id !== command.id && bindings[other.id])
              .map((other) => ({ shortcut: bindings[other.id] as string, label: other.label }))}
            onChange={(next) => {
              setBindings((current) => {
                const updated = { ...current, [command.id]: next };
                // Taking a chord takes it away from whoever had it.
                for (const other of commands) {
                  if (other.id !== command.id && next && updated[other.id] === next) {
                    updated[other.id] = null;
                  }
                }
                return updated;
              });
            }}
          />
        ))}
      </div>
    );
  },
};
