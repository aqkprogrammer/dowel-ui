import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { FaceId, type FaceIdStatus } from "./face-id";

const meta = {
  title: "Feedback/Face ID",
  component: FaceId,
  args: { status: "idle", size: "md", hideLabel: false },
  argTypes: {
    status: { control: "inline-radio", options: ["idle", "scanning", "success", "error"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof FaceId>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick a status from the controls. */
export const Default: Story = {};

const SEQUENCE: [FaceIdStatus, number][] = [
  ["scanning", 1000],
  ["success", 500],
  ["idle", 500],
];

function Loop() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const [, wait] = SEQUENCE[step] ?? SEQUENCE[0]!;
    const timer = setTimeout(() => setStep((current) => (current + 1) % SEQUENCE.length), wait);
    return () => clearTimeout(timer);
  }, [step]);
  return (
    <div className="dark flex size-56 flex-col items-center justify-center rounded-3xl bg-[#161618] p-10 text-white">
      <FaceId status={SEQUENCE[step]?.[0]} />
    </div>
  );
}

/** Scanning, unlocked, back to idle, on the reference's two-second loop. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Loop />,
};

/** Every state side by side. */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-10">
      <FaceId status="idle" />
      <FaceId status="scanning" />
      <FaceId status="success" />
      <FaceId status="error" />
    </div>
  ),
};
