import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipboardCheck, ClipboardCopy, Hash, Link } from "lucide-react";

import { CopyButton } from "./copy-button";

const meta = {
  title: "Form/Copy Button",
  component: CopyButton,
  args: {
    value: "0x7f3a9c2e41b8d05f",
    children: "Copy hash",
    tone: "success",
    timeout: 2000,
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
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
  },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** amicro "Copy Hash": the icon morphs to a check and the label to "Copied". */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - amicro "Copy Hash" → a labelled button with `tone="success"`. The source
 *   swapped on hover; this swaps when the copy has actually happened.
 * - SmoothUI "Button Copy" → an icon-only round button. The source's fake
 *   one-second loading state is dropped: the write resolves in milliseconds,
 *   and a spinner that is not waiting on anything is a lie.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <figure className="flex flex-col items-center gap-2">
        <CopyButton
          value="0x7f3a9c2e41b8d05f"
          tone="success"
          variant="ghost"
          className="rounded-full bg-secondary"
        >
          Copy Hash
        </CopyButton>
        <figcaption className="text-xs text-muted-foreground">amicro · Copy Hash</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <CopyButton value="npx dowel add copy-button" className="size-11 rounded-full" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Button Copy
        </figcaption>
      </figure>
    </div>
  ),
};

export const IconOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <CopyButton value="abc" />
      <CopyButton value="abc" size="icon-sm" variant="ghost" tone="success" />
      <CopyButton value="https://dowel.dev" aria-label="Copy link" icon={<Link />} />
    </div>
  ),
};

export const CustomIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <CopyButton value="abc" icon={<ClipboardCopy />} copiedIcon={<ClipboardCheck />}>
        Copy to clipboard
      </CopyButton>
      <CopyButton value="#a1b2c3" icon={<Hash />} tone="info" copiedLabel="Copied!">
        Copy colour
      </CopyButton>
    </div>
  ),
};

/** The value is read at click time, so it can come from live state. */
export const ValueFromFunction: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <CopyButton value={() => new Date().toISOString()} tone="success">
      Copy timestamp
    </CopyButton>
  ),
};
