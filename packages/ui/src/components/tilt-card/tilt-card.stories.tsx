import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { focusRing, mirrorForDirection } from "@/lib/styles";

import { TiltCard, TiltCardLayer } from "./tilt-card";

const meta = {
  title: "Display/Tilt Card",
  component: TiltCard,
  args: {
    maxTilt: 10,
    perspective: 800,
    scale: 1.02,
    glare: true,
    disabled: false,
    className: "w-72",
    children: (
      <>
        <CardHeader>
          <CardTitle>Tilt me</CardTitle>
          <CardDescription>
            Move the pointer across the card. It leans toward it and springs back flat on leave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video rounded-lg bg-linear-to-br from-primary/30 via-accent to-muted" />
        </CardContent>
      </>
    ),
  },
  argTypes: {
    maxTilt: { control: { type: "range", min: 0, max: 30, step: 1 } },
    perspective: { control: { type: "range", min: 300, max: 2000, step: 50 } },
    scale: { control: { type: "range", min: 1, max: 1.1, step: 0.01 } },
  },
  // Room around the card, so there is space to move the pointer in.
  parameters: { layout: "centered" },
} satisfies Meta<typeof TiltCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every source item this component covers.
 *
 * - bencho "Tilt card" → an original design of the same pattern (the source is
 *   a Pro block, so none of it was viewed): a photo card that tilts toward the
 *   pointer, a glare that follows it, and a caption floating on a layer above
 *   the image. The photo is a neutral placeholder.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-16">
      <figure className="flex flex-col items-center gap-3">
        <TiltCard className="w-72 overflow-hidden p-3" maxTilt={12}>
          <img
            src="https://picsum.photos/seed/tilt/600/400"
            alt="Placeholder landscape"
            className="aspect-[4/5] w-full rounded-lg object-cover"
          />
          <TiltCardLayer depth={18} className="absolute inset-x-6 bottom-6">
            <div className="rounded-lg bg-background/80 px-4 py-3 shadow-md backdrop-blur">
              <p className="text-sm font-semibold">Coastal ridge</p>
              <p className="text-xs text-muted-foreground">Placeholder photo</p>
            </div>
          </TiltCardLayer>
        </TiltCard>
        <figcaption className="text-xs text-muted-foreground">
          bencho · Tilt card (original design)
        </figcaption>
      </figure>
    </div>
  ),
};

/** Children marked as layers drift further than the surface, at their own depth. */
export const ParallaxLayers: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TiltCard
      className="h-80 w-72 items-center justify-center gap-4 overflow-hidden"
      maxTilt={14}
    >
      <TiltCardLayer
        depth={-10}
        aria-hidden="true"
        className="absolute inset-6 rounded-xl bg-linear-to-br from-primary/25 to-muted"
      />
      <TiltCardLayer depth={14} className="flex size-14 items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Sparkles aria-hidden="true" />
        </span>
      </TiltCardLayer>
      <TiltCardLayer depth={28}>
        <p className="text-lg font-semibold">Depth</p>
      </TiltCardLayer>
    </TiltCard>
  ),
};

/**
 * A card that goes somewhere contains a real link, stretched over the card
 * with a pseudo-element so the whole surface is clickable. Tab to it: the
 * card lifts instead of tilting.
 */
export const AsLink: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TiltCard className="w-72">
      <CardHeader>
        <CardTitle>
          <a
            href="#changelog"
            className={`rounded-sm after:absolute after:inset-0 after:rounded-xl ${focusRing}`}
          >
            Read the changelog
          </a>
        </CardTitle>
        <CardDescription>Everything that shipped this month.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-1 text-sm font-medium text-primary">
        Open
        <ArrowUpRight aria-hidden="true" className={`size-4 ${mirrorForDirection}`} />
      </CardContent>
    </TiltCard>
  ),
};

export const WithoutGlare: Story = {
  args: { glare: false },
};

export const Subtle: Story = {
  args: { maxTilt: 4, scale: 1, perspective: 1400 },
};
