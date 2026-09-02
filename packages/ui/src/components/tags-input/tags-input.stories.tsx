import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { TagsInput } from "./tags-input";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const isEmail = (tag: string) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tag) ? true : "not an email address";

const meta = {
  title: "Forms/Tags Input",
  component: TagsInput,
  decorators: [withWidth],
  args: {
    label: "Invite by email",
    value: [],
    onValueChange: () => undefined,
    placeholder: "name@example.com",
  },
} satisfies Meta<typeof TagsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type and press Enter, or use a comma or semicolon. */
export const Default: Story = {
  render: function Default(args) {
    const [value, setValue] = useState<string[]>([]);
    return <TagsInput {...args} value={value} onValueChange={setValue} />;
  },
};

export const WithTags: Story = {
  render: function WithTags(args) {
    const [value, setValue] = useState(["ana@acme.test", "bo@acme.test"]);
    return <TagsInput {...args} value={value} onValueChange={setValue} />;
  },
};

/**
 * The reason this exists. Add `not-an-email` and it becomes a token like any
 * other — marked, carrying its reason, and removable. Every library surveyed
 * either refuses the entry or discards it, leaving the reader with a field that
 * did not do what they asked and nothing to correct.
 */
export const InvalidStaysVisible: Story = {
  render: function InvalidStaysVisible(args) {
    const [value, setValue] = useState(["ana@acme.test", "not-an-email"]);
    const invalid = value.filter((tag) => isEmail(tag) !== true);

    return (
      <div className="flex flex-col gap-3">
        <TagsInput {...args} value={value} onValueChange={setValue} validate={isEmail} />
        <p className="text-xs text-muted-foreground">
          {invalid.length === 0
            ? "Ready to send"
            : `${String(invalid.length)} address needs fixing before this can be sent`}
        </p>
      </div>
    );
  },
};

/** Paste a list and it splits. A single pasted value stays editable. */
export const PasteMultiple: Story = {
  render: function PasteMultiple(args) {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <TagsInput {...args} value={value} onValueChange={setValue} validate={isEmail} />
        <p className="text-xs text-muted-foreground">
          Try pasting: <code>ana@acme.test, bo@acme.test; cy@acme.test</code>
        </p>
      </div>
    );
  },
};

/** A refusal is announced rather than looking like nothing happened. */
export const AtTheLimit: Story = {
  render: function AtTheLimit(args) {
    const [value, setValue] = useState(["one", "two"]);
    return (
      <TagsInput
        {...args}
        label="Stop sequences"
        placeholder="Add a sequence"
        max={3}
        value={value}
        onValueChange={setValue}
      />
    );
  },
};

/** Allowed domains — the same field, a different validator. */
export const AllowedDomains: Story = {
  render: function AllowedDomains(args) {
    const [value, setValue] = useState(["acme.com", "acme co.uk"]);
    return (
      <TagsInput
        {...args}
        label="Allowed domains"
        placeholder="example.com"
        value={value}
        onValueChange={setValue}
        validate={(tag) =>
          /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(tag) ? true : "not a valid domain"
        }
      />
    );
  },
};

export const Disabled: Story = {
  render: function Disabled(args) {
    return <TagsInput {...args} value={["ana@acme.test"]} disabled />;
  },
};
