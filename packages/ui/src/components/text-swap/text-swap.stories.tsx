import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { TextRotate } from "./text-rotate";
import { TextSwap, textSwapTransitionNames, type TextSwapProps } from "./text-swap";

const PHRASES = ["Move with purpose.", "Direction matters.", "Axis of progress."];

/** A TextSwap stepped by Previous / Next, so `direction` follows the step. */
function Stepper({ items = PHRASES, ...props }: Partial<TextSwapProps> & { items?: string[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const step = (delta: number) => {
    setDirection(delta > 0 ? "forward" : "backward");
    setIndex((current) => (current + delta + items.length) % items.length);
  };
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <TextSwap className="text-4xl font-bold tracking-tight" direction={direction} {...props}>
        {items[index] ?? ""}
      </TextSwap>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => step(-1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={() => step(1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

const meta = {
  title: "Effects/Text Swap",
  component: TextSwap,
  args: { transition: "fade-through", children: PHRASES[0] ?? "" },
  argTypes: {
    transition: { control: "select", options: textSwapTransitionNames },
    direction: { control: "inline-radio", options: ["forward", "backward"] },
  },
} satisfies Meta<typeof TextSwap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: ({ transition }) => <Stepper transition={transition} />,
};

/** Every SmoothUI source this covers, each captioned with its SmoothUI name. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center">
        <p className="text-sm tracking-widest text-muted-foreground uppercase">We help you</p>
        <TextRotate
          appear
          className="text-4xl font-bold tracking-tight"
          items={["Ship faster.", "Build smarter.", "Scale further."]}
        />
        <TextRotate
          appear
          className="text-lg text-muted-foreground"
          interval={3000}
          items={[
            "Beautifully animated components.",
            "Accessible by default.",
            "Copy-paste ready.",
          ]}
        />
        <figcaption className="mt-auto text-xs text-muted-foreground">
          Fade Through — transition=&quot;fade-through&quot;
        </figcaption>
      </figure>
      <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center">
        <TextSwap
          appear
          transition="per-word-crossfade"
          className="text-4xl font-bold tracking-tight"
        >
          Think different.
        </TextSwap>
        <TextSwap
          appear
          delay={400}
          transition="per-word-crossfade"
          className="text-lg text-muted-foreground"
        >
          Per-word crossfade reveal.
        </TextSwap>
        <figcaption className="mt-auto text-xs text-muted-foreground">
          Per Word Crossfade — transition=&quot;per-word-crossfade&quot; appear
        </figcaption>
      </figure>
      <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center">
        <TextRotate
          appear
          transition="shared-axis-x"
          className="text-4xl font-bold tracking-tight"
          items={PHRASES}
        />
        <figcaption className="mt-auto text-xs text-muted-foreground">
          Shared Axis X — transition=&quot;shared-axis-x&quot;
        </figcaption>
      </figure>
      <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center">
        <TextRotate
          appear
          transition="shared-axis-y"
          className="text-4xl font-bold tracking-tight"
          items={["Layered navigation.", "Hierarchy made clear.", "Depth with restraint."]}
        />
        <figcaption className="mt-auto text-xs text-muted-foreground">
          Shared Axis Y (Word Cut Staircase) — transition=&quot;shared-axis-y&quot;
        </figcaption>
      </figure>
      <figure className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center">
        <TextRotate
          appear
          transition="shared-axis-z"
          className="text-4xl font-bold tracking-tight"
          items={["Zooming between states.", "Elevate and settle.", "Scale with purpose."]}
        />
        <figcaption className="mt-auto text-xs text-muted-foreground">
          Shared Axis Z — transition=&quot;shared-axis-z&quot;
        </figcaption>
      </figure>
    </div>
  ),
};

/** Previous runs every transition backward; shared-axis-x mirrors under dir="rtl". */
export const Directions: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-10 sm:grid-cols-2">
      <div className="flex flex-col items-center gap-2">
        <Stepper transition="shared-axis-x" />
        <span className="text-xs text-muted-foreground">LTR</span>
      </div>
      <div dir="rtl" className="flex flex-col items-center gap-2">
        <Stepper
          transition="shared-axis-x"
          items={["مرحبا بالعالم", "اتجاه الحركة", "خطوة تالية"]}
        />
        <span className="text-xs text-muted-foreground">RTL</span>
      </div>
    </div>
  ),
};

/** Inline in a sentence: the grid cell holds both widths while they overlap. */
export const InSentence: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <p className="text-2xl">
      Deploys are{" "}
      <TextRotate
        className="font-semibold text-primary"
        transition="shared-axis-z"
        items={["fast", "repeatable", "boring, in the good way"]}
      />
      .
    </p>
  ),
};

/** Opt-in live region: only the settled value is announced. */
export const LiveRegion: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Stepper transition="fade-through" aria-live="polite" />,
};

export const InView: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center">
      <p className="text-sm text-muted-foreground">Scroll down</p>
      <div className="h-[120vh]" />
      <TextSwap
        as="h2"
        appear="in-view"
        transition="per-word-crossfade"
        className="text-4xl font-bold"
      >
        Revealed as it scrolls into view.
      </TextSwap>
    </div>
  ),
};
