import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Check, Droplets, Trash2, Upload } from "lucide-react";

import { LiquidButton } from "./liquid-button";

const meta = {
  title: "Form/Liquid Button",
  component: LiquidButton,
  args: {
    children: (
      <>
        <Droplets /> Dive in <ArrowRight />
      </>
    ),
    tone: "primary",
    size: "lg",
    disabled: false,
  },
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["primary", "foreground", "destructive", "success"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    children: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof LiquidButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to it and the liquid rises, turning the label as it passes; press it to slosh. */
export const Default: Story = {};

/** Four tones, each with its paired foreground for the label above the liquid. */
export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <LiquidButton tone="primary">
        <Upload /> Publish
      </LiquidButton>
      <LiquidButton tone="foreground">Subscribe</LiquidButton>
      <LiquidButton tone="success">
        <Check /> Approve
      </LiquidButton>
      <LiquidButton tone="destructive">
        <Trash2 /> Discard
      </LiquidButton>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <LiquidButton size="sm">Small</LiquidButton>
      <LiquidButton size="md">Medium</LiquidButton>
      <LiquidButton size="lg">Large</LiquidButton>
    </div>
  ),
};

/** Wide surfaces show the two-layer surface best: hover and hold to watch it roll. */
export const Wide: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <LiquidButton size="lg" className="h-14 w-72 text-lg">
      Fill it up
    </LiquidButton>
  ),
};
