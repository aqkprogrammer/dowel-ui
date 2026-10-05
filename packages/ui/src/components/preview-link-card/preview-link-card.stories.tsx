import type { Meta, StoryObj } from "@storybook/react-vite";

import { PreviewLinkCard } from "./preview-link-card";

const meta = {
  title: "Overlays/Preview Link Card",
  component: PreviewLinkCard,
  args: {
    href: "https://www.example.com/field-notes/motion",
    image: "https://picsum.photos/seed/dowel-motion/640/360",
    heading: "Field notes on motion",
    description: "Why exits are faster than entrances, and what a spring is really for.",
    size: "md",
    side: "top",
    openDelay: 300,
    children: "field notes on motion",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PreviewLinkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover or tab to the link: the card grows out of it, the image wipes in from a shimmer, and the lines rise in. */
export const Default: Story = {
  render: (args) => (
    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
      Before you add a single animation, read the <PreviewLinkCard {...args} /> — it explains
      where the springs in this library come from.
    </p>
  ),
};

/** Several links in running text, each with its own preview. */
export const InProse: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
      The palette came from{" "}
      <PreviewLinkCard
        href="https://www.example.org/harbour"
        image="https://picsum.photos/seed/harbour/640/360"
        heading="Harbour at dusk"
        description="Boats coming in under a violet sky."
      >
        a photograph of a harbour
      </PreviewLinkCard>
      , the type from{" "}
      <PreviewLinkCard
        href="https://type.example.net/specimen"
        image="https://picsum.photos/seed/specimen/640/360"
        heading="A type specimen"
        side="bottom"
      >
        an old specimen sheet
      </PreviewLinkCard>
      , and the motion from{" "}
      <PreviewLinkCard
        href="https://www.example.com/field-notes/motion"
        image="https://picsum.photos/seed/dowel-motion/640/360"
        heading="Field notes on motion"
        size="sm"
      >
        a long afternoon with a stopwatch
      </PreviewLinkCard>
      .
    </p>
  ),
};

/** Image only: no heading or description, just the hostname under the picture. */
export const ImageOnly: Story = {
  args: { heading: undefined, description: undefined, size: "sm" },
  render: (args) => (
    <p className="text-sm text-muted-foreground">
      See <PreviewLinkCard {...args} /> for the details.
    </p>
  ),
};

/** A broken image falls back to the hostname rather than an empty frame. */
export const BrokenImage: Story = {
  args: { image: "/does-not-exist.png", children: "a missing preview" },
  render: (args) => (
    <p className="text-sm text-muted-foreground">
      This one has <PreviewLinkCard {...args} />.
    </p>
  ),
};
