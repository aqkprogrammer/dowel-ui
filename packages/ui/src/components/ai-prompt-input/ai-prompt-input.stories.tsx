import type { Meta, StoryObj } from "@storybook/react-vite";
import { Paperclip } from "lucide-react";
import { useState } from "react";

import { ModelSelector } from "@/components/ai-model-selector";
import { Button } from "@/components/button";

import {
  PromptInput,
  PromptInputCounter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "./ai-prompt-input";

const meta: Meta<typeof PromptInput> = {
  title: "AI/Prompt Input",
  component: PromptInput,
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="w-[34rem]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PromptInput>;

/** Enter sends, Shift+Enter adds a line — and neither fires mid-IME-composition. */
export const Default: Story = {
  render: function Default() {
    const [sent, setSent] = useState<string[]>([]);
    const [value, setValue] = useState("");

    return (
      <div className="grid gap-3">
        <PromptInput
          onSubmit={(event) => {
            event.preventDefault();
            if (!value.trim()) return;
            setSent((current) => [...current, value.trim()]);
            setValue("");
          }}
        >
          <PromptInputTextarea
            aria-label="Message"
            placeholder="Ask anything…"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
          <PromptInputToolbar>
            <Button variant="ghost" size="icon-sm" aria-label="Attach a file">
              <Paperclip />
            </Button>
            <PromptInputSubmit />
          </PromptInputToolbar>
        </PromptInput>
        {sent.length > 0 ? (
          <ul className="text-xs text-muted-foreground">
            {sent.map((message, index) => (
              <li key={index}>Sent: {message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
};

/** While a response streams, the one control becomes Stop — name included. */
export const Busy: Story = {
  render: function Busy() {
    const [busy, setBusy] = useState(true);

    return (
      <PromptInput
        busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <PromptInputTextarea aria-label="Message" placeholder="Generating…" />
        <PromptInputToolbar>
          <PromptInputSubmit
            onStop={() => {
              setBusy(false);
            }}
          />
        </PromptInputToolbar>
      </PromptInput>
    );
  },
};

export const WithModelAndCounter: Story = {
  render: function WithModelAndCounter() {
    const [value, setValue] = useState("");

    return (
      <PromptInput
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <PromptInputTextarea
          aria-label="Message"
          placeholder="Ask anything…"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
        <PromptInputToolbar>
          <ModelSelector
            aria-label="Model"
            defaultValue="balanced"
            triggerSize="sm"
            models={[
              { id: "fast", name: "Fast", description: "Quick answers." },
              { id: "balanced", name: "Balanced", description: "The default." },
            ]}
          />
          <PromptInputCounter value={value.length} max={280} />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <PromptInput disabled>
      <PromptInputTextarea aria-label="Message" placeholder="Sign in to send a message" />
      <PromptInputToolbar>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
};

/**
 * Send and Stop cross-fade (scale 0.6 → 1) instead of swapping, and the button
 * gives a little on press. Motion from SmoothUI AI Prompt Input.
 */
export const SendStopMorph: Story = {
  render: function SendStopMorph() {
    const [busy, setBusy] = useState(false);

    return (
      <PromptInput
        busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
        }}
      >
        <PromptInputTextarea aria-label="Message" placeholder="Send, then stop…" />
        <PromptInputToolbar>
          <PromptInputSubmit
            onStop={() => {
              setBusy(false);
            }}
          />
        </PromptInputToolbar>
      </PromptInput>
    );
  },
};

/** Near the limit, "value / max" rises in once; the live region never remounts. */
export const CounterReveal: Story = {
  render: function CounterReveal() {
    const [value, setValue] = useState("A message that is getting close to its limit");

    return (
      <PromptInput
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <PromptInputTextarea
          aria-label="Message"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
        <PromptInputToolbar>
          <PromptInputCounter value={value.length} max={50} warnAt={0.9} />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    );
  },
};
