import type { Meta, StoryObj } from "@storybook/react-vite";

import { CardStack } from "./card-stack";

const meta = {
  title: "Display/Card Stack",
  component: CardStack,
  args: {
    variant: "deck",
    children: null,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["deck", "fan"] },
    spread: { control: { type: "range", min: 0, max: 100, step: 5 } },
    scatter: { control: { type: "range", min: 0, max: 100, step: 5 } },
    open: { control: "boolean" },
    children: { control: false },
  },
} satisfies Meta<typeof CardStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/* SmoothUI's demo cards: a picture, and the creator's profile link beneath it. */
const PEOPLE = [
  { id: "siriorb", name: "Edu Calvo", handle: "@educalvolpz" },
  { id: "richpopover", name: "Sarah Chen", handle: "@sarahchen" },
  { id: "sparkbites", name: "Marcus Johnson", handle: "@marcusjohnson" },
  { id: "svgl", name: "Emily Rodriguez", handle: "@emilyrodriguez" },
];

function ProfileCard({ person }: { person: (typeof PEOPLE)[number] }) {
  return (
    <article className="flex w-72 flex-col overflow-hidden rounded-2xl border-2 border-border bg-card shadow-lg sm:w-80">
      <img
        src={`https://picsum.photos/seed/${person.id}/600/400`}
        alt=""
        className="aspect-16/10 w-full object-cover"
        draggable={false}
      />
      <a
        href="/example"
        className="flex items-center justify-center gap-1.5 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset"
      >
        <img
          src={`https://picsum.photos/seed/${person.id}-face/40/40`}
          alt=""
          className="size-5 rounded-full ring-1 ring-border"
        />
        <span className="font-medium">{person.name}</span>
        <span className="text-muted-foreground">{person.handle}</span>
      </a>
    </article>
  );
}

const profiles = PEOPLE.map((person) => <ProfileCard key={person.id} person={person} />);

/* bencho's pile: plain numbered cards, so the motion is all there is to see. */
function NumberCard({ n }: { n: number }) {
  return (
    <div className="grid h-40 w-28 place-items-center rounded-xl border border-border bg-[linear-gradient(160deg,var(--color-card),var(--color-muted))] text-2xl font-semibold text-muted-foreground shadow-md">
      {n}
    </div>
  );
}

const numbers = [1, 2, 3, 4, 5].map((n) => <NumberCard key={n} n={n} />);

export const Default: Story = {
  args: { children: profiles, "aria-label": "Featured creators" },
};

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end justify-center gap-16">
      <figure className="flex flex-col items-center gap-3">
        <CardStack aria-label="Featured creators">{profiles}</CardStack>
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Scrollable Card Stack (wheel, swipe, arrows, dots)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <CardStack variant="fan" aria-label="Numbered cards" className="px-24 py-10">
          {numbers}
        </CardStack>
        <figcaption className="text-xs text-muted-foreground">
          bencho · Card stack (hover or focus to fan)
        </figcaption>
      </figure>
    </div>
  ),
};

/** bencho's controls: Spread is the width of the whole arc, Scatter how un-squared the pile is. */
export const Fan: Story = {
  args: {
    variant: "fan",
    spread: 55,
    scatter: 40,
    children: numbers,
    className: "px-24 py-10",
    "aria-label": "Numbered cards",
  },
};

export const FanWithSixCards: Story = {
  args: {
    variant: "fan",
    spread: 80,
    scatter: 70,
    children: [...numbers, <NumberCard key={6} n={6} />],
    className: "px-28 py-10",
  },
};

export const FanForcedOpen: Story = {
  args: { variant: "fan", open: true, children: numbers, className: "px-24 py-10" },
};

export const DeckStartingOnThird: Story = {
  args: { children: profiles, defaultIndex: 2 },
};
