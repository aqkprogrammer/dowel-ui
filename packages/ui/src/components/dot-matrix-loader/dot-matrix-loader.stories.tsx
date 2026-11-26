import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  DOT_MATRIX_LOADER_PATTERNS,
  DOT_MATRIX_LOADER_TONES,
  DotMatrixLoader,
} from "./dot-matrix-loader";

const meta = {
  title: "AI/Dot Matrix Loader",
  component: DotMatrixLoader,
  args: { label: "Thinking", pattern: "ring", size: "md", shimmer: true },
  argTypes: {
    pattern: { control: "select", options: [...DOT_MATRIX_LOADER_PATTERNS] },
    tone: { control: "select", options: [undefined, ...DOT_MATRIX_LOADER_TONES] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof DotMatrixLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One pill. */
export const Default: Story = {};

/** All eight rhythms, each in its own tone, the way they were first shown. */
export const Patterns: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-x-6 gap-y-5 rounded-3xl bg-[#1b1b1d] p-10 sm:grid-cols-2">
      {DOT_MATRIX_LOADER_PATTERNS.map((pattern) => (
        <DotMatrixLoader key={pattern} pattern={pattern} />
      ))}
    </div>
  ),
};

/** One pattern in every tone. */
export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-5 sm:grid-cols-2">
      {DOT_MATRIX_LOADER_TONES.map((tone) => (
        <DotMatrixLoader key={tone} pattern="orbit" tone={tone} label={tone} />
      ))}
    </div>
  ),
};

/** The three sizes. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-5">
      <DotMatrixLoader size="sm" pattern="spiral" />
      <DotMatrixLoader size="md" pattern="spiral" />
      <DotMatrixLoader size="lg" pattern="spiral" />
    </div>
  ),
};
