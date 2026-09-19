import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { BentoAnalyticsPanel, FeaturesBentoBlock } from "./features-bento";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FeaturesBentoBlock> = {
  title: "Blocks/Features bento",
  component: FeaturesBentoBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FeaturesBentoBlock>;

/** SmoothUI "Features 2": a lead analytics cell and four smaller cells. */
export const Default: Story = {};

/** Every source item: SmoothUI "Features 2" (Features Bento), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FeaturesBentoBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Features 2 — Features Bento
      </figcaption>
    </figure>
  ),
};

/** The lead visual is any node; here a gradient placeholder where a product shot would go. */
export const CustomVisual: Story = {
  args: {
    heading: "Your workspace",
    features: [
      {
        title: "Canvas",
        description: "Sketch, plan and present in one place.",
        visual: (
          <div className="h-full rounded-xl bg-linear-to-br from-primary/30 via-accent to-muted" />
        ),
      },
      { title: "Comments", description: "Threads on any object." },
      { title: "History", description: "Every change, restorable." },
      { title: "Templates", description: "Start from a proven layout." },
      { title: "Export", description: "PDF, PNG or a live link." },
    ],
  },
};

/** A panel with your own figures. */
export const CustomPanel: Story = {
  args: {
    features: [
      {
        title: "Usage",
        description: "Requests served this week.",
        visual: (
          <BentoAnalyticsPanel
            label="Requests"
            value="1.2M"
            change="+3.1%"
            series={[20, 35, 30, 60, 45, 80, 100]}
          />
        ),
      },
      { title: "Latency", description: "p95 under 80 ms." },
      { title: "Errors", description: "Down 40% since launch." },
    ],
  },
};
