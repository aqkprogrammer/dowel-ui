import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { DEFAULT_TEAM_CAROUSEL, TeamCarouselBlock } from "./team-carousel";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

/** Placeholder portraits from seeded picsum images — stories only, never in the block. */
const WITH_PORTRAITS = DEFAULT_TEAM_CAROUSEL.map((member, index) => ({
  ...member,
  avatar: `https://picsum.photos/seed/dowel-team-${String(index)}/160/160`,
}));

const meta: Meta<typeof TeamCarouselBlock> = {
  title: "Blocks/Team carousel",
  component: TeamCarouselBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof TeamCarouselBlock>;

/** SmoothUI "Team 2": swipe, scroll, or step with the buttons. */
export const Default: Story = {
  args: { members: WITH_PORTRAITS },
};

/** Every source item: SmoothUI "Team 2" (Team Carousel), with initials in place of its photographs. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <TeamCarouselBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Team 2 — Team Carousel (photographs replaced by the initials fallback; autoplay
        removed)
      </figcaption>
    </figure>
  ),
};

/** Right to left: the track scrolls the other way and the arrows mirror. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <TeamCarouselBlock
        heading="فريقنا"
        subheading="يبني المستقبل"
        description={null}
        members={WITH_PORTRAITS}
        labels={{
          previous: "العضو السابق",
          next: "العضو التالي",
          track: "أعضاء الفريق",
          position: (index, count) => `${String(index + 1)} من ${String(count)}`,
        }}
      />
    </div>
  ),
};
