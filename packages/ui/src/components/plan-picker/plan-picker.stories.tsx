import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { PlanPicker } from "./plan-picker";

const meta = {
  title: "Form/Plan Picker",
  component: PlanPicker,
  args: { size: "md" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PlanPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SEQUENCE = ["basic", "team", "pro", "basic", "pro", "team"];

function Demo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStep((current) => (current + 1) % SEQUENCE.length);
    }, 750);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark flex size-64 flex-col items-center justify-center gap-10 rounded-3xl bg-[#161618] p-10 text-white">
      <PlanPicker
        size="sm"
        value={SEQUENCE[step]}
        onValueChange={(next) => setStep(SEQUENCE.indexOf(next))}
      />
      <span className="text-sm font-medium">Plan Picker</span>
    </div>
  );
}

/** Plays itself like the reference tile, the outline hopping between cards. */
export const DemoStory: Story = {
  name: "Demo",
  parameters: { controls: { disable: true } },
  render: () => <Demo />,
};

/** Four plans, one unavailable, at the large size. */
export const CustomPlans: Story = {
  args: {
    size: "lg",
    defaultValue: "pro",
    plans: [
      { value: "hobby", label: "Hobby", price: "Free" },
      { value: "pro", label: "Pro", price: "$8/mo" },
      { value: "team", label: "Team", price: "$20/mo" },
      { value: "enterprise", label: "Enterprise", price: "Talk to us", disabled: true },
    ],
  },
};
