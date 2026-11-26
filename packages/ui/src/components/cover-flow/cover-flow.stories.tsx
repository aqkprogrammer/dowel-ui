import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { CoverFlow } from "./cover-flow";

function Card({ title }: { title: string }) {
  return (
    <div className="flex size-full flex-col gap-2 p-2">
      <div className="aspect-[4/3] rounded-md bg-muted" />
      <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/40" />
      <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/25" />
      <span className="sr-only">{title}</span>
    </div>
  );
}

const CARDS = ["Aurora", "Basalt", "Cinder", "Drift", "Ember"];
const PING_PONG = [2, 3, 4, 3, 2, 1, 0, 1];

const meta = {
  title: "Display/Cover Flow",
  component: CoverFlow,
  args: { size: "md", className: "w-96" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
  render: (args) => (
    <CoverFlow {...args}>
      {CARDS.map((title) => (
        <Card key={title} title={title} />
      ))}
    </CoverFlow>
  ),
} satisfies Meta<typeof CoverFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Five cards, centred on the middle one. Focus the stack and use the arrow keys. */
export const Default: Story = {};

/** Steps back and forth on its own, on a dark tile like the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: function Demo() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
      const timer = setInterval(() => setTick((value) => value + 1), 900);
      return () => clearInterval(timer);
    }, []);
    const index = PING_PONG[tick % PING_PONG.length] ?? 2;
    return (
      <div className="dark flex size-72 items-center justify-center rounded-3xl bg-[#161618] p-10">
        <CoverFlow size="sm" className="w-full" index={index}>
          {CARDS.map((title) => (
            <Card key={title} title={title} />
          ))}
        </CoverFlow>
      </div>
    );
  },
};

/** Wraps past the ends. */
export const Looping: Story = { args: { loop: true } };
