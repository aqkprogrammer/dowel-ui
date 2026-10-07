import type { Meta, StoryObj } from "@storybook/react-vite";
import { RotateCcw } from "lucide-react";
import { useRef } from "react";

import { RadialIntro, type RadialIntroHandle, type RadialIntroItem } from "./radial-intro";

const PEOPLE = [
  "Ada Lovelace",
  "Grace Hopper",
  "Katherine Johnson",
  "Margaret Hamilton",
  "Radia Perlman",
  "Hedy Lamarr",
  "Barbara Liskov",
  "Frances Allen",
];

const ITEMS: RadialIntroItem[] = PEOPLE.map((name) => ({
  id: name,
  src: `https://picsum.photos/seed/${name.split(" ")[0]?.toLowerCase() ?? "person"}/160/160`,
  alt: name,
}));

const meta = {
  title: "Display/Radial Intro",
  component: RadialIntro,
  args: {
    items: ITEMS,
    size: "md",
    orbit: true,
    orbitDuration: 40,
    stagger: 80,
    trigger: "mount",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    trigger: { control: "inline-radio", options: ["mount", "inView"] },
    items: { control: false },
    children: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadialIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

function TeamDemo(props: Partial<Parameters<typeof RadialIntro>[0]>) {
  const handle = useRef<RadialIntroHandle>(null);
  return (
    <div className="flex flex-col items-center gap-4">
      <RadialIntro items={ITEMS} handleRef={handle} {...props}>
        <div>
          <p className="text-2xl font-semibold tracking-tight">8</p>
          <p className="text-xs text-muted-foreground">people building Dowel</p>
        </div>
      </RadialIntro>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        onClick={() => handle.current?.replay()}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Replay
      </button>
    </div>
  );
}

/**
 * The stack spins out along a spiral into a ring, each avatar on its own
 * spring, then the ring orbits slowly with every face upright. Hover a face
 * to pause and see the name; press Replay to run it again.
 */
export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TeamDemo />,
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <RadialIntro size="sm" items={ITEMS.slice(0, 5)} />
      <RadialIntro size="lg" items={ITEMS} stagger={60} />
    </div>
  ),
};

/** A still ring: the intro plays, then nothing moves. */
export const NoOrbit: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TeamDemo orbit={false} />,
};

/** Waits below the fold and plays the first time it scrolls into view. */
export const InView: Story = {
  parameters: { controls: { disable: true }, layout: "padded" },
  render: () => (
    <div className="flex flex-col items-center">
      <p className="grid h-[120vh] place-items-center text-sm text-muted-foreground">
        Scroll down
      </p>
      <RadialIntro items={ITEMS} trigger="inView" />
    </div>
  ),
};

/** Driven by the controls panel. */
export const Playground: Story = {};
