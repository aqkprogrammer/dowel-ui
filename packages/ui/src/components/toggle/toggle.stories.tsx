import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bold,
  Bookmark,
  Heart,
  Italic,
  Mic,
  MicOff,
  Pin,
  Star,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState } from "react";

import { Toggle } from "./toggle";

const meta = {
  title: "Form/Toggle",
  component: Toggle,
  args: { variant: "default", size: "md", disabled: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "outline"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A formatting bar: press any one to feel the squish, then watch the fill pour out from the centre. */
export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
        <Toggle {...args} aria-label="Bold" defaultPressed>
          <Bold />
        </Toggle>
        <Toggle {...args} aria-label="Italic">
          <Italic />
        </Toggle>
        <Toggle {...args} aria-label="Underline">
          <Underline />
        </Toggle>
        <Toggle {...args} aria-label="Strikethrough">
          <Strikethrough />
        </Toggle>
      </div>
      <div className="flex items-center gap-2">
        <Toggle {...args} variant="outline">
          <Star />
          Star
        </Toggle>
        <Toggle {...args} variant="outline">
          <Bookmark />
          Save
        </Toggle>
        <Toggle {...args} variant="outline">
          <Heart />
          Like
        </Toggle>
      </div>
    </div>
  ),
};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <Toggle aria-label="Pin">
        <Pin />
      </Toggle>
      <Toggle variant="outline" aria-label="Pin">
        <Pin />
      </Toggle>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle size="sm" variant="outline" aria-label="Small">
        <Star />
      </Toggle>
      <Toggle size="md" variant="outline" aria-label="Medium">
        <Star />
      </Toggle>
      <Toggle size="lg" variant="outline" aria-label="Large">
        <Star />
      </Toggle>
    </div>
  ),
};

function MuteDemo() {
  const [muted, setMuted] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <Toggle variant="outline" size="lg" pressed={muted} onPressedChange={setMuted}>
        {muted ? <MicOff /> : <Mic />}
        {muted ? "Muted" : "Mute"}
      </Toggle>
      <p className="text-xs text-muted-foreground">
        Controlled: the parent owns <code>pressed</code> and swaps the icon.
      </p>
    </div>
  );
}

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <MuteDemo />,
};
