import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check } from "lucide-react";

import { GlowCard, GlowCardGroup, type GlowCardProps } from "./glow-card";

const meta = {
  title: "Display/Glow Card",
  component: GlowCard,
  args: {
    tone: "primary",
    intensity: 0.15,
    radius: 200,
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["primary", "foreground", "success", "warning", "info", "destructive"],
    },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    radius: { control: { type: "range", min: 60, max: 400, step: 10 } },
  },
  render: (args) => (
    <GlowCard {...args} className="w-72 p-5">
      <h2 className="text-sm font-semibold">Move the pointer over me</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        The glow follows the pointer along the card's edge.
      </p>
    </GlowCard>
  ),
} satisfies Meta<typeof GlowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

interface Plan {
  title: string;
  body: string;
  features: string[];
  cta: string;
  tone?: GlowCardProps["tone"];
}

/* The SmoothUI demo's three cards, verbatim in content. */
const PLANS: Plan[] = [
  {
    title: "Design System",
    body: "Build beautiful interfaces with our comprehensive design system",
    features: ["Component library", "Color palette", "Typography scale"],
    cta: "Explore",
  },
  {
    title: "Components",
    body: "Pre-built components ready to use in your next project",
    features: ["40+ components", "Fully customizable", "TypeScript support"],
    cta: "View All",
  },
  {
    title: "Animations",
    body: "Smooth, performant animations powered by Framer Motion",
    features: ["GPU accelerated", "Accessible", "Spring physics"],
    cta: "Learn More",
  },
];

function PlanCard({ plan, tone }: { plan: Plan; tone?: GlowCardProps["tone"] }) {
  return (
    <GlowCard
      tone={tone ?? plan.tone}
      className="grid max-w-72 min-w-48 flex-1 grid-rows-[auto_auto_1fr] items-start gap-4 rounded-2xl p-5"
    >
      <div>
        <h2 className="mb-2 text-sm font-semibold">{plan.title}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{plan.body}</p>
      </div>
      <ul className="space-y-1.5 text-xs leading-relaxed">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-1.5">
            <Check aria-hidden className="mt-0.5 size-3 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <a
        href="/example"
        className="mt-4 self-end rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        {plan.cta}
      </a>
    </GlowCard>
  );
}

/** SmoothUI · Glow Hover Card — one light moving across a group of cards. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-3">
      <GlowCardGroup radius={200} className="flex flex-wrap gap-6 md:gap-8">
        {PLANS.map((plan) => (
          <PlanCard key={plan.title} plan={plan} />
        ))}
      </GlowCardGroup>
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI · Glow Hover Card
      </figcaption>
    </figure>
  ),
};

/** The source's per-card HSL themes become tones (or any colour through `glowColor`). */
export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <GlowCardGroup className="flex flex-wrap gap-6">
      <PlanCard plan={PLANS[0] as Plan} tone="info" />
      <PlanCard plan={PLANS[1] as Plan} tone="success" />
      <PlanCard plan={PLANS[2] as Plan} tone="warning" />
    </GlowCardGroup>
  ),
};

export const AsLink: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <GlowCard
      asChild
      className="block w-72 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
    >
      <a href="/example">
        <span className="text-sm font-semibold">Read the changelog</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          The whole card is one link.
        </span>
      </a>
    </GlowCard>
  ),
};
