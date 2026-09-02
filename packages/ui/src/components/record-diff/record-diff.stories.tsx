import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { RecordDiff } from "./record-diff";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="max-w-2xl">
    <Story />
  </div>
);

const meta = {
  title: "Data/Record Diff",
  component: RecordDiff,
  decorators: [withWidth],
  args: {
    before: { name: "Acme Corp", plan: "team", seats: 5, role: "viewer", region: "us-east-1" },
    after: {
      name: "Acme Corp",
      plan: "enterprise",
      seats: 25,
      role: "admin",
      region: "us-east-1",
    },
  },
} satisfies Meta<typeof RecordDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Unchanged fields are there when you need them, out of the way when you do not. */
export const AllFields: Story = {
  args: { collapseUnchanged: false },
};

/**
 * Added and removed are distinct from changed, and each is stated in text as
 * well as colour — a coloured row on its own is not information.
 */
export const AddedAndRemoved: Story = {
  args: {
    before: { webhookUrl: "https://acme.test/hook", retries: 3 },
    after: { retries: 3, signingSecret: "configured" },
    collapseUnchanged: false,
  },
};

/**
 * Secret-shaped keys are redacted by pattern, and the value never reaches the
 * DOM — nor the formatter, which is consumer code that might log.
 */
export const RedactedSecrets: Story = {
  args: {
    before: { name: "Production key", apiKey: "sk-live-9f3a2b", scopes: ["read"] },
    after: { name: "Production key", apiKey: "sk-live-7c1d8e", scopes: ["read", "write"] },
    collapseUnchanged: false,
  },
};

/** The audit-log detail view, which is where this earns its place. */
export const AuditEntry: Story = {
  args: {
    labels: { mfaRequired: "MFA required", ssoDomain: "SSO domain" },
    before: {
      role: "member",
      mfaRequired: false,
      ssoDomain: "",
      seats: 10,
    },
    after: {
      role: "owner",
      mfaRequired: true,
      ssoDomain: "acme.com",
      seats: 10,
    },
  },
};

/** Nothing changed is a real answer, and worth saying rather than showing blank. */
export const NoChanges: Story = {
  args: {
    before: { plan: "team", seats: 5 },
    after: { plan: "team", seats: 5 },
  },
};

/** Values are formatted for people: booleans as words, empty lists as "none". */
export const ValueFormatting: Story = {
  args: {
    before: { active: true, tags: ["beta"], quota: 0, notes: "" },
    after: { active: false, tags: [], quota: 500, notes: "Upgraded" },
    collapseUnchanged: false,
  },
};

/** A custom formatter for domain values — money, dates, enums. */
export const CustomFormatter: Story = {
  args: {
    before: { monthlyPrice: 4900, renewsAt: "2026-01-01" },
    after: { monthlyPrice: 12900, renewsAt: "2027-01-01" },
    collapseUnchanged: false,
    formatValue: (value: unknown, key: string) =>
      key === "monthlyPrice"
        ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
            Number(value) / 100,
          )
        : String(value),
  },
};
