import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkles } from "lucide-react";

import { Book } from "./book";

const meta = {
  title: "Display/Book",
  component: Book,
  args: {
    title: "The art of smooth interfaces",
    variant: "stripe",
    effect: "tilt",
    width: 196,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["stripe", "simple"] },
    effect: { control: "inline-radio", options: ["tilt", "open", "none"] },
    width: { control: { type: "range", min: 120, max: 320, step: 4 } },
    color: { control: "text" },
    textColor: { control: "text" },
  },
} satisfies Meta<typeof Book>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/*
 * SmoothUI's Book demo, in source order. The demo's literal teal and crimson
 * become the info and destructive tokens, so the books follow the theme.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex min-h-[22rem] flex-wrap items-center justify-center gap-8">
      <figure className="flex flex-col items-center gap-3">
        <Book title="The art of smooth interfaces" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Book (stripe)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <Book
          title="Design Engineering Handbook"
          variant="simple"
          color="var(--color-info)"
          textColor="var(--color-info-foreground)"
        />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Book (simple)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <Book title="Building for the modern web" color="var(--color-destructive)" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Book (custom colour)
        </figcaption>
      </figure>
    </div>
  ),
};

/** Hover or focus swings the cover open on its spine. */
export const Open: Story = {
  args: {
    effect: "open",
    title: "Field notes on motion",
    inside: (
      <span className="flex h-full flex-col justify-between text-[0.6rem] leading-relaxed">
        <span className="font-semibold">Chapter one</span>
        <span className="text-muted-foreground">
          Every movement should explain a change the reader already caused.
        </span>
      </span>
    ),
  },
  render: (args) => (
    <div className="flex min-h-[22rem] items-center justify-center">
      <Book {...args} />
    </div>
  ),
};

export const WithIllustrationAndLogo: Story = {
  args: {
    title: "Tokens all the way down",
    color: "var(--color-success)",
    illustration: (
      <span className="block size-full bg-[radial-gradient(circle_at_30%_40%,var(--color-card),transparent_60%)] opacity-40" />
    ),
    logo: <Sparkles aria-hidden className="size-4 text-muted-foreground" />,
  },
};

/** As a link, the book takes focus itself and focus tilts it like hover does. */
export const AsLink: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Book asChild title="Building for the modern web" color="var(--color-warning)">
      <a href="/example" aria-label="Building for the modern web" />
    </Book>
  ),
};
