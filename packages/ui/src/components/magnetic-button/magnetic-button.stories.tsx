import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Magnet } from "lucide-react";

import { mirrorForDirection } from "@/lib/styles";

import { MagneticButton } from "./magnetic-button";

const meta = {
  title: "Form/Magnetic Button",
  component: MagneticButton,
  args: {
    children: "Hover me",
    strength: 0.35,
    radius: 0,
  },
  argTypes: {
    strength: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    contentStrength: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    radius: { control: { type: "range", min: 0, max: 200, step: 10 } },
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
  },
  // Centred with room around it, so there is space to move the pointer in.
  parameters: { layout: "centered" },
} satisfies Meta<typeof MagneticButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - amicro "Magnetic Field" → the defaults: strength 0.35, pull within the
 *   button's own bounds, on a soft pill. The source's GitHub mark is a Magnet
 *   here: lucide 1.x dropped brand icons.
 * - SmoothUI "Magnetic Button" → `strength={0.3} radius={150}`: the pull reaches
 *   150px past the button and fades with distance. SmoothUI padded a wrapper to
 *   catch the pointer; that wrapper sat over neighbouring controls, so this
 *   listens on the window instead.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-16">
      <figure className="flex flex-col items-center gap-3">
        <MagneticButton variant="secondary" className="rounded-full px-6">
          <Magnet />
          Magnetic Field
        </MagneticButton>
        <figcaption className="text-xs text-muted-foreground">
          amicro · Magnetic Field
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <MagneticButton strength={0.3} radius={150}>
          Magnetic Button
        </MagneticButton>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Magnetic Button
        </figcaption>
      </figure>
    </div>
  ),
};

/** The label leans further than the button, for a sense of depth. */
export const Layered: Story = {
  args: {
    strength: 0.25,
    contentStrength: 0.5,
    size: "lg",
    className: "rounded-full px-8",
    children: (
      <>
        Get started
        <ArrowRight className={mirrorForDirection} />
      </>
    ),
  },
};

export const WithRadius: Story = {
  args: { radius: 120, strength: 0.3, children: "Reaches 120px out" },
};

export const AsLink: Story = {
  name: "asChild (renders a link)",
  parameters: { controls: { disable: true } },
  render: () => (
    <MagneticButton asChild variant="outline">
      <a href="#pricing">View pricing</a>
    </MagneticButton>
  ),
};
