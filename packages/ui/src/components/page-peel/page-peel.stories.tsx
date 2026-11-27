import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { PagePeel } from "./page-peel";

const meta = {
  title: "Effects/Page Peel",
  component: PagePeel,
  args: {
    corner: "bottom-end",
    peelOnHover: true,
    surface: "card",
    children: null,
    revealContent: null,
  },
  argTypes: {
    corner: {
      control: "select",
      options: ["top-start", "top-end", "bottom-start", "bottom-end"],
    },
    surface: { control: "select", options: ["card", "primary"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PagePeel>;

export default meta;
type Story = StoryObj<typeof meta>;

function Coupon({ code }: { code: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 p-6">
      <span className="text-xs tracking-widest text-muted-foreground uppercase">Your code</span>
      <span className="font-mono text-2xl font-bold tracking-wider">{code}</span>
    </div>
  );
}

/** Hover to see the corner lift; drag it or press the corner to peel it off. */
export const Default: Story = {
  render: (args) => (
    <PagePeel {...args} className="w-72 border" revealContent={<Coupon code="PEEL-20" />}>
      <div className="flex h-44 flex-col justify-between p-6">
        <span className="text-sm font-medium text-muted-foreground">Winter offer</span>
        <span className="text-3xl font-bold">20% off</span>
        <span className="text-xs text-muted-foreground">Peel the corner for your code</span>
      </div>
    </PagePeel>
  ),
};

/** Each corner, peeled to the hover hint. */
export const Corners: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      {(["top-start", "top-end", "bottom-start", "bottom-end"] as const).map((corner) => (
        <PagePeel
          key={corner}
          corner={corner}
          hoverAmount={0.2}
          className="w-48 border"
          revealContent={<Coupon code="HELLO" />}
        >
          <div className="flex h-32 items-center justify-center p-4 text-sm font-medium">
            {corner}
          </div>
        </PagePeel>
      ))}
    </div>
  ),
};

function Controlled() {
  const [peeled, setPeeled] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      <PagePeel
        surface="primary"
        peeled={peeled}
        onPeeledChange={setPeeled}
        className="w-72"
        revealContent={<Coupon code="TEAM-2026" />}
      >
        <div className="flex h-44 flex-col justify-end p-6">
          <span className="text-2xl font-bold">You&apos;re invited</span>
          <span className="text-sm">Peel to reveal your access code</span>
        </div>
      </PagePeel>
      <p className="text-sm text-muted-foreground">{peeled ? "Peeled" : "Flat"}</p>
    </div>
  );
}

/** Controlled with `peeled`, on the primary surface. */
export const PrimarySurface: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Controlled />,
};
