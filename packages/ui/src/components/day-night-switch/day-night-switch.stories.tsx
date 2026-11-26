import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { DayNightSwitch } from "./day-night-switch";

const meta = {
  title: "Form/Day Night Switch",
  component: DayNightSwitch,
  args: { "aria-label": "Dark mode", size: "md", disabled: false },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DayNightSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flip it: the thumb squashes across and the sun sets into a moon. */
export const Default: Story = {};

function TileDemo() {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setNight((value) => !value);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className="dark flex w-64 flex-col items-center gap-10 rounded-3xl bg-[#161618] p-10 text-foreground">
      <DayNightSwitch aria-label="Dark mode" checked={night} onCheckedChange={setNight} />
      <span className="text-lg font-medium">Theme Switch</span>
    </div>
  );
}

/** Plays itself, as in the reference tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TileDemo />,
};

/** Three sizes, off and on. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-center justify-items-center gap-6 sm:grid-cols-2">
      <DayNightSwitch size="sm" aria-label="Small, day" />
      <DayNightSwitch size="sm" aria-label="Small, night" defaultChecked />
      <DayNightSwitch size="md" aria-label="Medium, day" />
      <DayNightSwitch size="md" aria-label="Medium, night" defaultChecked />
      <DayNightSwitch size="lg" aria-label="Large, day" />
      <DayNightSwitch size="lg" aria-label="Large, night" defaultChecked />
    </div>
  ),
};
