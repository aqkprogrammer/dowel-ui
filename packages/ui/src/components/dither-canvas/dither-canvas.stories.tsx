import type { Meta, StoryObj } from "@storybook/react-vite";

import { DitherCanvas, DitherTable, type DitherDraw } from "./dither-canvas";
import { ditherFill, drift, hash2, shimmer, smoothstep } from "./dither-engine";
import { makePath, traceRoundedWedge } from "./dither-geometry";

/** A radial glow: density falls with distance and ripples with time. */
const orb: DitherDraw = (ctx, frame) => {
  const { width, height, time, animated } = frame;
  const c = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2;
  ditherFill(ctx, {
    bounds: { x: 0, y: 0, width, height },
    cell: frame.cell,
    color: frame.color("primary"),
    density: (cx, cy) => {
      const d = Math.hypot(cx - c.x, cy - c.y) / radius;
      const wave = animated
        ? shimmer(
            Math.sin(d * 12 - time * 2),
            Math.sin(Math.atan2(cy - c.y, cx - c.x) * 3 + time),
          )
        : 0.5;
      return (1 - smoothstep(0.2, 1, d)) * (0.5 + 0.5 * wave) * (0.8 + 0.4 * hash2(cx, cy));
    },
  });
};

const meta = {
  title: "Data/Dither Canvas",
  component: DitherCanvas,
  args: { draw: orb, animate: true, cell: 4.6 },
  argTypes: {
    draw: { control: false },
    cell: { control: { type: "range", min: 2, max: 12, step: 0.2 } },
  },
  render: (args) => (
    <div className="size-64 rounded-xl border border-border bg-card">
      <DitherCanvas {...args} />
    </div>
  ),
} satisfies Meta<typeof DitherCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Three density recipes from amicro's charts, on the same engine. */
const recipes: { name: string; draw: DitherDraw }[] = [
  {
    name: "shimmer (donut graph)",
    draw: (ctx, frame) => {
      ditherFill(ctx, {
        bounds: { x: 0, y: 0, width: frame.width, height: frame.height },
        cell: frame.cell,
        color: frame.color("primary"),
        density: (cx, cy) =>
          (0.34 +
            0.4 *
              (frame.animated
                ? shimmer(
                    Math.sin(cx * 0.1 - frame.time),
                    Math.sin(cy * 0.08 + frame.time * 1.5),
                  )
                : 0.5)) *
          (0.78 + 0.42 * hash2(cx, cy)),
      });
    },
  },
  {
    name: "drift (device donut, revenue fill)",
    draw: (ctx, frame) => {
      ditherFill(ctx, {
        bounds: { x: 0, y: 0, width: frame.width, height: frame.height },
        cell: frame.cell,
        color: frame.color("primary"),
        density: (cx, cy) =>
          (0.4 + 0.4 * (frame.animated ? drift(cx, cy, frame.time) : 0.5)) *
          (0.8 + 0.4 * hash2(cx, cy)),
      });
    },
  },
  {
    name: "gradient (falls off with depth)",
    draw: (ctx, frame) => {
      ditherFill(ctx, {
        bounds: { x: 0, y: 0, width: frame.width, height: frame.height },
        cell: frame.cell,
        color: frame.color("primary"),
        density: (cx, cy) => (1 - cy / frame.height) * (0.8 + 0.4 * hash2(cx, cy)),
      });
    },
  },
  {
    name: "clipped wedge + particles",
    draw: (ctx, frame) => {
      const c = { x: frame.width / 2, y: frame.height / 2 };
      const r = Math.min(frame.width, frame.height) / 2 - 4;
      const clip = makePath((sink) => {
        traceRoundedWedge(sink, c, r * 0.6, r, -Math.PI / 2, Math.PI * 0.8, 6);
      });
      const bounds = { x: 0, y: 0, width: frame.width, height: frame.height };
      ditherFill(ctx, {
        clip,
        bounds,
        cell: frame.cell,
        color: frame.color("primary"),
        density: () => 0.7,
      });
      const seed = frame.animated ? 1 + Math.floor(frame.time * 6) : 1;
      ditherFill(ctx, {
        clip,
        bounds,
        cell: frame.cell,
        color: frame.color("foreground"),
        density: (cx, cy) => (hash2(cx, cy, seed) > 0.92 ? 0.8 : 0),
      });
    },
  },
];

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <figure key={recipe.name} className="flex flex-col gap-2">
          <div className="aspect-square rounded-xl border border-border bg-card">
            <DitherCanvas draw={recipe.draw} />
          </div>
          <figcaption className="text-xs text-muted-foreground">{recipe.name}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

/**
 * The pattern every dither chart follows: a role="img" wrapper with a summary
 * name around a decorative canvas, and the data in a table.
 */
export const AccessibleChartPattern: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      <div
        role="img"
        aria-label="Storage used: 72% of 1 TB"
        className="h-24 rounded-xl border border-border bg-card"
      >
        <DitherCanvas
          draw={(ctx, frame) => {
            ditherFill(ctx, {
              bounds: { x: 0, y: 0, width: frame.width * 0.72, height: frame.height },
              cell: frame.cell,
              color: frame.color("primary"),
              density: (cx, cy) =>
                0.7 +
                (frame.animated ? 0.15 * Math.sin(cx * 0.1 - frame.time * 3) : 0) +
                0.1 * hash2(cx, cy),
            });
          }}
        />
      </div>
      <DitherTable
        caption="Storage"
        columns={["Kind", "Amount"]}
        rows={[
          ["Used", "720 GB"],
          ["Free", "280 GB"],
        ]}
        visible
      />
    </div>
  ),
};

export const Static: Story = {
  args: { animate: false },
};
