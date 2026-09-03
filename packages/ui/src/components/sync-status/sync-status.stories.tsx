import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { SyncStatus } from "./sync-status";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const meta = {
  title: "Feedback/Sync Status",
  component: SyncStatus,
  decorators: [withWidth],
  args: {
    online: true,
    lastSyncedAt: new Date("2026-09-04T14:42:00Z"),
  },
} satisfies Meta<typeof SyncStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};

export const Saving: Story = {
  args: { syncing: true, pending: 2 },
};

/** The one that matters. The changes are named, and where they will go is said. */
export const Offline: Story = {
  args: { online: false, pending: 3 },
};

/** A failed request outranks a browser that says it is online. */
export const Failed: Story = {
  args: { pending: 3, error: "The server is not responding.", onRetry: () => undefined },
};

/**
 * A session. Saves come and go without a word from the announcer; going
 * offline, coming back and failing are each said once.
 */
export const Session: Story = {
  parameters: { controls: { disable: true } },
  render: function Session() {
    const [step, setStep] = useState(0);
    useEffect(() => {
      const timer = setInterval(() => {
        setStep((current) => (current + 1) % 8);
      }, 1600);
      return () => {
        clearInterval(timer);
      };
    }, []);

    const frames = [
      { online: true },
      { online: true, pending: 1 },
      { online: true, pending: 1, syncing: true },
      { online: true },
      { online: false, pending: 2 },
      { online: false, pending: 4 },
      { online: true, pending: 4, syncing: true },
      { online: true, pending: 1, error: "The server is not responding." },
    ];

    return (
      <div className="flex flex-col gap-3">
        <SyncStatus
          {...frames[step]}
          lastSyncedAt={new Date("2026-09-04T14:42:00Z")}
          onRetry={() => {
            setStep(6);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Turn on a screen reader: only frames five, seven and eight are announced.
        </p>
      </div>
    );
  },
};

/** Reading the browser itself. Toggle your connection to see it move. */
export const FromTheBrowser: Story = {
  parameters: { controls: { disable: true } },
  render: () => <SyncStatus pending={2} />,
};
