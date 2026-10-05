import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heart, Plus, Send, Trash2 } from "lucide-react";

import { RippleButton } from "./ripple-button";

const meta = {
  title: "Form/Ripple Button",
  component: RippleButton,
  args: {
    children: (
      <>
        <Send /> Send message
      </>
    ),
    variant: "gradient",
    size: "lg",
    shape: "pill",
    rippleTone: "auto",
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive", "soft", "gradient"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
    shape: { control: "inline-radio", options: ["default", "pill", "square"] },
    rippleTone: {
      control: "select",
      options: [
        "auto",
        "primary",
        "primary-foreground",
        "foreground",
        "background",
        "success",
        "destructive",
      ],
    },
    children: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RippleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press anywhere on it — or press quickly, several times: each press sends its own wave from where it landed. */
export const Default: Story = {};

/** Every Button variant, each rippling in its own label colour. */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <RippleButton variant="primary">Primary</RippleButton>
      <RippleButton variant="secondary">Secondary</RippleButton>
      <RippleButton variant="outline">Outline</RippleButton>
      <RippleButton variant="ghost">Ghost</RippleButton>
      <RippleButton variant="soft">Soft</RippleButton>
      <RippleButton variant="destructive">
        <Trash2 /> Delete
      </RippleButton>
    </div>
  ),
};

/** `rippleTone` picks a token for the wave instead of the label colour. */
export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <RippleButton variant="outline" rippleTone="primary">
        Primary wave
      </RippleButton>
      <RippleButton variant="outline" rippleTone="success">
        Success wave
      </RippleButton>
      <RippleButton variant="ghost" rippleTone="destructive" size="icon" aria-label="Like">
        <Heart />
      </RippleButton>
      <RippleButton
        variant="secondary"
        rippleTone="primary"
        size="icon"
        shape="pill"
        aria-label="Add"
      >
        <Plus />
      </RippleButton>
    </div>
  ),
};

/** A large surface shows the geometry best: the wave always reaches the farthest corner. */
export const LargeSurface: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <RippleButton
      variant="soft"
      className="h-32 w-80 flex-col gap-1 rounded-2xl text-base"
      rippleTone="primary"
    >
      <span className="font-semibold">Tap anywhere</span>
      <span className="text-xs font-normal text-muted-foreground">
        or press Enter — it ripples from the centre
      </span>
    </RippleButton>
  ),
};
