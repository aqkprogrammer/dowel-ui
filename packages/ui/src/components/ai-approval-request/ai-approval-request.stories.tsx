import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { ApprovalRequest, type ApprovalDecision } from "./ai-approval-request";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

const EMAIL_ARGS = {
  to: "dana@acme.test",
  subject: "Your refund is on its way",
  body: "Hi Dana,\n\nWe have refunded $240 to your original payment method. It should appear within three working days.",
};

const EMAIL_FIELDS = [
  { name: "to", label: "To" },
  { name: "subject", label: "Subject" },
  { name: "body", label: "Body", multiline: true },
];

const meta = {
  title: "AI/Approval Request",
  component: ApprovalRequest,
  decorators: [withWidth],
  args: {
    tool: "send_email",
    summary: "Email the customer about their refund",
    arguments: EMAIL_ARGS,
    fields: EMAIL_FIELDS,
    onDecision: () => undefined,
  },
} satisfies Meta<typeof ApprovalRequest>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The reason this exists. Change the recipient and the button changes to
 * "Approve with changes" — the corrected value is what comes back, and the
 * field says it was corrected. Every other implementation returns a boolean
 * over a payload you cannot touch, so a wrong address forces you to deny and
 * make the model try again.
 */
export const CorrectBeforeApproving: Story = {
  parameters: { controls: { disable: true } },
  render: function CorrectBeforeApproving() {
    const [decision, setDecision] = useState<ApprovalDecision | undefined>();

    return (
      <div className="flex flex-col gap-3">
        <ApprovalRequest
          tool="send_email"
          summary="Email the customer about their refund"
          arguments={EMAIL_ARGS}
          fields={EMAIL_FIELDS}
          decision={decision}
          onDecision={setDecision}
          irreversible="A sent email cannot be recalled."
        />
        {decision ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-2xs">
            {JSON.stringify(decision, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            Try changing the recipient, then approving.
          </p>
        )}
      </div>
    );
  },
};

/**
 * The arguments arriving. The request is on screen and readable as it forms,
 * with the decision held until it is whole — rather than nothing at all until
 * the last token lands, which is what the common implementation does.
 */
export const StillArriving: Story = {
  parameters: { controls: { disable: true } },
  render: function StillArriving() {
    const [args, setArgs] = useState<Record<string, string>>({});
    const [streaming, setStreaming] = useState(true);

    useEffect(() => {
      const keys = Object.keys(EMAIL_ARGS);
      let index = 0;
      const timer = setInterval(() => {
        if (index >= keys.length) {
          setStreaming(false);
          setArgs({});
          setStreaming(true);
          index = 0;
          return;
        }
        const key = keys[index];
        if (key) {
          setArgs((current) => ({
            ...current,
            [key]: EMAIL_ARGS[key as keyof typeof EMAIL_ARGS],
          }));
        }
        index += 1;
      }, 1100);
      return () => {
        clearInterval(timer);
      };
    }, []);

    return (
      <ApprovalRequest
        tool="send_email"
        summary="Email the customer about their refund"
        arguments={args}
        fields={EMAIL_FIELDS}
        streaming={streaming}
        onDecision={() => undefined}
      />
    );
  },
};

/** A call that cannot be taken back says so in a sentence, not a colour. */
export const Irreversible: Story = {
  args: {
    tool: "issue_refund",
    summary: "Refund $240 to the original payment method",
    arguments: { customer: "cus_9f3a2b", amount: "240.00", currency: "USD" },
    fields: [
      { name: "customer", label: "Customer", readOnly: true },
      { name: "amount", label: "Amount" },
      { name: "currency", label: "Currency", readOnly: true },
    ],
    irreversible:
      "A refund cannot be reversed. Issuing it again would charge the customer twice.",
  },
};

/** Denial asks why, because the reason goes back to the model. */
export const Denying: Story = {
  parameters: { controls: { disable: true } },
  render: function Denying() {
    const [decision, setDecision] = useState<ApprovalDecision | undefined>();
    return (
      <div className="flex flex-col gap-3">
        <ApprovalRequest
          tool="delete_records"
          summary="Delete 3 duplicate contacts"
          arguments={{ ids: "c_18, c_44, c_91", scope: "contacts" }}
          fields={[
            { name: "ids", label: "Record ids" },
            { name: "scope", label: "Table", readOnly: true },
          ]}
          decision={decision}
          onDecision={setDecision}
        />
        <p className="text-xs text-muted-foreground">Press Deny to see the reason prompt.</p>
      </div>
    );
  },
};

/** Already decided. The outcome is the record, including any corrections. */
export const Decided: Story = {
  args: {
    decision: {
      approved: true,
      scope: "once",
      arguments: { ...EMAIL_ARGS, to: "finance@acme.test" },
      edited: ["to"],
    },
  },
};
