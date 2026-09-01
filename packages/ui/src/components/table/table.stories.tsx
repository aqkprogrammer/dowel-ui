import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/badge";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const INVOICES = [
  { id: "INV-001", status: "Paid", method: "Credit card", amount: "$250.00" },
  { id: "INV-002", status: "Pending", method: "PayPal", amount: "$150.00" },
  { id: "INV-003", status: "Failed", method: "Bank transfer", amount: "$350.00" },
  { id: "INV-004", status: "Paid", method: "Credit card", amount: "$450.00" },
];

const meta = {
  title: "Data/Table",
  component: Table,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <TableCaption>Invoices from the last month.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {INVOICES.map((invoice) => (
          <TableRow key={invoice.id}>
            {/* A row header, so a screen reader can say which row a cell is in. */}
            <TableHead scope="row" className="font-medium text-foreground">
              {invoice.id}
            </TableHead>
            <TableCell>
              <Badge
                variant={
                  invoice.status === "Paid"
                    ? "success"
                    : invoice.status === "Failed"
                      ? "destructive"
                      : "secondary"
                }
                size="sm"
              >
                {invoice.status}
              </Badge>
            </TableCell>
            <TableCell>{invoice.method}</TableCell>
            <TableCell className="text-right tabular-nums">{invoice.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right tabular-nums">$1,200.00</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const Minimal: Story = {
  render: () => (
    <Table className="w-96" aria-label="Team members">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Ada Lovelace</TableCell>
          <TableCell>Engineering</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Grace Hopper</TableCell>
          <TableCell>Engineering</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** Overflowing horizontally: the wrapper is focusable so it can be scrolled by keyboard. */
export const Overflowing: Story = {
  render: () => (
    <div className="w-80">
      <Table aria-label="Wide data">
        <TableHeader>
          <TableRow>
            {Array.from({ length: 8 }, (_, index) => (
              <TableHead key={index} className="whitespace-nowrap">
                Column {index + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2].map((row) => (
            <TableRow key={row}>
              {Array.from({ length: 8 }, (_, index) => (
                <TableCell key={index} className="whitespace-nowrap">
                  Value {row + 1}.{index + 1}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
