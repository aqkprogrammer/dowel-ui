import type { Meta, StoryObj } from "@storybook/react-vite";

import { Artifact } from "./ai-artifact";

const CODE = `export const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export const sum = (a: number, b: number) => a + b;`;

const PREVIEW = (
  <div className="flex flex-col gap-2 text-sm">
    <p className="text-foreground">
      <code className="font-mono text-xs">clamp(12, 0, 10)</code> → 10
    </p>
    <p className="text-foreground">
      <code className="font-mono text-xs">sum(2, 3)</code> → 5
    </p>
  </div>
);

const meta: Meta<typeof Artifact> = {
  title: "AI/Artifact",
  component: Artifact,
  args: { title: "utils.ts", code: CODE, copyValue: CODE, preview: PREVIEW },
  argTypes: { defaultPane: { control: "inline-radio", options: ["preview", "code"] } },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-full max-w-lg">
      <Artifact {...args} />
    </div>
  ),
};

/** SmoothUI "AI Artifact": preview sits before code, so the swap has a direction. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <p className="text-xs text-muted-foreground">SmoothUI — AI Artifact</p>
      <Artifact title="utils.ts" code={CODE} copyValue={CODE} preview={PREVIEW} />
      <p className="text-xs text-muted-foreground">Code only</p>
      <Artifact title="utils.ts" code={CODE} copyValue={CODE} />
    </div>
  ),
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" className="w-full max-w-lg">
      <Artifact {...args} />
    </div>
  ),
};
