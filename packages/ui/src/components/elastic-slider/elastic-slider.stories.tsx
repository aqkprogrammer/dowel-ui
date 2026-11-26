import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { ElasticSlider } from "./elastic-slider";

const meta = {
  title: "Form/Elastic Slider",
  component: ElasticSlider,
  args: { size: "md", defaultValue: 12, "aria-label": "Volume" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    ticks: { control: { type: "number", min: 0, max: 21 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ElasticSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The values the reference steps through, a quarter second apart. */
const SEQUENCE = [12, 22, 78, 92, 92, 82, 26, 12];

function Demo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((current) => (current + 1) % SEQUENCE.length);
    }, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-56 flex-col items-center justify-center gap-6 rounded-3xl bg-[#161618] p-10 text-white [--color-background:#161618]">
      <ElasticSlider aria-label="Level" value={SEQUENCE[step] ?? 12} />
      <span className="text-sm font-medium">Elastic Slider</span>
    </div>
  );
}

/** Plays itself like the reference tile. */
export const DemoStory: Story = {
  name: "Demo",
  parameters: { controls: { disable: true } },
  render: () => <Demo />,
};

/** With units, spoken and shown. */
export const WithUnits: Story = {
  args: {
    size: "lg",
    defaultValue: 40,
    className: "w-64",
    formatValue: (value: number) => `${String(value)}%`,
  },
};
