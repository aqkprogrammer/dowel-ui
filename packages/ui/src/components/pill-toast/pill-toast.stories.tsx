import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { PillToast } from "./pill-toast";

const meta = {
  title: "Feedback/Pill Toast",
  component: PillToast,
  args: { children: "Saved to Photos", size: "md", duration: 2000 },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PillToast>;

export default meta;
type Story = StoryObj<typeof meta>;

function Trigger({ auto = false }: { auto?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => setOpen(true), 1300);
    return () => clearInterval(timer);
  }, [auto]);
  return (
    <div className="relative flex h-40 w-56 items-end justify-center pb-8">
      <PillToast
        open={open}
        onOpenChange={setOpen}
        duration={auto ? 450 : 2000}
        size="sm"
        className="absolute inset-x-0 top-2 justify-center [--pill-toast-accent:#5fd4e0]"
      >
        Saved to Photos
      </PillToast>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          requestAnimationFrame(() => setOpen(true));
        }}
        className="rounded-full bg-muted px-3 py-1.5 text-2xs font-semibold text-foreground transition-transform active:scale-95"
      >
        Save
      </button>
    </div>
  );
}

/** Press Save: the toast drops in and dismisses itself. */
export const Default: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Trigger />,
};

/** Saving on a loop, on the dark tile, as in the reference. */
export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="dark rounded-3xl bg-[#161618] p-10 text-white">
      <Trigger auto />
    </div>
  ),
};

/** Open and held, to inspect the pill. */
export const Static: Story = {
  args: { defaultOpen: true, duration: Infinity },
};
