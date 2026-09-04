import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { BillingBlock, type BillingInvoice, type BillingUsage } from "./billing";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[60rem] max-w-full">
    <Story />
  </div>
);

const money = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);

const USAGE: BillingUsage[] = [
  { id: "seats", label: "Seats", used: 8, limit: 10, unit: "seats" },
  { id: "storage", label: "Storage", used: 128, limit: 250, unit: "GB" },
  { id: "requests", label: "API requests", used: 1_284_000, limit: 2_000_000 },
  { id: "overage", label: "Overage this period", used: 18.4, format: money },
];

const INVOICES: BillingInvoice[] = [
  {
    id: "in_4",
    at: "2026-03-01",
    label: "1 March 2026",
    amount: "$240.00",
    status: "open",
    href: "#in_4",
  },
  {
    id: "in_3",
    at: "2026-02-01",
    label: "1 February 2026",
    amount: "$240.00",
    status: "paid",
    href: "#in_3",
  },
  {
    id: "in_2",
    at: "2026-01-01",
    label: "1 January 2026",
    amount: "$240.00",
    status: "paid",
    href: "#in_2",
  },
  {
    id: "in_1",
    at: "2025-12-01",
    label: "1 December 2025",
    amount: "$40.00",
    status: "refunded",
    href: "#in_1",
  },
];

const meta = {
  title: "Blocks/Billing",
  component: BillingBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
} satisfies Meta<typeof BillingBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plan: {
      name: "Team",
      price: "$240",
      interval: "per month, billed annually",
      renewsAt: "2027-03-03",
      renewsLabel: "3 March 2027",
    },
    usage: USAGE,
    paymentMethod: { brand: "Visa", last4: "4242", expires: "04/2029" },
    invoices: INVOICES,
    onChangePlan: () => undefined,
    onUpdatePaymentMethod: () => undefined,
  },
};

export const OverLimit: Story = {
  args: {
    ...Default.args,
    usage: [
      { id: "seats", label: "Seats", used: 12, limit: 10, unit: "seats" },
      { id: "storage", label: "Storage", used: 250, limit: 250, unit: "GB" },
    ],
  },
};

export const PaymentProblem: Story = {
  args: {
    ...Default.args,
    paymentMethod: {
      brand: "Visa",
      last4: "4242",
      expires: "04/2026",
      problem: "This card was declined on 1 March. Update it to avoid interruption.",
    },
    invoices: [{ ...INVOICES[0]!, status: "past-due" }, ...INVOICES.slice(1)],
  },
};

export const Cancelling: Story = {
  args: {
    ...Default.args,
    plan: {
      name: "Team",
      price: "$240",
      interval: "per month",
      renewsAt: "2026-04-01",
      renewsLabel: "1 April 2026",
      cancelsAtPeriodEnd: true,
    },
  },
};

export const NothingBilledYet: Story = {
  args: {
    plan: { name: "Free", price: "$0", interval: "forever" },
    usage: [{ id: "seats", label: "Seats", used: 1, limit: 3, unit: "seats" }],
    onChangePlan: () => undefined,
    onUpdatePaymentMethod: () => undefined,
  },
};

export const WithActions: Story = {
  args: {
    ...Default.args,
    actions: (
      <Button variant="outline" size="sm">
        Download all
      </Button>
    ),
  },
};
