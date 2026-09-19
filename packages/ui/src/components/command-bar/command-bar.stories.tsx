import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paperclip } from "lucide-react";
import { useState } from "react";

import { CommandBar } from "./command-bar";

const meta: Meta<typeof CommandBar> = {
  title: "AI/Command Bar",
  component: CommandBar,
  args: { placeholder: "Ask anything…", label: "Message", shape: "pill" },
  argTypes: { leading: { control: false } },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof CommandBar>;

function Live() {
  const [log, setLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [dictating, setDictating] = useState(false);
  return (
    <div className="grid gap-3">
      <CommandBar
        sending={sending}
        dictating={dictating}
        onDictatingChange={setDictating}
        onSend={(text) => {
          setLog((current) => [...current, text]);
          setSending(true);
          setTimeout(() => {
            setSending(false);
          }, 1500);
        }}
        onStop={() => {
          setSending(false);
        }}
      />
      <ul className="text-xs text-muted-foreground">
        {log.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

/** Enter sends, Shift+Enter adds a line; the button becomes Stop while sending. */
export const Default: Story = { render: () => <Live /> };

/** Original design for bencho's (paid) Command bar pattern: send, dictate, sending and disabled states. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      <figure className="grid gap-2">
        <Live />
        <figcaption className="text-xs text-muted-foreground">
          Command bar (send + dictate)
        </figcaption>
      </figure>
      <figure className="grid gap-2">
        <CommandBar
          defaultValue="Summarise this thread"
          sending
          onDictatingChange={() => {}}
          leading={
            <button
              type="button"
              aria-label="Attach"
              className="grid size-9 place-items-center rounded-full text-muted-foreground"
            >
              <Paperclip className="size-4" />
            </button>
          }
        />
        <figcaption className="text-xs text-muted-foreground">
          Sending, with a leading slot
        </figcaption>
      </figure>
      <figure className="grid gap-2">
        <CommandBar disabled shape="rounded" placeholder="Read-only" />
        <figcaption className="text-xs text-muted-foreground">Disabled · rounded</figcaption>
      </figure>
    </div>
  ),
};
