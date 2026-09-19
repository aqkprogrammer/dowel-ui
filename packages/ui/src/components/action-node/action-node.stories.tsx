import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, GitCommitHorizontal, Link2, Plus, Settings2 } from "lucide-react";
import { useState } from "react";

import { ActionNode, type ActionNodeAction } from "./action-node";

const ACTIONS: ActionNodeAction[] = [
  { label: "Connect", icon: <Link2 /> },
  { label: "Add a step", icon: <Plus /> },
  { label: "Duplicate", icon: <Copy /> },
  { label: "Settings", icon: <Settings2 /> },
];

/** Initials only: the source's avatars are photos, which are not part of its licence. */
const PEOPLE = [{ name: "Ada Lovelace" }, { name: "Grace Hopper" }, { name: "Alan Turing" }];

const DESCRIPTION =
  "Reads the thread, writes a summary, and posts it back to the channel it came from.";

const meta: Meta<typeof ActionNode> = {
  title: "Display/Action Node",
  component: ActionNode,
  args: {
    heading: "Node 07",
    description: DESCRIPTION,
    icon: <GitCommitHorizontal />,
    people: PEOPLE,
    extraCount: 3,
    actions: ACTIONS,
    bounce: 20,
    stagger: 55,
    reach: 30,
    corner: 20,
    stroke: false,
    tone: "default",
  },
  argTypes: {
    bounce: { control: { type: "range", min: 0, max: 100, step: 5 } },
    stagger: { control: { type: "range", min: 0, max: 100, step: 5 } },
    reach: { control: { type: "range", min: 20, max: 40, step: 1 } },
    corner: { control: { type: "range", min: 0, max: 32, step: 1 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 items-center justify-center bg-muted p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActionNode>;

/**
 * Hover the card to fan its actions out around the top-end corner. From the keyboard, Tab to
 * "More actions" and press Enter: arrows move along the fan, Escape closes it.
 */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - bencho "Action node" (parked) → the Node 07 card with its four actions
 *   (Connect, Add a step, Duplicate, Settings), the Buttons slider (2–4), Reach
 *   and Corner at their extremes, and the Fill and Stroke switches. Each is held
 *   open so the arc is visible.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col items-center gap-4">
      <div className="grid gap-x-24 md:grid-cols-2">
        <ActionNode
          heading="Node 07"
          description={DESCRIPTION}
          icon={<GitCommitHorizontal />}
          people={PEOPLE}
          extraCount={3}
          actions={ACTIONS}
          open
        />
        <ActionNode
          heading="Two buttons, reach 20"
          icon={<GitCommitHorizontal />}
          actions={ACTIONS.slice(0, 2)}
          reach={20}
          corner={0}
          open
        />
        <ActionNode
          heading="Three buttons, reach 40"
          icon={<GitCommitHorizontal />}
          actions={ACTIONS.slice(0, 3)}
          reach={40}
          corner={32}
          stroke
          open
        />
        <ActionNode
          heading="Fill: dark"
          description={DESCRIPTION}
          icon={<GitCommitHorizontal />}
          actions={ACTIONS}
          tone="inverted"
          open
        />
      </div>
      <figcaption className="text-xs text-muted-foreground">bencho Action node</figcaption>
    </figure>
  ),
};

/** The fan held by the parent, with actions that report what they did. */
export const Controlled: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [last, setLast] = useState("nothing yet");
    return (
      <div className="flex flex-col items-center gap-2">
        <ActionNode
          {...args}
          open={open}
          onOpenChange={setOpen}
          actions={ACTIONS.map((action) => ({
            ...action,
            onSelect: () => {
              setLast(action.label);
            },
          }))}
        />
        <p className="text-xs text-muted-foreground">
          {open ? "Open" : "Closed"} · last action: {last}
        </p>
      </div>
    );
  },
};

/** Right-to-left: the fan opens around the top-left corner and the arc mirrors. */
export const RightToLeft: Story = {
  args: { dir: "rtl" },
};
