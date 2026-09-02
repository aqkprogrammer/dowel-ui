import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import {
  StructuredConfidence,
  StructuredField,
  StructuredOutput,
  type OutputField,
} from "./ai-structured-output";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const INVOICE_FIELDS: OutputField[] = [
  { name: "vendor", label: "Vendor" },
  { name: "invoiceNumber", label: "Invoice number" },
  { name: "total", label: "Total" },
  { name: "dueDate", label: "Due date" },
  { name: "lineItems", label: "Line items", lines: 2 },
];

const COMPLETE = {
  vendor: "Northwind Supplies Ltd",
  invoiceNumber: "INV-2026-0841",
  total: "$12,480.00",
  dueDate: "30 September 2026",
  lineItems: ["Rack units ×4", "Installation", "Support, 12 months"],
};

const meta = {
  title: "AI/Structured Output",
  component: StructuredOutput,
  decorators: [withWidth],
  args: { fields: INVOICE_FIELDS, value: COMPLETE },
} satisfies Meta<typeof StructuredOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Before anything arrives, the shape is already there. Nothing will jump. */
export const Empty: Story = {
  args: { value: {}, streaming: true },
};

/**
 * Mid-stream. Every field holds its place, so the value lands in space already
 * reserved for it instead of pushing the rest of the form down the page.
 */
export const Streaming: Story = {
  args: {
    value: { vendor: "Northwind Supplies Ltd", invoiceNumber: "INV-2026-0841" },
    streaming: true,
  },
};

/** The same extraction, arriving. Watch that nothing below it moves. */
export const StreamingLive: Story = {
  parameters: { controls: { disable: true } },
  render: function StreamingLive() {
    const [value, setValue] = useState<Record<string, unknown>>({});
    const [streaming, setStreaming] = useState(true);

    useEffect(() => {
      const keys = Object.keys(COMPLETE);
      let index = 0;

      const timer = setInterval(() => {
        if (index >= keys.length) {
          setStreaming(false);
          setValue({});
          index = 0;
          setStreaming(true);
          return;
        }
        const key = keys[index];
        if (key) {
          setValue((current) => ({
            ...current,
            [key]: COMPLETE[key as keyof typeof COMPLETE],
          }));
        }
        index += 1;
      }, 900);

      return () => {
        clearInterval(timer);
      };
    }, []);

    return <StructuredOutput fields={INVOICE_FIELDS} value={value} streaming={streaming} />;
  },
};

/**
 * Confidence belongs per field, not per document — the vendor can be certain
 * while the total is a guess. It is stated as a number, because "should I check
 * this" is not a question a colour can answer.
 */
export const WithConfidence: Story = {
  parameters: { controls: { disable: true } },
  render: function WithConfidence() {
    return (
      <StructuredOutput fields={INVOICE_FIELDS} value={COMPLETE}>
        <StructuredField name="vendor">
          {COMPLETE.vendor}
          <StructuredConfidence value={0.97} />
        </StructuredField>
        <StructuredField name="total">
          {COMPLETE.total}
          <StructuredConfidence value={0.54} />
        </StructuredField>
        <StructuredField name="dueDate">
          {COMPLETE.dueDate}
          <StructuredConfidence value={0.88} />
        </StructuredField>
      </StructuredOutput>
    );
  },
};

/** A field that could not be read says why, in place, instead of going blank. */
export const FieldError: Story = {
  args: {
    value: { vendor: "Northwind Supplies Ltd", total: "$12,480.00" },
    errors: { dueDate: "No date found in the payment terms block" },
  },
  render: function FieldError(args) {
    return (
      <StructuredOutput {...args}>
        <StructuredField name="vendor" />
        <StructuredField name="total" />
        <StructuredField name="dueDate">
          <span className="text-destructive">No date found in the payment terms block</span>
        </StructuredField>
      </StructuredOutput>
    );
  },
};

/** CRM enrichment — the same shape, a different domain. */
export const CrmEnrichment: Story = {
  args: {
    fields: [
      { name: "company", label: "Company" },
      { name: "industry", label: "Industry" },
      { name: "headcount", label: "Headcount" },
      { name: "hq", label: "Headquarters" },
      { name: "summary", label: "Summary", lines: 3 },
    ],
    value: {
      company: "Northwind Supplies Ltd",
      industry: "Industrial distribution",
      headcount: 240,
      hq: "Leeds, United Kingdom",
      summary:
        "Regional distributor of data-centre hardware, founded 2009. Recently expanded into managed installation services.",
    },
  },
};
