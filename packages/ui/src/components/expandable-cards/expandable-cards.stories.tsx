import type { Meta, StoryObj } from "@storybook/react-vite";
import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";

import { ExpandableCards, type ExpandableCardItem } from "./expandable-cards";

function PlayButton({ title }: { title: string }) {
  return (
    <Button variant="secondary" size="sm" aria-label={`Play video: ${title}`}>
      <Play aria-hidden />
      Play video
    </Button>
  );
}

/* SmoothUI's demo cards, text verbatim; photographs and avatars are placeholders. */
const EVENTS: ExpandableCardItem[] = [
  {
    id: "summer-opening",
    title: "Summer Opening",
    image: "https://picsum.photos/seed/summer-opening/600/900",
    content:
      "Join us for the Summer Opening event, where we celebrate the start of a vibrant season filled with art and culture.",
    author: {
      name: "Eduardo Calvo",
      subtitle: "CEO & Founder",
      image: "https://picsum.photos/seed/eduardo/96/96",
    },
    actions: <PlayButton title="Summer Opening" />,
  },
  {
    id: "fashion",
    title: "Fashion",
    image: "https://picsum.photos/seed/fashion/600/900",
    content:
      "Explore the latest trends in fashion at our exclusive showcase, featuring renowned designers and unique styles.",
    author: {
      name: "Sarah Chen",
      subtitle: "Head of Design",
      image: "https://picsum.photos/seed/sarah/96/96",
    },
    actions: <PlayButton title="Fashion" />,
  },
  {
    id: "gallery-art",
    title: "Gallery Art",
    image: "https://picsum.photos/seed/gallery-art/600/900",
    content:
      "Immerse yourself in the world of art at our gallery, showcasing stunning pieces from emerging and established artists.",
    author: {
      name: "Marcus Johnson",
      subtitle: "Lead Developer",
      image: "https://picsum.photos/seed/marcus/96/96",
    },
    actions: <PlayButton title="Gallery Art" />,
  },
  {
    id: "dreams",
    title: "Dreams",
    image: "https://picsum.photos/seed/dreams/600/900",
    content:
      "Join us on a journey through dreams, exploring the subconscious and the art of dreaming.",
    author: {
      name: "Emily Rodriguez",
      subtitle: "Product Manager",
      image: "https://picsum.photos/seed/emily/96/96",
    },
    actions: <PlayButton title="Dreams" />,
  },
];

const meta = {
  title: "Display/Expandable Cards",
  component: ExpandableCards,
  args: {
    items: EVENTS,
    presentation: "inline",
  },
  argTypes: {
    presentation: { control: "inline-radio", options: ["inline", "dialog"] },
    items: { control: false },
  },
} satisfies Meta<typeof ExpandableCards>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-12">
      <figure className="flex flex-col gap-3">
        <ExpandableCards items={EVENTS} />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Expandable Cards (the card widens in its row)
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-3">
        <ExpandableCards items={EVENTS} presentation="dialog" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Expandable Cards, as a dialog (the card grows into a modal)
        </figcaption>
      </figure>
    </div>
  ),
};

/** The demo drove the component through `selectedCard`/`onSelect`; here that is `value`/`onValueChange`. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [value, setValue] = useState<string | null>("fashion");
    return (
      <div className="flex flex-col gap-3">
        <ExpandableCards items={EVENTS} value={value} onValueChange={setValue} />
        <p className="text-sm text-muted-foreground">Open: {value ?? "none"}</p>
      </div>
    );
  },
};

export const AsDialog: Story = {
  args: { presentation: "dialog" },
};
