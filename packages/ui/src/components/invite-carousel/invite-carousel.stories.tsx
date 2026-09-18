import type { Meta, StoryObj } from "@storybook/react-vite";
import { Crown } from "lucide-react";
import { useState } from "react";

import { InviteCarousel, type InviteCarouselEvent } from "./invite-carousel";

/** Neutral placeholders built from theme tokens — no photographs. */
const gradients = [
  "bg-linear-to-br from-primary to-accent",
  "bg-linear-to-br from-info to-muted",
  "bg-linear-to-br from-success to-secondary",
  "bg-linear-to-br from-warning to-muted",
];

function avatar(seed: string) {
  return { avatar: `https://picsum.photos/seed/${seed}/600/400`, name: seed };
}

/** SmoothUI's Apple Invites demo, with its photographs replaced by gradients. */
const events: InviteCarouselEvent[] = [
  {
    id: 1,
    badge: "Hosting",
    badgeIcon: <Crown />,
    title: "Yoga",
    subtitle: "Sat, June 14, 6:00 AM",
    location: "Central Park",
    participants: [avatar("Amara")],
    background: <div className={`size-full ${gradients[0] ?? ""}`} />,
  },
  {
    id: 2,
    badge: "Going",
    badgeIcon: <Crown />,
    title: "Tyler Turns 3!",
    subtitle: "Sat, June 14, 3:00 PM",
    location: "Central Park",
    participants: [avatar("Tyler")],
    background: <div className={`size-full ${gradients[1] ?? ""}`} />,
  },
  {
    id: 3,
    badge: "Going",
    badgeIcon: <Crown />,
    title: "Golf party",
    subtitle: "Sun, April 15, 9:00 AM",
    location: "Golf Park",
    participants: [avatar("Noor")],
    background: <div className={`size-full ${gradients[2] ?? ""}`} />,
  },
  {
    id: 4,
    badge: "Interested",
    badgeIcon: <Crown />,
    title: "Movie Night",
    subtitle: "Fri, June 20, 8:00 PM",
    location: "Cine Town",
    participants: [avatar("Kofi")],
    background: <div className={`size-full ${gradients[3] ?? ""}`} />,
  },
];

const meta = {
  title: "Display/Invite Carousel",
  component: InviteCarousel,
  args: {
    events,
    autoPlay: true,
    interval: 3000,
    cardWidth: "15rem",
    aspectRatio: 1.5625,
    showNavigation: true,
  },
  argTypes: {
    events: { control: false },
  },
} satisfies Meta<typeof InviteCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Apple Invites": four invitations, rotating every three seconds. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Apple Invites" demo → the four events above, with its responsive
 *   `cardWidth` breakpoint object (100 → 260px) expressed as one CSS `clamp()`.
 *   The card's type scales with its width through container units, as the
 *   source's scale factor did.
 * - Its `activeIndex` / `onChange` props → `index` / `onIndexChange` (see
 *   Controlled).
 * - Its always-on timer → `autoPlay`, on by default, now with a stop control.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex w-full flex-col items-center gap-2">
      <InviteCarousel events={events} cardWidth="clamp(6.25rem, 22vw, 16.25rem)" />
      <figcaption className="text-xs text-muted-foreground">
        SmoothUI Apple Invites — responsive card width
      </figcaption>
    </figure>
  ),
};

export const WithImages: Story = {
  args: {
    events: events.map((event, index) => ({
      ...event,
      background: undefined,
      image: `https://picsum.photos/seed/invite${String(index)}/600/400`,
    })),
  },
};

export const Manual: Story = {
  args: { autoPlay: false },
};

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [index, setIndex] = useState(0);
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <InviteCarousel
          events={events}
          index={index}
          onIndexChange={setIndex}
          autoPlay={false}
        />
        <p className="text-sm text-muted-foreground">Showing invitation {index + 1}</p>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div dir="rtl" className="w-full">
      <InviteCarousel events={events} autoPlay={false} />
    </div>
  ),
};
