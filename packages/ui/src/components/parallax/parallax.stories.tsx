import type { Meta, StoryObj } from "@storybook/react-vite";

import { Parallax } from "./parallax";

const meta = {
  title: "Effects/Parallax",
  component: Parallax,
  args: { speed: 0.2, axis: "vertical", max: 200 },
  argTypes: {
    speed: { control: { type: "range", min: -1, max: 1, step: 0.05 } },
    max: { control: { type: "range", min: 0, max: 600, step: 10 } },
    axis: { control: "inline-radio", options: ["vertical", "horizontal"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Parallax>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three layers at three speeds behind a heading: scroll to feel the depth. */
export const Default: Story = {
  render: (args) => (
    <div>
      <div className="h-[60vh]" />
      <section className="relative grid h-[80vh] place-items-center overflow-hidden bg-background">
        <Parallax {...args} speed={0.5} className="absolute inset-0" layerClassName="h-full">
          <div className="absolute start-[10%] top-[20%] size-40 rounded-full bg-primary/15 blur-2xl" />
        </Parallax>
        <Parallax {...args} speed={0.25} className="absolute inset-0" layerClassName="h-full">
          <div className="absolute end-[12%] top-[35%] size-56 rounded-full bg-info/15 blur-2xl" />
        </Parallax>
        <Parallax {...args} speed={-0.15} className="absolute inset-0" layerClassName="h-full">
          <div className="absolute start-[40%] bottom-[15%] size-24 rounded-2xl border border-border bg-card shadow-lg" />
        </Parallax>
        <h2 className="relative text-4xl font-semibold tracking-tight text-foreground">
          Depth, for free
        </h2>
      </section>
      <div className="h-[80vh]" />
    </div>
  ),
};
