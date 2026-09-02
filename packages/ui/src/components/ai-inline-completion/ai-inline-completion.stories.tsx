import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { InlineCompletion } from "./ai-inline-completion";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

/** Stands in for a model. A real one would stream from an endpoint. */
const CONTINUATIONS: Record<string, string> = {
  "Thanks for getting back to me":
    " so quickly — I have shared the updated figures with the team.",
  "Following up on": " our conversation last week about the migration timeline.",
  Hi: " there, hope you are having a good week.",
};

function suggestionFor(value: string): string {
  const key = Object.keys(CONTINUATIONS).find((prefix) => value.trimEnd() === prefix);
  return key ? (CONTINUATIONS[key] ?? "") : "";
}

const meta = {
  title: "AI/Inline Completion",
  component: InlineCompletion,
  decorators: [withWidth],
  args: {
    "aria-label": "Message",
    // Required by the component, so the meta must carry one; every story that
    // is actually interactive replaces it with real state.
    onValueChange: () => undefined,
    value: "Thanks for getting back to me",
    suggestion: " so quickly — I have shared the updated figures with the team.",
    rows: 4,
  },
} satisfies Meta<typeof InlineCompletion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Default(args) {
    const [value, setValue] = useState(args.value);
    return <InlineCompletion {...args} value={value} onValueChange={setValue} />;
  },
};

/**
 * Type one of these and a continuation appears: "Hi", "Following up on", or
 * "Thanks for getting back to me". Tab takes it, Alt+Right takes one word,
 * Escape dismisses it and gives Tab back to focus management.
 */
export const Live: Story = {
  parameters: { controls: { disable: true } },
  render: function Live() {
    const [value, setValue] = useState("Hi");

    return (
      <div className="flex flex-col gap-2">
        <InlineCompletion
          aria-label="Message"
          rows={4}
          value={value}
          onValueChange={setValue}
          suggestion={suggestionFor(value)}
          placeholder="Start typing…"
        />
        <p className="text-xs text-muted-foreground">
          Tab accepts · Alt+Right takes a word · Escape dismisses
        </p>
        <button
          type="button"
          className="self-start rounded-md border border-input px-2 py-1 text-xs"
        >
          Tab reaches me once the suggestion is dismissed
        </button>
      </div>
    );
  },
};

/** Nothing to suggest is the common case, and it must cost nothing. */
export const NoSuggestion: Story = {
  args: { value: "A message with no completion pending", suggestion: "" },
  render: function NoSuggestion(args) {
    const [value, setValue] = useState(args.value);
    return <InlineCompletion {...args} value={value} onValueChange={setValue} />;
  },
};

/** Single line, for a subject or a title field. */
export const SingleLine: Story = {
  args: {
    "aria-label": "Subject",
    singleLine: true,
    value: "Q3 planning",
    suggestion: " — agenda and pre-reads",
    rows: undefined,
  },
  render: function SingleLine(args) {
    const [value, setValue] = useState(args.value);
    return <InlineCompletion {...args} value={value} onValueChange={setValue} />;
  },
};

/**
 * A long continuation wraps with the text rather than running off the edge,
 * because the ghost is laid out by the same typography as the field.
 */
export const Wrapping: Story = {
  args: {
    value: "Summary of the incident:",
    suggestion:
      " the primary database became unavailable at 14:02 UTC following a failed failover, and read traffic was served from the replica until 14:41 while the primary was rebuilt.",
    rows: 6,
  },
  render: function Wrapping(args) {
    const [value, setValue] = useState(args.value);
    return <InlineCompletion {...args} value={value} onValueChange={setValue} />;
  },
};
