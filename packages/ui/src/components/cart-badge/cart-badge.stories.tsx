import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { CartBadge } from "./cart-badge";

const meta = {
  title: "Feedback/Cart Badge",
  component: CartBadge,
  args: { size: "md", defaultCount: 0, addLabel: "Add to bag", disabled: false },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof CartBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press "+": a dot arcs into the bag and the badge pops. */
export const Default: Story = {};

function Playing() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      // 1 → 2 → 3, then empty the bag and start again, as the reference loops.
      setCount((current) => (current >= 3 ? 0 : current));
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>("[data-demo=cart] button")?.click();
      }, 0);
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <div data-demo="cart">
      <CartBadge count={count} onCountChange={setCount} />
    </div>
  );
}

/** Plays itself on a dark tile, as in the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark flex flex-col items-center gap-6 rounded-3xl bg-[#161618] p-10 text-white">
      <Playing />
      <span className="text-sm font-medium">Cart Badge</span>
    </div>
  ),
};

function Controlled() {
  const [count, setCount] = useState(2);
  return (
    <div className="flex flex-col items-center gap-3">
      <CartBadge count={count} onCountChange={setCount} />
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => {
          setCount(0);
        }}
      >
        Empty bag
      </button>
    </div>
  );
}

export const ControlledCount: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Controlled />,
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <CartBadge size="sm" defaultCount={1} />
      <CartBadge size="md" defaultCount={2} />
      <CartBadge size="lg" defaultCount={3} />
    </div>
  ),
};
