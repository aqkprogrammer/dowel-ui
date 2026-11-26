import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { AlignToggle, type Alignment } from "./align-toggle";

const meta = {
  title: "Form/Align Toggle",
  component: AlignToggle,
  args: { size: "md", defaultValue: "start" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    preview: { control: "boolean" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof AlignToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SEQUENCE: Alignment[] = ["end", "center", "start", "center"];

function Demo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((current) => (current + 1) % SEQUENCE.length);
    }, 750);
    return () => clearInterval(id);
  }, []);
  const value = SEQUENCE[step] ?? "end";
  return (
    <div className="dark flex size-56 flex-col items-center justify-center gap-8 rounded-3xl bg-[#161618] p-10 text-white">
      <AlignToggle value={value} onValueChange={(next) => setStep(SEQUENCE.indexOf(next))} />
      <span className="text-sm font-medium">Alignment</span>
    </div>
  );
}

/** Plays itself like the reference tile: end, center, start and back. */
export const DemoStory: Story = {
  name: "Demo",
  parameters: { controls: { disable: true } },
  render: () => <Demo />,
};

/** Without the preview, at three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-8">
      <AlignToggle size="sm" preview={false} />
      <AlignToggle size="md" preview={false} defaultValue="center" />
      <AlignToggle size="lg" preview={false} defaultValue="end" />
    </div>
  ),
};
