import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { UploadButton, type UploadButtonStatus } from "./upload-button";

const meta = {
  title: "Form/Upload Button",
  component: UploadButton,
  args: { size: "md", label: "Upload" },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof UploadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press it: the ring fills on its own, then the check draws and the pill comes back. */
export const Default: Story = {};

/** Plays itself every two seconds, on a dark tile, with the pink accent the reference picks up. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: function Demo() {
    const [status, setStatus] = useState<UploadButtonStatus>("idle");
    useEffect(() => {
      if (status !== "idle") return;
      const timer = setTimeout(() => setStatus("uploading"), 700);
      return () => clearTimeout(timer);
    }, [status]);
    return (
      <div className="dark flex size-64 items-center justify-center rounded-3xl bg-[#161618] p-10">
        <UploadButton
          status={status}
          onStatusChange={setStatus}
          duration={700}
          accent="#f0b8e4"
          size="lg"
        />
      </div>
    );
  },
};

/** Real progress: the ring follows `progress`, and closes when it reaches 1. */
export const RealProgress: Story = {
  parameters: { controls: { disable: true } },
  render: function RealProgress() {
    const [status, setStatus] = useState<UploadButtonStatus>("idle");
    const [progress, setProgress] = useState(0);
    useEffect(() => {
      if (status !== "uploading") return;
      const timer = setInterval(() => setProgress((p) => Math.min(1, p + 0.2)), 400);
      return () => clearInterval(timer);
    }, [status]);
    return (
      <UploadButton
        status={status}
        progress={progress}
        onStatusChange={(next) => {
          if (next === "uploading") setProgress(0);
          setStatus(next);
        }}
      />
    );
  },
};

/** Three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <UploadButton size="sm" />
      <UploadButton size="md" />
      <UploadButton size="lg" />
    </div>
  ),
};
