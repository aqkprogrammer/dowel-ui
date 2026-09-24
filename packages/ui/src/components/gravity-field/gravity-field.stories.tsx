import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heart, Star, Zap } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/button";

import { GravityField, type GravityFieldHandle } from "./gravity-field";

function Hint({ children = "Click to drop · press and hold to pour" }: { children?: string }) {
  return (
    <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-sm font-normal text-muted-foreground">
      {children}
    </p>
  );
}

const meta = {
  title: "Effects/Gravity Field",
  component: GravityField,
  args: {
    pool: "letters",
    gravity: 2000,
    size: 36,
    surface: "muted",
    deviceTilt: false,
    className: "h-80 w-[36rem] max-w-full",
    children: <Hint />,
  },
  argTypes: {
    pool: { control: "inline-radio", options: ["letters", "numbers", "both"] },
    surface: { control: "inline-radio", options: ["muted", "outline", "plain"] },
    gravity: { control: { type: "range", min: 200, max: 5000, step: 100 } },
    size: { control: { type: "range", min: 16, max: 72, step: 2 } },
    maxGlyphs: { control: { type: "number", min: 1 } },
    items: { control: false },
    children: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof GravityField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click anywhere to drop a letter; press and hold to pour. Tab to it and press Enter. */
export const Default: Story = {};

/**
 * Every source item this component covers.
 *
 * - Rare UI "Gravity Letters" → an original design of the same pattern (no
 *   source was viewed): click to drop, hold to pour, glyphs that tumble,
 *   bounce and pile into hills, a letters / numbers / both pool, your own
 *   items, a gravity and size control, a glyph cap and device tilt. The
 *   source's colour swatches are the text colour, set with `className`.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid w-[36rem] max-w-full gap-6">
      <GravityField pool="letters" className="h-56">
        <Hint>Letters</Hint>
      </GravityField>
      <GravityField pool="numbers" surface="outline" className="h-56 text-primary">
        <Hint>Numbers</Hint>
      </GravityField>
      <GravityField items={["🍎", "🍐", "🍊", "🍋", "🍉", "🍇"]} size={40} className="h-56">
        <Hint>Your own items</Hint>
      </GravityField>
    </div>
  ),
};

export const Numbers: Story = { args: { pool: "numbers" } };

export const LettersAndNumbers: Story = {
  args: { pool: "both", className: "h-80 w-[36rem] max-w-full text-primary" },
};

/** Native emoji as the drop pool. */
export const Emoji: Story = {
  args: { items: ["⭐", "🌙", "☀️", "☁️", "⚡", "❄️"], size: 40 },
};

/** Any node works — here, icons. */
export const Icons: Story = {
  args: {
    items: [
      <Star key="star" className="fill-current" />,
      <Heart key="heart" className="fill-current" />,
      <Zap key="zap" className="fill-current" />,
    ],
    className: "h-80 w-[36rem] max-w-full text-primary",
  },
};

/** Low gravity: glyphs drift down and bounce lazily. */
export const Floaty: Story = { args: { gravity: 500 } };

/** Past 40 glyphs, the oldest fade out, so the pile never overflows. */
export const Capped: Story = {
  args: { maxGlyphs: 40, children: <Hint>Holds 40 glyphs</Hint> },
};

/** On a phone, tilt the device to spill the pile; some browsers ask for permission on the first tap. */
export const DeviceTilt: Story = {
  args: { deviceTilt: true, children: <Hint>Tap, then tilt your phone</Hint> },
};

/** `handleRef` exposes `drop()` and `clear()` for your own controls. */
export const Imperative: Story = {
  parameters: { controls: { disable: true } },
  render: function Imperative() {
    const handle = useRef<GravityFieldHandle>(null);
    return (
      <div className="grid w-[36rem] max-w-full gap-3">
        <GravityField handleRef={handle} pool="both" className="h-64" />
        <div className="flex gap-2">
          <Button onClick={() => handle.current?.drop()}>Drop one</Button>
          <Button
            variant="secondary"
            onClick={() => {
              for (let i = 0; i < 12; i += 1)
                handle.current?.drop({ x: 40 + i * 40, y: 20 + (i % 3) * 10 });
            }}
          >
            Drop a row
          </Button>
          <Button variant="ghost" onClick={() => handle.current?.clear()}>
            Clear
          </Button>
        </div>
      </div>
    );
  },
};
