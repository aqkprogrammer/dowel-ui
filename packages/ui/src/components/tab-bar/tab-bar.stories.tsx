import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { TabBar } from "./tab-bar";

const meta = {
  title: "Navigation/Tab Bar",
  component: TabBar,
  args: { "aria-label": "Sections", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a tab or use the arrow keys: the highlight slides and stretches. */
export const Default: Story = {};

const SEQUENCE = ["home", "search", "saved", "profile"];

function TileDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((value) => (value + 1) % SEQUENCE.length);
    }, 750);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-foreground">
      <TabBar aria-label="Sections" size="sm" value={SEQUENCE[step]} />
      <span className="text-lg font-medium">Tab Bar</span>
    </div>
  );
}

/** Plays itself, as in the reference tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TileDemo />,
};
