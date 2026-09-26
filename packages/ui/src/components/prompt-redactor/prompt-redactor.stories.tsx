import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/components/ai-prompt-input";

import { PromptRedactor, usePromptRedactor } from "./prompt-redactor";
import { DEFAULT_DETECTORS, type Detector } from "./redact";

/** Annotated rather than inferred: every story renders its own composer. */
const meta: Meta<typeof PromptRedactor> = {
  title: "AI/Prompt Redactor",
  component: PromptRedactor,
  parameters: { controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PromptRedactor>;

/** Assembled at runtime so no literal looks like a credential to a secret scanner. */
const FAKE_KEY = ["sk", "live", "51Hx9abcdefghijklmnop"].join("_");

const PASTED =
  "Customer dana.lee@acme.test says card 4242 4242 4242 4242 was charged twice. " +
  `Our Stripe key is ${FAKE_KEY} — can you check the refund went through? ` +
  "She's on +44 20 7946 0958.";

function Chat({ initial, detectors }: { initial: string; detectors?: Detector[] }) {
  const [value, setValue] = useState(initial);
  const [log, setLog] = useState<{ sent: string; reply: string }[]>([]);
  const redactor = usePromptRedactor(value, detectors ? { detectors } : undefined);

  return (
    <div className="flex flex-col gap-3">
      {log.map((turn, index) => (
        <div key={`${String(index)}-${turn.sent}`} className="flex flex-col gap-1.5 text-sm">
          <p className="rounded-md bg-muted/40 p-2">
            <span className="text-xs text-muted-foreground">What the model received: </span>
            {turn.sent}
          </p>
          <p className="rounded-md border border-border p-2">
            <span className="text-xs text-muted-foreground">Its reply, shown to you: </span>
            {turn.reply}
          </p>
        </div>
      ))}
      <PromptRedactor redactor={redactor} />
      <PromptInput
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          const sent = redactor.redact();
          // Stands in for the model: it only ever saw the placeholders.
          const echo = sent.match(/\[[A-Z]+_\d+\]/g) ?? [];
          const answer =
            echo.length > 0
              ? `I checked the refund for ${echo.join(", ")}. The duplicate charge was reversed.`
              : "Done.";
          setLog((current) => [...current, { sent, reply: redactor.restore(answer) }]);
          setValue("");
        }}
      >
        <PromptInputTextarea
          aria-label="Message"
          placeholder="Paste a support ticket…"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
        <PromptInputToolbar>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

/**
 * A pasted support ticket, with an email address, a card number, a live API
 * key and a phone number. Each is named and masked before sending; send, and
 * the model sees only placeholders — then the reply comes back with the real
 * values put back in, locally. Choose "Send as typed" for any you mean to send.
 */
export const Default: Story = {
  render: () => <Chat initial={PASTED} />,
};

const WITH_IDS: Detector[] = [
  ...DEFAULT_DETECTORS,
  { kind: "customer", label: "Customer id", pattern: /\bCUS-\d{6}\b/g },
  { kind: "invoice", label: "Invoice number", pattern: /\bINV-\d{4,}\b/g },
];

/** Your own identifiers, alongside the built-in ones — `detectors` replaces the list, so spread it. */
export const CustomDetectors: Story = {
  render: () => (
    <Chat
      initial="Ticket from dana@acme.test for customer CUS-481516 about invoice INV-2342."
      detectors={WITH_IDS}
    />
  ),
};

/** Nothing sensitive: the check stays out of the way. */
export const NothingFound: Story = {
  render: () => <Chat initial="How do I export last month's invoices?" />,
};
