import type { Meta, StoryObj } from "@storybook/react-vite";

import { SiteHeaderBlock } from "./site-header";

const meta: Meta<typeof SiteHeaderBlock> = {
  title: "Blocks/Site header",
  component: SiteHeaderBlock,
  parameters: { layout: "fullscreen" },
  args: { variant: "default", behavior: "sticky" },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "floating", "glass"] },
    behavior: { control: "inline-radio", options: ["static", "sticky", "hide-on-scroll"] },
  },
  render: (args) => (
    <div className="min-h-[60rem]">
      <SiteHeaderBlock {...args} />
      <main id="content" className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">
        Hover or focus Product for the menu; narrow the window for the mobile list.
      </main>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A floating bar that slides away while reading and returns on scroll up. */
export const Floating: Story = { args: { variant: "floating", behavior: "hide-on-scroll" } };
