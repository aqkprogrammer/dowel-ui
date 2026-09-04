import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Label } from "@/components/label";

import { Textarea } from "./textarea";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Textarea",
  component: Textarea,
  decorators: [withWidth],
  args: {
    placeholder: "Tell us about the project…",
    "aria-label": "Description",
  },
  argTypes: {
    textareaSize: { control: "inline-radio", options: ["sm", "md", "lg"] },
    resize: { control: "inline-radio", options: ["none", "vertical", "both"] },
    autoResize: { control: "boolean" },
    showCount: { control: "boolean" },
    disabled: { control: "boolean" },
    rows: { control: { type: "number" } },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="description">Description</Label>
      <Textarea id="description" placeholder="Tell us about the project…" />
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      <Textarea textareaSize="sm" placeholder="Small" aria-label="Small" />
      <Textarea textareaSize="md" placeholder="Medium" aria-label="Medium" />
      <Textarea textareaSize="lg" placeholder="Large" aria-label="Large" />
    </div>
  ),
};

/**
 * Grows with what is typed, up to `maxRows`, then scrolls. Off by default: a
 * field that changes height moves everything below it.
 */
export const AutoResize: Story = {
  args: { autoResize: true, maxRows: 8, rows: 2 },
};

/**
 * The count stays silent while there is room and only goes live once the limit
 * is close. A permanently live counter reads the remaining number between every
 * keystroke.
 */
export const WithCount: Story = {
  args: { showCount: true, maxLength: 200 },
};

/** Near the limit, where the count becomes information rather than chatter. */
export const NearTheLimit: Story = {
  args: {
    showCount: true,
    maxLength: 200,
    defaultValue: "x".repeat(186),
  },
};

/** Over it: how far over, rather than a negative remainder. */
export const OverTheLimit: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [value, setValue] = useState("x".repeat(214));
    return (
      <Textarea
        showCount
        maxLength={200}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        aria-label="Description"
      />
    );
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    defaultValue: "Too short",
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Cannot be edited" },
};
