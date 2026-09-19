import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Gauge, Globe, Lock, Rocket } from "lucide-react";

import { FeaturesIconGridBlock } from "./features-icon-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FeaturesIconGridBlock> = {
  title: "Blocks/Features icon grid",
  component: FeaturesIconGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FeaturesIconGridBlock>;

/** SmoothUI "Features 1": six cards that rise in, staggered, and lift on hover. */
export const Default: Story = {};

/** Every source item: SmoothUI "Features 1" (Features Grid), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FeaturesIconGridBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Features 1 — Features Grid
      </figcaption>
    </figure>
  ),
};

/** Your own content, with lucide icons from the consuming app. */
export const CustomContent: Story = {
  args: {
    heading: "Ship with confidence",
    description: "Four things every deployment gets without configuration.",
    features: [
      { title: "Preview URLs", description: "Every branch gets its own URL.", icon: <Globe /> },
      {
        title: "Instant rollback",
        description: "One click back to any deploy.",
        icon: <Rocket />,
      },
      { title: "Web vitals", description: "Real-user metrics per route.", icon: <Gauge /> },
      {
        title: "Secrets",
        description: "Encrypted and scoped per environment.",
        icon: <Lock />,
      },
    ],
  },
};

/** Composed under a page `h1` at level 2, or nested deeper at level 3. */
export const NestedHeading: Story = {
  args: { headingLevel: 3 },
};
