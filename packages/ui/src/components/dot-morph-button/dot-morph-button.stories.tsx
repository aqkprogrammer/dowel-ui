import type { Meta, StoryObj } from "@storybook/react-vite";

import { DotMorphButton } from "./dot-morph-button";

const meta = {
  title: "Form/Dot Morph Button",
  component: DotMorphButton,
  args: {
    children: "Get started",
    tone: "primary",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["current", "primary", "success", "warning", "destructive", "info"],
    },
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof DotMorphButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover it, or tab to it: the dot stretches into a bar. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Dot Morph Button" → its demo proportions: a large label on an
 *   outline pill with the brand-coloured dot.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-3">
      <DotMorphButton className="h-14 gap-3 px-6 text-2xl">Dot Morph</DotMorphButton>
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI · Dot Morph Button
      </figcaption>
    </figure>
  ),
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["current", "primary", "success", "warning", "destructive", "info"] as const).map(
        (tone) => (
          <DotMorphButton key={tone} tone={tone}>
            {tone}
          </DotMorphButton>
        ),
      )}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <DotMorphButton size="sm">Small</DotMorphButton>
      <DotMorphButton size="md">Medium</DotMorphButton>
      <DotMorphButton size="lg">Large</DotMorphButton>
    </div>
  ),
};
