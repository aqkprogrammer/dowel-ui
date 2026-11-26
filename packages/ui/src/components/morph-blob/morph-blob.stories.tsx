import type { Meta, StoryObj } from "@storybook/react-vite";

import { MorphBlob } from "./morph-blob";

const meta = {
  title: "Effects/Morph Blob",
  component: MorphBlob,
  args: { size: "md" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    duration: { control: { type: "number", min: 0.5, max: 10, step: 0.5 } },
    paused: { control: "boolean" },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MorphBlob>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** As in the reference tile: a white blob on a dark tile. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex size-56 flex-col items-center justify-center gap-10 rounded-3xl bg-[#161618] p-10 text-white">
      <MorphBlob size="md" className="bg-white" />
      <span className="text-sm font-medium">Morph</span>
    </div>
  ),
};

/** Tinted with a class, at three sizes. */
export const Tinted: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      <MorphBlob size="sm" className="bg-primary" />
      <MorphBlob size="md" className="bg-pink-400" duration={3} />
      <MorphBlob size="lg" className="bg-cyan-400" duration={4} />
    </div>
  ),
};
