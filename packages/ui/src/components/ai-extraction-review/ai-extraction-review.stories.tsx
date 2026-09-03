import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { ExtractionReview } from "./ai-extraction-review";
import { summarizeReview, type ExtractionField, type FieldDecision } from "./extraction-model";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-4xl">
    <Story />
  </div>
);

const INVOICE = `NORTHWIND TRADERS
14 Harbour Street, Portsmouth PO1 3AX

INVOICE 4471
Issued 1 March 2026
Due 31 March 2026

Bill to: Acme Ltd, 8 Lower Ground, Leeds LS1 4AP

Description                          Qty      Amount
Structural dowels, oak, 8 mm       1,200     £840.00
Delivery                                1     £400.00

Subtotal                                    £1,240.00
VAT (20%)                                     £248.00
Total due                                   £1,488.00

Pay within 30 days by bank transfer.
Sort code 40-12-76, account 91827364.`;

const at = (text: string) => {
  const start = INVOICE.indexOf(text);
  return { start, end: start + text.length };
};

const FIELDS: ExtractionField[] = [
  {
    name: "vendor",
    label: "Vendor",
    value: "Northwind Traders",
    span: at("NORTHWIND TRADERS"),
  },
  { name: "number", label: "Invoice number", value: "4471", span: at("4471") },
  { name: "issued", label: "Issued", value: "2026-03-01", span: at("1 March 2026") },
  { name: "due", label: "Due", value: "2026-03-31", span: at("31 March 2026") },
  {
    name: "billTo",
    label: "Bill to",
    value: "Acme Ltd\n8 Lower Ground\nLeeds LS1 4AP",
    span: at("Acme Ltd, 8 Lower Ground, Leeds LS1 4AP"),
    multiline: true,
  },
  {
    name: "subtotal",
    label: "Subtotal",
    value: "1240.00",
    span: at("£1,240.00"),
    confidence: 0.97,
  },
  { name: "total", label: "Total", value: "1488.00", span: at("£1,488.00"), confidence: 0.99 },
  // Plausible, and nowhere in the document. The reason to review.
  { name: "currency", label: "Currency", value: "GBP" },
  { name: "po", label: "Purchase order", value: "PO-2026-0117", confidence: 0.31 },
];

const meta = {
  title: "AI/Extraction Review",
  component: ExtractionReview,
  decorators: [withWidth],
  args: {
    source: INVOICE,
    sourceLabel: "invoice-4471.pdf, page 1",
    heading: "Invoice 4471 from Northwind Traders",
    fields: FIELDS,
    onDecision: () => undefined,
  },
} satisfies Meta<typeof ExtractionReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The reason this exists. Tab into a field and its evidence lights up in the
 * document; two fields have none, and say so instead of looking like the
 * others. Correct the purchase order, accept it, and the decision that comes
 * back keeps the model's value beside yours.
 */
export const Reviewing: Story = {
  parameters: { controls: { disable: true } },
  render: function Reviewing() {
    const [decisions, setDecisions] = useState<Record<string, FieldDecision>>({});
    const summary = summarizeReview(INVOICE, FIELDS, decisions);

    return (
      <div className="flex flex-col gap-3">
        <ExtractionReview
          source={INVOICE}
          sourceLabel="invoice-4471.pdf, page 1"
          heading="Invoice 4471 from Northwind Traders"
          fields={FIELDS}
          decisions={decisions}
          onDecision={(name, decision) => {
            setDecisions((current) => ({ ...current, [name]: decision }));
          }}
        />
        {summary.complete ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-2xs">
            {JSON.stringify(decisions, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            Decide every field to see the record the application receives.
          </p>
        )}
      </div>
    );
  },
};

/**
 * Fields arriving from the model. A value that has not arrived waits rather
 * than reading as "found nothing", and fields already on screen can be
 * reviewed while the rest catch up.
 */
export const StillArriving: Story = {
  parameters: { controls: { disable: true } },
  render: function StillArriving() {
    const [count, setCount] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setCount((current) => (current >= FIELDS.length ? 0 : current + 1));
      }, 900);
      return () => {
        clearInterval(timer);
      };
    }, []);

    const fields = FIELDS.map((field, index) =>
      index < count ? field : { name: field.name, label: field.label },
    );

    return (
      <ExtractionReview
        source={INVOICE}
        heading="Invoice 4471 from Northwind Traders"
        fields={fields}
        streaming={count < FIELDS.length}
        onDecision={() => undefined}
      />
    );
  },
};

/** The model found nothing for a field the schema asked for. The reviewer can supply it. */
export const NothingFound: Story = {
  args: {
    fields: [
      FIELDS[1] as ExtractionField,
      { name: "vat", label: "VAT registration number" },
      { name: "iban", label: "IBAN" },
    ],
  },
};

/** Already decided, rendered as the record rather than as something to operate. */
export const AsRecord: Story = {
  args: {
    onDecision: undefined,
    decisions: {
      vendor: { kind: "accepted", value: "Northwind Traders" },
      number: { kind: "accepted", value: "4471" },
      issued: { kind: "accepted", value: "2026-03-01" },
      due: { kind: "accepted", value: "2026-03-31" },
      billTo: { kind: "accepted", value: "Acme Ltd\n8 Lower Ground\nLeeds LS1 4AP" },
      subtotal: { kind: "accepted", value: "1240.00" },
      total: { kind: "accepted", value: "1488.00" },
      currency: { kind: "accepted", value: "GBP" },
      po: { kind: "corrected", value: "PO-2026-0171", proposed: "PO-2026-0117" },
    },
  },
};
