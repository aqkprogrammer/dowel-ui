import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Folder, LayoutGrid, Table2 } from "lucide-react";
import type { ReactNode } from "react";

import { CreateMenu, CreateMenuItem, type CreateMenuProps } from "./create-menu";

function Items() {
  return (
    <>
      <CreateMenuItem icon={<FileText />}>Document</CreateMenuItem>
      <CreateMenuItem icon={<Table2 />}>Spreadsheet</CreateMenuItem>
      <CreateMenuItem icon={<LayoutGrid />}>Board</CreateMenuItem>
      <CreateMenuItem icon={<Folder />}>Folder</CreateMenuItem>
    </>
  );
}

/** The workbench stage: a muted square with the block centred near its top. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-64 w-64 place-items-start justify-center bg-muted pt-10">
      {children}
    </div>
  );
}

const meta: Meta<typeof CreateMenu> = {
  title: "Navigation/Create Menu",
  component: CreateMenu,
  args: { label: "Create", corner: 28, panelWidth: 212, tone: "default", stroke: false },
  argTypes: {
    corner: { control: { type: "range", min: 0, max: 40, step: 2 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
    align: { control: "inline-radio", options: ["start", "center", "end"] },
    icon: { control: false },
  },
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
  render: (args: CreateMenuProps) => (
    <CreateMenu {...args}>
      <Items />
    </CreateMenu>
  ),
};

export default meta;
type Story = StoryObj<typeof CreateMenu>;

/** bencho "Create menu": press the pill; it grows into the menu. Arrow keys move the highlight. */
export const Default: Story = {};

/**
 * bencho "Create menu" with each workbench setting: the default block, Corner at its extremes,
 * Fill dark (`tone="inverted"`) and Stroke on.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  decorators: [(Story) => <Story />],
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(
        [
          ["Create menu", {}],
          ["Corner 0", { corner: 0 }],
          ["Corner 40", { corner: 40 }],
          ["Fill: Dark", { tone: "inverted" }],
          ["Stroke: On", { stroke: true }],
        ] as const
      ).map(([caption, props]) => (
        <figure key={caption} className="grid gap-2">
          <Stage>
            <CreateMenu {...props}>
              <Items />
            </CreateMenu>
          </Stage>
          <figcaption className="text-center text-xs text-muted-foreground">
            {caption}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** Open on load, so the settled panel and the highlight pill can be inspected. */
export const Open: Story = { args: { defaultOpen: true } };

export const Inverted: Story = { args: { tone: "inverted" } };

export const Stroke: Story = { args: { stroke: true } };
