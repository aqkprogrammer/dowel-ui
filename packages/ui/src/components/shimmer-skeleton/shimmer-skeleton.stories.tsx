import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShimmerSkeleton, ShimmerSkeletonShape } from "./shimmer-skeleton";

const meta = {
  title: "Feedback/Shimmer Skeleton",
  component: ShimmerSkeleton,
  args: { size: "md", label: "Loading", shimmer: true },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ShimmerSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The preset card: avatar, two lines and a media block. */
export const Default: Story = {};

/** On a dark tile, as in the reference: the sheen sweeps every two seconds. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <ShimmerSkeleton size="sm" />
      <span className="text-sm font-medium">Skeleton</span>
    </div>
  ),
};

/** Compose shapes for any other layout. */
export const CustomLayout: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <ShimmerSkeleton size="lg" label="Loading article">
      <span className="flex flex-col gap-[0.6em]">
        <ShimmerSkeletonShape shape="block" className="h-[6em]" />
        <ShimmerSkeletonShape />
        <ShimmerSkeletonShape />
        <ShimmerSkeletonShape className="w-1/2" />
      </span>
    </ShimmerSkeleton>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <ShimmerSkeleton size="sm" />
      <ShimmerSkeleton size="md" />
      <ShimmerSkeleton size="lg" />
    </div>
  ),
};
