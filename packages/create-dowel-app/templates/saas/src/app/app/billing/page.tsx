import { BillingBlock } from "@/components/blocks/billing";

export default function BillingPage() {
  return (
    <BillingBlock
      plan={{
        name: "Team",
        price: "$240",
        interval: "per month, billed annually",
        renewsAt: "2027-03-03",
        renewsLabel: "3 March 2027",
      }}
      usage={[
        { id: "seats", label: "Seats", used: 8, limit: 10, unit: "seats" },
        { id: "storage", label: "Storage", used: 128, limit: 250, unit: "GB" },
      ]}
      paymentMethod={{ brand: "Visa", last4: "4242", expires: "04/2029" }}
      invoices={[
        {
          id: "in_2",
          at: "2026-02-01",
          label: "1 February 2026",
          amount: "$240.00",
          status: "paid",
        },
        {
          id: "in_1",
          at: "2026-01-01",
          label: "1 January 2026",
          amount: "$240.00",
          status: "paid",
        },
      ]}
    />
  );
}
