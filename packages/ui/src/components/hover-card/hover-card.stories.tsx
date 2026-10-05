import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDays, MapPin, Star } from "lucide-react";

import { HoverCard, HoverCardArrow, HoverCardContent, HoverCardTrigger } from "./hover-card";

const meta = {
  title: "Overlays/Hover Card",
  component: HoverCard,
  parameters: { layout: "centered", controls: { disable: true } },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
    >
      {initials}
    </span>
  );
}

/** Hover or tab to the handle: the card swells out of the link and its lines rise in behind it. */
export const Default: Story = {
  render: () => (
    <p className="max-w-sm text-sm text-muted-foreground">
      The analytical engine notes were written by{" "}
      <HoverCard>
        <HoverCardTrigger
          href="https://en.wikipedia.org/wiki/Ada_Lovelace"
          className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          @ada
        </HoverCardTrigger>
        <HoverCardContent stagger size="lg">
          <div className="flex items-center gap-3">
            <Avatar initials="AL" />
            <div>
              <p className="font-semibold text-foreground">Ada Lovelace</p>
              <p className="text-muted-foreground">@ada</p>
            </div>
          </div>
          <p className="mt-3 text-foreground">
            Mathematician. Wrote the first published algorithm for a machine, in 1843.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              London
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Joined 1833
            </span>
          </div>
          <HoverCardArrow />
        </HoverCardContent>
      </HoverCard>{" "}
      in the margins of a translation.
    </p>
  ),
};

/** The origin follows the side Radix chooses, so the card grows out of the trigger from any side. */
export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <HoverCard key={side} openDelay={150}>
          <HoverCardTrigger
            href={`#${side}`}
            className="rounded-md border border-border px-3 py-2 text-center text-sm"
          >
            {side}
          </HoverCardTrigger>
          <HoverCardContent side={side} size="sm">
            Grown from the {side}.
            <HoverCardArrow />
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
};

/** A repository preview, without the stagger: the card arrives as one piece. */
export const Repository: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger
        href="https://github.com/radix-ui/primitives"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        radix-ui/primitives
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="font-semibold">radix-ui/primitives</p>
        <p className="mt-1 text-muted-foreground">
          Unstyled, accessible components for building design systems.
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3.5" aria-hidden="true" />
          16k stars
        </p>
      </HoverCardContent>
    </HoverCard>
  ),
};
