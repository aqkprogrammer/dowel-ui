import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { PricingBlock, type PricingPlan } from "./pricing";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const PLANS: PricingPlan[] = [
  {
    id: "hobby",
    name: "Hobby",
    description: "For personal projects.",
    monthly: 0,
    features: ["1 project", "Community support", "Deploy from Git"],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams shipping to production.",
    monthly: 20,
    yearlyPerMonth: 16,
    features: ["Unlimited projects", "Priority support", "Preview deployments", "Analytics"],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organisations with compliance needs.",
    monthly: null,
    features: ["SSO and SCIM", "Audit logs", "Dedicated support", "Custom contracts"],
    cta: "Talk to sales",
  },
];

const meta = {
  title: "Blocks/Pricing",
  component: PricingBlock,
  args: { plans: PLANS },
  parameters: { controls: { disable: true } },
  decorators: [withPageWidth],
} satisfies Meta<typeof PricingBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip the period: every price changes, and the change is announced. */
export const Default: Story = {};

export const WithoutPeriodToggle: Story = {
  args: { showPeriodToggle: false },
};

export const WithFootnote: Story = {
  args: {
    footnote: "All prices exclude VAT. Cancel at any time.",
  },
};
