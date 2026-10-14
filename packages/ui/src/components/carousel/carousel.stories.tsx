import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";

import {
  Carousel,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPlayPause,
  CarouselPrevious,
  CarouselViewport,
} from "./carousel";

const PLANS = [
  { name: "Starter", price: "$0", note: "For trying things out" },
  { name: "Team", price: "$19", note: "For a team shipping weekly" },
  { name: "Pro", price: "$49", note: "Licensed blocks included" },
  { name: "Scale", price: "$99", note: "SSO and audit logs" },
  { name: "Enterprise", price: "Talk to us", note: "Your registry, your terms" },
];

const meta = {
  title: "Display/Carousel",
  component: Carousel,
  args: {
    label: "Plans",
    itemsPerView: 1,
    gap: 16,
    loop: false,
    autoplay: false,
    interval: 5000,
    orientation: "horizontal",
  },
  argTypes: {
    itemsPerView: { control: { type: "range", min: 1, max: 4, step: 1 } },
    gap: { control: { type: "range", min: 0, max: 48, step: 4 } },
    interval: { control: { type: "range", min: 1000, max: 10000, step: 500 } },
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

function PlanCard({ plan }: { plan: (typeof PLANS)[number] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.note}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-card-foreground">{plan.price}</p>
      </CardContent>
    </Card>
  );
}

/** One at a time, with previous, next and the position. Swipe it on a touch screen. */
export const Default: Story = {
  render: (args) => (
    <Carousel {...args} className="w-[min(24rem,90vw)]">
      <CarouselViewport>
        {PLANS.map((plan) => (
          <CarouselItem key={plan.name}>
            <PlanCard plan={plan} />
          </CarouselItem>
        ))}
      </CarouselViewport>
      <div className="flex items-center justify-between">
        <CarouselPrevious />
        <CarouselDots />
        <CarouselNext />
      </div>
    </Carousel>
  ),
};

/** Three at a time, stepping one by one; the dots count positions, not items. */
export const SeveralAtOnce: Story = {
  args: { label: "Plans", itemsPerView: 3, gap: 12 },
  render: (args) => (
    <Carousel {...args} className="w-[min(48rem,92vw)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Compare plans</h3>
        <div className="flex gap-2">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </div>
      <CarouselViewport>
        {PLANS.map((plan) => (
          <CarouselItem key={plan.name}>
            <PlanCard plan={plan} />
          </CarouselItem>
        ))}
      </CarouselViewport>
      <CarouselDots />
    </Carousel>
  ),
};

/**
 * Rotating, looping announcements. Rotation pauses while you point at it or
 * focus inside it, and the button stops it for good.
 */
export const Rotating: Story = {
  args: { label: "Announcements", autoplay: true, loop: true, interval: 4000 },
  render: (args) => (
    <Carousel {...args} className="w-[min(32rem,90vw)]">
      <CarouselViewport className="rounded-xl border border-border bg-card">
        {[
          ["New", "Background studio: fourteen WebGL scenes and an aurora."],
          ["Docs", "Every component page now has live controls."],
          ["CLI", "Hooks install into your project's hooks folder."],
        ].map(([tag, text]) => (
          <CarouselItem key={text} className="flex items-center gap-3 p-4">
            <Badge variant="secondary">{tag}</Badge>
            <p className="text-sm text-card-foreground">{text}</p>
          </CarouselItem>
        ))}
      </CarouselViewport>
      <div className="flex items-center justify-center gap-1">
        <CarouselPlayPause />
        <CarouselDots />
      </div>
    </Carousel>
  ),
};

/** A column: give the viewport a height that fits the items, and the arrow keys go up and down. */
export const Vertical: Story = {
  args: { label: "Plans", orientation: "vertical", itemsPerView: 2, gap: 12 },
  render: (args) => (
    <Carousel {...args} className="w-72">
      <CarouselPrevious className="self-center" />
      <CarouselViewport className="h-[19.5rem]">
        {PLANS.map((plan) => (
          <CarouselItem key={plan.name}>
            <PlanCard plan={plan} />
          </CarouselItem>
        ))}
      </CarouselViewport>
      <CarouselNext className="self-center" />
    </Carousel>
  ),
};
