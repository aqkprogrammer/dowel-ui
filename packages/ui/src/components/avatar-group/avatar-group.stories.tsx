import type { Meta, StoryObj } from "@storybook/react-vite";

import { AvatarGroup, type AvatarGroupItem } from "./avatar-group";

const NAMES = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Katherine Johnson",
  "Edsger Dijkstra",
  "Barbara Liskov",
  "Donald Knuth",
  "Margaret Hamilton",
];

const PEOPLE: AvatarGroupItem[] = NAMES.map((name) => ({
  name,
  src: `https://picsum.photos/seed/${name.split(" ")[0]?.toLowerCase() ?? "person"}/96/96`,
}));

const meta: Meta<typeof AvatarGroup> = {
  title: "Display/Avatar Group",
  component: AvatarGroup,
  args: {
    avatars: PEOPLE,
    max: 4,
    size: "md",
    overlap: 0.3,
    expand: "hover",
    "aria-label": "Contributors",
  },
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    expand: { control: "select", options: ["hover", "none"] },
    overlap: { control: { type: "range", min: 0, max: 0.8, step: 0.05 } },
    avatars: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * SmoothUI Animated Avatar Group, both demo instances: the default (four
 * visible at 40px, "+4") and `maxVisible={6} size={48}` — `size="lg"` here.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-12">
      <figure className="flex flex-col items-center gap-3">
        <AvatarGroup aria-label="Contributors" avatars={PEOPLE} />
        <figcaption className="text-xs text-muted-foreground">
          Animated Avatar Group — default
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <AvatarGroup aria-label="Contributors" avatars={PEOPLE} max={6} size="lg" />
        <figcaption className="text-xs text-muted-foreground">
          Animated Avatar Group — maxVisible 6, size 48
        </figcaption>
      </figure>
    </div>
  ),
};

/** Linked avatars are real links; tab through them and the group spreads for focus too. */
export const Linked: Story = {
  args: {
    avatars: PEOPLE.map((person) => ({ ...person, href: "#" })),
  },
};

/** Without images the initials fallback shows; the name stays available to screen readers. */
export const Initials: Story = {
  args: {
    avatars: NAMES.map((name) => ({ name })),
    max: 5,
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-6">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
        <AvatarGroup
          key={size}
          aria-label={`Contributors, ${size}`}
          avatars={PEOPLE}
          size={size}
        />
      ))}
    </div>
  ),
};
