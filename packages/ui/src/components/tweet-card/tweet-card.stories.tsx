import type { Meta, StoryObj } from "@storybook/react-vite";

import { TweetCard, TweetCardSkeleton, type TweetCardProps } from "./tweet-card";

const POST: TweetCardProps = {
  author: {
    name: "Grace Hopper",
    handle: "gracehopper",
    avatar: "https://picsum.photos/seed/grace/80/80",
    verified: true,
  },
  text: "Shipped the new compiler today. It is much easier to apologise than to get permission. Notes at https://example.com/notes #compilers @dowel",
  href: "https://x.com/gracehopper/status/1",
  timestamp: "2026-03-14T09:30:00Z",
  metrics: { replies: 42, reposts: 318, likes: 5120, views: 88000 },
};

const WITH_PHOTO: TweetCardProps = {
  ...POST,
  author: {
    name: "Katherine Johnson",
    handle: "kjohnson",
    avatar: "https://picsum.photos/seed/katherine/80/80",
  },
  text: "Trajectory checked by hand, again. Sunrise from the launch site this morning.",
  media: [
    { src: "https://picsum.photos/seed/launch/600/400", alt: "Sunrise over a launch pad" },
  ],
};

const meta: Meta<typeof TweetCard> = {
  title: "Display/Tweet Card",
  component: TweetCard,
  args: { ...POST, userInfoPosition: "bottom", avatarShape: "rounded" },
  argTypes: {
    userInfoPosition: { control: "select", options: ["top", "bottom"] },
    avatarShape: {
      control: "select",
      options: ["circle", "rounded", "rounded-md", "rounded-lg"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every source demo this component reproduces. The source fetched posts by id
 * through react-tweet; here each one is written as props.
 *
 * - "Tweet Card" (default: author at the bottom, rounded avatar) and the
 *   second card (author at the top, circular avatar).
 * - "Tweet Card · Top" → `userInfoPosition="top"`.
 * - "Tweet Card · Avatars" → `avatarShape` rounded / circle / rounded-lg /
 *   rounded-md.
 * - `TweetSkeleton` → `TweetCardSkeleton`. `TweetNotFound` is not ported:
 *   with no fetch there is nothing to fail.
 * - Photo layouts for one, two, three and four images.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  decorators: [(Story) => <Story />],
  render: () => {
    const photo = (seed: string) => ({
      src: `https://picsum.photos/seed/${seed}/600/400`,
      alt: `Placeholder photo ${seed}`,
    });
    return (
      <div className="grid max-w-5xl gap-10">
        <section className="grid gap-3">
          <h3 className="text-xs text-muted-foreground">SmoothUI · Tweet Card</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <TweetCard {...POST} />
            <TweetCard {...WITH_PHOTO} avatarShape="circle" userInfoPosition="top" />
          </div>
        </section>
        <section className="grid gap-3">
          <h3 className="text-xs text-muted-foreground">SmoothUI · Tweet Card (top)</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <TweetCard {...POST} userInfoPosition="top" />
            <TweetCard {...WITH_PHOTO} userInfoPosition="top" avatarShape="circle" />
          </div>
        </section>
        <section className="grid gap-3">
          <h3 className="text-xs text-muted-foreground">SmoothUI · Tweet Card (avatars)</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <TweetCard {...POST} avatarShape="rounded" />
            <TweetCard {...WITH_PHOTO} avatarShape="circle" />
            <TweetCard {...POST} avatarShape="rounded-lg" />
            <TweetCard {...WITH_PHOTO} avatarShape="rounded-md" />
          </div>
        </section>
        <section className="grid gap-3">
          <h3 className="text-xs text-muted-foreground">Photo layouts and skeleton</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <TweetCard {...POST} media={[photo("a"), photo("b")]} />
            <TweetCard {...POST} media={[photo("c"), photo("d"), photo("e")]} />
            <TweetCard {...POST} media={[photo("f"), photo("g"), photo("h"), photo("i")]} />
            <TweetCardSkeleton />
          </div>
        </section>
      </div>
    );
  },
};
