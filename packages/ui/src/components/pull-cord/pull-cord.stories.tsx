import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { PullCord } from "./pull-cord";

const meta = {
  title: "Form/Pull Cord",
  component: PullCord,
  args: { size: "md", "aria-label": "Desk lamp" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    glow: { control: "color" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PullCord>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Demo() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setOn((current) => !current);
    }, 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-56 flex-col items-center justify-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <PullCord aria-label="Lamp" checked={on} onCheckedChange={setOn} glow="#f5c45e" />
      <span className="text-sm font-medium">Pull Cord</span>
    </div>
  );
}

/** Plays itself like the reference tile: the cord is pulled every 1.5 seconds. */
export const DemoStory: Story = {
  name: "Demo",
  parameters: { controls: { disable: true } },
  render: () => <Demo />,
};

/** Three sizes, with a cool light. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-8">
      <PullCord size="sm" aria-label="Small lamp" defaultChecked />
      <PullCord size="md" aria-label="Medium lamp" defaultChecked glow="#7dd3fc" />
      <PullCord size="lg" aria-label="Large lamp" />
    </div>
  ),
};
