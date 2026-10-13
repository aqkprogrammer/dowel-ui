import type { Meta, StoryObj } from "@storybook/react-vite";

import { HighlightText } from "./highlight-text";

const meta = {
  title: "Effects/Highlight Text",
  component: HighlightText,
  args: { variant: "marker", trigger: "always", duration: 700, delay: 0 },
  argTypes: {
    variant: { control: "inline-radio", options: ["marker", "underline", "strike"] },
    trigger: { control: "inline-radio", options: ["view", "hover", "always"] },
    color: {
      control: "select",
      options: ["warning", "primary", "info", "success", "destructive"],
    },
    duration: { control: { type: "range", min: 100, max: 2000, step: 50 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A marker stroke behind the phrase that matters — and it wraps with the text. */
export const Default: Story = {
  render: (args) => (
    <p className="max-w-md text-2xl leading-relaxed text-foreground">
      Every component installs as source, so{" "}
      <HighlightText {...args} as="mark">
        the code you ship is the code you can read and change
      </HighlightText>
      .
    </p>
  ),
};

/** Underline and strike, drawn on hover or focus: tab to the link. */
export const Lines: Story = {
  render: () => (
    <div className="grid gap-4 text-lg text-foreground">
      <p>
        Read the{" "}
        <HighlightText trigger="hover" variant="underline">
          <a href="#docs" className="outline-none">
            documentation
          </a>
        </HighlightText>{" "}
        first.
      </p>
      <p>
        Price:{" "}
        <HighlightText trigger="always" variant="strike" color="destructive">
          $49
        </HighlightText>{" "}
        $29
      </p>
    </div>
  ),
};
