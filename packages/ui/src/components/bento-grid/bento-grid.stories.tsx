import type { Meta, StoryObj } from "@storybook/react-vite";

import { BentoGrid, BentoItem } from "./bento-grid";

const meta = {
  title: "Layout/Bento Grid",
  component: BentoGrid,
  args: { columns: 3, gap: 16, rowHeight: 180, dense: false },
  argTypes: {
    columns: { control: "inline-radio", options: [2, 3, 4, 6] },
    gap: { control: { type: "range", min: 0, max: 48, step: 2 } },
    rowHeight: { control: { type: "range", min: 80, max: 400, step: 10 } },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof BentoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col justify-end gap-1">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/** A feature section: one large tile, a tall one and several small. Narrow the window to see it stack. */
export const Default: Story = {
  render: (args) => (
    <BentoGrid {...args} className="mx-auto max-w-5xl">
      <BentoItem
        colSpan={2}
        rowSpan={2}
        className="bg-[radial-gradient(circle_at_80%_20%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_60%)]"
      >
        <Tile
          title="Source you own"
          body="Every component installs as code in your repository."
        />
      </BentoItem>
      <BentoItem rowSpan={2}>
        <Tile
          title="Accessible"
          body="Keyboard, screen readers and reduced motion, tested in CI."
        />
      </BentoItem>
      <BentoItem>
        <Tile title="Themeable" body="Thirteen OKLCH presets." />
      </BentoItem>
      <BentoItem>
        <Tile title="Agent-ready" body="A registry and an MCP server." />
      </BentoItem>
      <BentoItem>
        <Tile title="Fast" body="CSS first, canvas where it earns it." />
      </BentoItem>
    </BentoGrid>
  ),
};
