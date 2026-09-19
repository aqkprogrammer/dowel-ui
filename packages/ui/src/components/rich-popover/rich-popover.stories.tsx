import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, PlayCircle } from "lucide-react";

import { RichPopover } from "./rich-popover";

const trigger = (
  <button
    type="button"
    aria-label="Video: Introducing the model"
    className="mx-2 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background align-middle focus-visible:ring-2 focus-visible:outline-none"
  >
    <PlayCircle className="size-4 text-destructive" />
  </button>
);

const meta: Meta<typeof RichPopover> = {
  title: "Overlays/Rich Popover",
  component: RichPopover,
  args: {
    trigger,
    heading: "Introducing the model",
    headingHref: "https://example.com/video",
    icon: <PlayCircle className="text-destructive" />,
    description:
      "State-of-the-art performance across coding, math, writing and visual perception — and a walkthrough of what it can build.",
    meta: "0:00–2:15",
    actionLabel: "Watch announcement",
    actionHref: "https://example.com/video",
    tone: "inverted",
    side: "top",
  },
  argTypes: {
    tone: { control: "inline-radio", options: ["default", "inverted"] },
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Rich Popover": a video reference inline in an article paragraph. */
export const Default: Story = {
  render: (args) => (
    <p className="max-w-2xl pt-48 text-base leading-relaxed text-muted-foreground">
      The team has just announced its latest model
      <RichPopover {...args} />
      marking a significant leap forward in capabilities across coding, mathematics and writing.
    </p>
  ),
};

/**
 * Every source item this component covers.
 *
 * - SmoothUI "Rich Popover" demo → inverted card with a linked heading, a
 *   quote, a time chip and a "Watch announcement" link. The source's YouTube
 *   logo is not shipped: brand marks are the consumer's `icon`.
 * - The same card in the default popover tone with a button action.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div className="flex flex-wrap items-end gap-16 pt-56">
      <figure className="flex flex-col items-center gap-2">
        <RichPopover {...args} />
        <figcaption className="text-xs text-muted-foreground">SmoothUI Rich Popover</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <RichPopover
          trigger={
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              Release notes
            </button>
          }
          icon={<FileText />}
          heading="Version 2.4"
          description="Faster builds, a new registry format and thirty fixes."
          meta="5 min read"
          actionLabel="Read more"
          actionIcon={null}
          onActionClick={() => undefined}
        />
        <figcaption className="text-xs text-muted-foreground">
          Default tone, button action
        </figcaption>
      </figure>
    </div>
  ),
};
