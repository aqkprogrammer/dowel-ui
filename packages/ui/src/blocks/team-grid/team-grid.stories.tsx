import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { TeamGridBlock, type TeamGridMember } from "./team-grid";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[76rem] max-w-full">
    <Story />
  </div>
);

/** Placeholder portraits from seeded picsum images — stories only, never in the block. */
const MEMBERS: TeamGridMember[] = [
  {
    name: "Ada Park",
    role: "Founder and CEO",
    location: "Lisbon",
    avatar: "https://picsum.photos/seed/dowel-ada/400/372",
  },
  {
    name: "Tomás Reyes",
    role: "Head of Design",
    location: "Mexico City",
    avatar: "https://picsum.photos/seed/dowel-tomas/400/372",
  },
  {
    name: "Noor Haddad",
    role: "Staff Engineer",
    location: "Amman",
    avatar: "https://picsum.photos/seed/dowel-noor/400/372",
  },
  {
    name: "Mika Lehtonen",
    role: "Product Manager",
    location: "Helsinki",
    avatar: "https://picsum.photos/seed/dowel-mika/400/372",
  },
];

const meta: Meta<typeof TeamGridBlock> = {
  title: "Blocks/Team grid",
  component: TeamGridBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof TeamGridBlock>;

/** SmoothUI "Team 1": four members with large portraits. */
export const Default: Story = {
  args: { members: MEMBERS },
};

/** Every source item: SmoothUI "Team 1" (Team Grid), with initials in place of its photographs. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <TeamGridBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI Team 1 — Team Grid (photographs replaced by the initials fallback)
      </figcaption>
    </figure>
  ),
};

/** With bios, and a portrait that fails to load and falls back to initials. */
export const WithBios: Story = {
  args: {
    members: [
      { ...MEMBERS[0]!, bio: "Started the company after a decade building design systems." },
      {
        ...MEMBERS[1]!,
        avatar: "https://invalid.example/missing.png",
        bio: "Draws everything twice.",
      },
      { ...MEMBERS[2]!, bio: "Keeps the build fast." },
    ],
  },
};
