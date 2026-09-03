import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { SessionExpiry } from "./session-expiry";

const meta: Meta<typeof SessionExpiry> = {
  title: "Feedback/Session Expiry",
  component: SessionExpiry,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A live one. The session ends 100 seconds from when the story loads, so
 * the warning is already up; "Stay signed in" pushes it out by a minute
 * and the dialog goes away until the window comes round again. Escape does
 * nothing, on purpose.
 */
export const Live: Story = {
  render: function Live() {
    const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 100_000));
    const [log, setLog] = useState<string[]>([]);

    return (
      <div className="flex min-h-64 flex-col gap-3 p-6">
        <p className="text-sm text-muted-foreground">
          The page underneath. The warning opens on its own two minutes before the end.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            setExpiresAt(new Date(Date.now() + 100_000));
          }}
        >
          Reset the session to 100 seconds
        </Button>
        <ul className="m-0 list-none p-0 font-mono text-2xs text-muted-foreground">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <SessionExpiry
          expiresAt={expiresAt}
          onExtend={() =>
            new Promise<void>((resolve) => {
              setTimeout(() => {
                setExpiresAt(new Date(Date.now() + 180_000));
                setLog((current) => [
                  ...current,
                  `${new Date().toLocaleTimeString()} extended`,
                ]);
                resolve();
              }, 800);
            })
          }
          onSignOut={() => {
            setLog((current) => [...current, `${new Date().toLocaleTimeString()} signed out`]);
            setExpiresAt(new Date(0));
          }}
          onExpire={() => {
            setLog((current) => [...current, `${new Date().toLocaleTimeString()} expired`]);
          }}
          expiredAction={
            <Button
              onClick={() => {
                setExpiresAt(new Date(Date.now() + 100_000));
              }}
            >
              Sign in again
            </Button>
          }
        >
          <p>Unsaved edits to the proposal will be lost.</p>
        </SessionExpiry>
      </div>
    );
  },
};

/** Frozen at ninety seconds, for the docs. */
export const Warning: Story = {
  args: {
    expiresAt: new Date("2026-09-04T12:00:00Z"),
    now: new Date("2026-09-04T11:58:30Z"),
    onExtend: () => undefined,
    onSignOut: () => undefined,
    children: <p>Unsaved edits to the proposal will be lost.</p>,
  },
};

/** After the end. Nothing is signed out here; this is the part that says it happened. */
export const Expired: Story = {
  args: {
    expiresAt: new Date("2026-09-04T12:00:00Z"),
    now: new Date("2026-09-04T12:00:01Z"),
    onExtend: () => undefined,
    expiredAction: <Button>Sign in again</Button>,
  },
};
