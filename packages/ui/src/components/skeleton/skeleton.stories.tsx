import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card, CardContent, CardHeader } from "@/components/card";

import { Skeleton } from "./skeleton";

const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  ),
};

/** aria-busy belongs on the region that owns the data, not on each placeholder. */
export const LoadingCard: Story = {
  render: () => (
    <Card className="w-80" aria-busy="true" aria-label="Loading project">
      <CardHeader className="gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  ),
};

/**
 * `variant="shimmer"`: a band of light sweeps across instead of the pulse
 * (from the right in RTL). SmoothUI SkeletonLoader pulses — its look is the
 * default here; the shimmer is Dowel's opt-in alternative. Stops under reduced
 * motion.
 */
export const Shimmer: Story = {
  render: () => (
    <div className="flex w-80 items-center gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton variant="shimmer" className="size-10 shrink-0 rounded-full" />
      <div className="w-full space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-full" />
        <Skeleton variant="shimmer" className="h-4 w-3/5" />
      </div>
    </div>
  ),
};
