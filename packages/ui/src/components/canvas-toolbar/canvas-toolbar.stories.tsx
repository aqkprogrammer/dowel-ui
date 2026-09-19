import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Circle,
  Frame,
  Hand,
  MousePointer2,
  PenTool,
  Slash,
  Square,
  Star,
  Type,
} from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { DirectionProvider } from "../direction";
import { CanvasToolbar, type CanvasToolbarItem } from "./canvas-toolbar";

/** The bencho rail: move, hand, frame, a shape slot, a divider, pen and text. */
const TOOLS: CanvasToolbarItem[] = [
  { value: "move", label: "Move", icon: <MousePointer2 />, shortcut: "v" },
  { value: "hand", label: "Hand", icon: <Hand />, shortcut: "h" },
  { value: "frame", label: "Frame", icon: <Frame />, shortcut: "f" },
  {
    type: "slot",
    label: "Shapes",
    tools: [
      { value: "rect", label: "Rectangle", icon: <Square />, shortcut: "r" },
      { value: "oval", label: "Oval", icon: <Circle />, shortcut: "o" },
      { value: "line", label: "Line", icon: <Slash />, shortcut: "l" },
      { value: "star", label: "Star", icon: <Star />, shortcut: "s" },
    ],
  },
  { type: "separator" },
  { value: "pen", label: "Pen", icon: <PenTool />, shortcut: "p" },
  { value: "text", label: "Text", icon: <Type />, shortcut: "t" },
];

/** The workbench stage: a flat muted surface the rail sits centred on. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl bg-muted p-8 pt-24">
      {children}
    </div>
  );
}

const meta = {
  title: "Navigation/Canvas Toolbar",
  component: CanvasToolbar,
  args: {
    "aria-label": "Canvas tools",
    tools: TOOLS,
    corner: 14,
    tone: "default",
    stroke: false,
    tooltips: true,
    globalShortcuts: false,
    orientation: "horizontal",
  },
  argTypes: {
    corner: { control: { type: "range", min: 0, max: 25, step: 1 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
  },
  render: (args) => (
    <Stage>
      <CanvasToolbar {...args} />
    </Stage>
  ),
} satisfies Meta<typeof CanvasToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click a tool, or focus the rail and use arrows, Home/End and the V H F R P T keys. */
export const Default: Story = {};

/**
 * Every state of the bencho "Canvas toolbar" block: the default rail, Fill Dark
 * (`tone="inverted"`), Stroke on, Corner 0 and 25, and a slot that already shows
 * a picked shape (star). Open a notch to see the flyout rise in.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const rows: { caption: string; props: Partial<ComponentProps<typeof CanvasToolbar>> }[] = [
      { caption: "Canvas toolbar — Fill Light (default)", props: {} },
      { caption: "Canvas toolbar — Fill Dark", props: { tone: "inverted" } },
      { caption: "Canvas toolbar — Stroke on", props: { stroke: true } },
      { caption: "Canvas toolbar — Corner 0", props: { corner: 0 } },
      { caption: "Canvas toolbar — Corner 25", props: { corner: 25 } },
      { caption: "Canvas toolbar — shape picked (star)", props: { defaultValue: "star" } },
    ];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(({ caption, props }) => (
          <figure key={caption} className="m-0 grid gap-2">
            <Stage>
              <CanvasToolbar aria-label={caption} tools={TOOLS} {...props} />
            </Stage>
            <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
          </figure>
        ))}
      </div>
    );
  },
};

function Controlled(props: ComponentProps<typeof CanvasToolbar>) {
  const [value, setValue] = useState("rect");
  return (
    <Stage>
      <div className="grid justify-items-center gap-3">
        <CanvasToolbar {...props} value={value} onValueChange={setValue} />
        <p className="text-sm text-muted-foreground">Active tool: {value}</p>
      </div>
    </Stage>
  );
}

/** The notch opens the shape flyout; picking a shape replaces the slot's tool. */
export const ShapeFlyout: Story = {
  render: (args) => <Controlled {...args} />,
};

/** Shortcuts on the whole page, except while typing in a field. */
export const GlobalShortcuts: Story = {
  args: { globalShortcuts: true },
  render: (args) => (
    <Stage>
      <CanvasToolbar {...args} />
      <input
        aria-label="Layer name"
        placeholder="Typing here does not switch tools"
        className="mt-3 rounded-md border border-border bg-background px-2 py-1 text-sm"
      />
    </Stage>
  ),
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
};

export const RightToLeft: Story = {
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl">
        <Stage>
          <CanvasToolbar {...args} dir="rtl" />
        </Stage>
      </div>
    </DirectionProvider>
  ),
};
