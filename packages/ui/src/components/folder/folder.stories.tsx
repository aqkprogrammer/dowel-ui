import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";

import { Folder } from "./folder";

const PHOTOS = ["harbour", "dunes", "canopy"];

function photo(seed: string) {
  return `https://picsum.photos/seed/${seed}/240/200`;
}

const meta = {
  title: "Display/Folder",
  component: Folder,
  args: {
    label: "Projects",
    tone: "neutral",
    size: "md",
    hideLabel: false,
    disabled: false,
  },
  argTypes: {
    tone: { control: "inline-radio", options: ["neutral", "primary", "inverted"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    open: { control: "boolean" },
    items: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Folder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to it to fan the sheets; press to open it. */
export const Default: Story = {};

/**
 * Every source item this component covers.
 *
 * - Rare UI "Folder component" → an original design of the same pattern (no
 *   source was viewed): sheets that fan on hover and lift on click under a
 *   flap that tips open in 3D. The source's colour themes map to the
 *   token-driven `tone` axis, and its sizes to `size`.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-10">
      {(["neutral", "primary", "inverted"] as const).map((tone) => (
        <div key={tone} className="flex flex-wrap items-end justify-center gap-8">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Folder key={size} tone={tone} size={size} label={`${tone} · ${size}`} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Primary: Story = { args: { tone: "primary", label: "Designs" } };

export const Inverted: Story = { args: { tone: "inverted", label: "Archive" } };

export const Open: Story = { args: { defaultOpen: true } };

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-8">
      <Folder size="sm" label="Small" />
      <Folder size="md" label="Medium" />
      <Folder size="lg" label="Large" />
    </div>
  ),
};

/** Photo thumbnails on the sheets. They are decorative — the name is the label. */
export const WithThumbnails: Story = {
  args: {
    label: "Holiday photos",
    tone: "primary",
    size: "lg",
    items: PHOTOS.map((seed) => <img key={seed} src={photo(seed)} alt="" />),
  },
};

/** Native emoji on the sheets. */
export const WithEmoji: Story = {
  args: { label: "Ideas", items: ["💡", "🎨", "🧪"] },
};

/**
 * When opening the folder shows real content, the folder points at it with
 * `aria-controls`, so "expanded" means something to a screen reader too.
 */
export const RevealsContents: Story = {
  parameters: { controls: { disable: true } },
  render: function RevealsContents() {
    const [open, setOpen] = useState(false);
    const id = useId();
    const files = ["Roadmap.pdf", "Brand refresh.fig", "Q3 plan.docx"];
    return (
      <div className="flex flex-col items-center gap-4">
        <Folder label="Q3 planning" open={open} onOpenChange={setOpen} aria-controls={id} />
        <ul
          id={id}
          hidden={!open}
          className="w-56 divide-y divide-border rounded-lg border border-border text-sm"
        >
          {files.map((file) => (
            <li key={file} className="px-3 py-2">
              {file}
            </li>
          ))}
        </ul>
      </div>
    );
  },
};

export const HiddenLabel: Story = { args: { hideLabel: true, label: "Downloads" } };

export const Disabled: Story = { args: { disabled: true } };

export const RightToLeft: Story = {
  args: { label: "مشاريع" },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
