import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame, Image, PenTool, Square, Star, Type } from "lucide-react";
import { useState, type ReactNode } from "react";

import { RadialMenu, type RadialMenuItem } from "./radial-menu";

const TOOLS: RadialMenuItem[] = [
  { value: "frame", label: "Frame", icon: <Frame /> },
  { value: "text", label: "Text", icon: <Type /> },
  { value: "shape", label: "Shape", icon: <Square /> },
  { value: "pen", label: "Pen", icon: <PenTool /> },
  { value: "note", label: "Note", icon: <Star /> },
  { value: "image", label: "Image", icon: <Image /> },
];

/** The workbench well: the core sits low so the fan has room above it. */
function Well({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-52 w-72 place-items-end justify-center bg-muted pb-10">
      {children}
    </div>
  );
}

const meta: Meta<typeof RadialMenu> = {
  title: "Navigation/Radial Menu",
  component: RadialMenu,
  args: {
    items: TOOLS.slice(0, 5),
    label: "Add",
    radius: 68,
    arc: 180,
    stagger: 28,
    tone: "default",
    stroke: false,
  },
  argTypes: {
    radius: { control: { type: "range", min: 44, max: 104, step: 1 } },
    arc: { control: { type: "range", min: 60, max: 300, step: 5 } },
    stagger: { control: { type: "range", min: 0, max: 70, step: 1 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
    items: { control: false },
    icon: { control: false },
  },
  decorators: [
    (Story) => (
      <Well>
        <Story />
      </Well>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RadialMenu>;

/**
 * bencho "Radial menu": press the core and drag onto a tool, release to pick it. A plain click
 * leaves the fan open; Enter opens it from the keyboard and the arrows walk the ring.
 */
export const Default: Story = {};

/**
 * bencho "Radial menu" with each workbench setting: the default block, Tools 2 and 6, Radius
 * 44 and 104, Arc 60 and 300, Stagger 0 and 70, Fill dark and Stroke on. Every fan is open.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  decorators: [(Story) => <Story />],
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(
        [
          ["Radial menu", {}],
          ["Tools: 2", { items: TOOLS.slice(0, 2) }],
          ["Tools: 6", { items: TOOLS }],
          ["Radius: 44", { radius: 44 }],
          ["Radius: 104", { radius: 104 }],
          ["Arc: 60", { arc: 60 }],
          ["Arc: 300", { arc: 300 }],
          ["Stagger: 0", { stagger: 0 }],
          ["Stagger: 70", { stagger: 70 }],
          ["Fill: Dark", { tone: "inverted" }],
          ["Stroke: On", { stroke: true }],
        ] as const
      ).map(([caption, props]) => (
        <figure key={caption} className="grid gap-2">
          <Well>
            <RadialMenu items={TOOLS.slice(0, 5)} defaultOpen {...props} />
          </Well>
          <figcaption className="text-center text-xs text-muted-foreground">
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** Reflecting the choice, which the source demo did not: the last pick is shown below. */
export const WithSelection: Story = {
  render: (args) => {
    const [picked, setPicked] = useState<string>("none");
    return (
      <div className="grid justify-items-center gap-3">
        <RadialMenu {...args} onSelect={setPicked} />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Picked: {picked}
        </p>
      </div>
    );
  },
};

/** Arc and positions mirror in RTL; ArrowRight moves toward the visual right. */
export const RightToLeft: Story = {
  args: { defaultOpen: true },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};
