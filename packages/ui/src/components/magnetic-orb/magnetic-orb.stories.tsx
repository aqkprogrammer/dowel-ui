import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";

import { MagneticOrb } from "./magnetic-orb";

const meta = {
  title: "Effects/Magnetic Orb",
  component: MagneticOrb,
  args: { size: "md", strength: 0.35, reach: 32, "aria-label": "Continue" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    strength: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof MagneticOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Move the pointer near it. */
export const Default: Story = {};

/**
 * A scripted pointer drifts in from the corner, circles the orb and leaves, so
 * the pull, the accent and the spring home play on their own.
 */
function Scripted() {
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const target = field.current?.querySelector<HTMLElement>(
        "[data-slot=magnetic-orb-field]",
      );
      if (target) {
        const box = target.getBoundingClientRect();
        const t = ((now - start) / 4000) % 1;
        const inside = t < 0.55;
        const angle = t * Math.PI * 4;
        const x = box.left + box.width / 2 + Math.cos(angle) * 28;
        const y = box.top + box.height / 2 + Math.sin(angle) * 20 - 8;
        target.dispatchEvent(
          new PointerEvent(inside ? "pointermove" : "pointerleave", {
            bubbles: inside,
            clientX: x,
            clientY: y,
            pointerType: "mouse",
          }),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      ref={field}
      className="dark flex size-56 items-center justify-center rounded-3xl bg-[#161618] p-10 text-white"
    >
      <MagneticOrb aria-label="Continue" className="[--magnetic-orb-accent:#5fd4e0]" />
    </div>
  );
}

export const Demo: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Scripted />,
};

/** Re-tinted through `--magnetic-orb-accent`. */
export const Accents: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      <MagneticOrb size="sm" aria-label="Next" />
      <MagneticOrb aria-label="Next" className="[--magnetic-orb-accent:var(--color-success)]" />
      <MagneticOrb
        size="lg"
        aria-label="Next"
        className="[--magnetic-orb-accent:var(--color-info)]"
      />
    </div>
  ),
};
