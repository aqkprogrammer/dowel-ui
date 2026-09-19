import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SelectionList, type SelectionListItem } from "./selection-list";

// Neutral placeholders: initials by default, picsum seeds for the photo variant.
const ITEMS: SelectionListItem[] = [
  { id: "nadia", name: "Nadia Okonkwo", description: "@nadia" },
  { id: "tomas", name: "Tomas Cardoso", description: "@tomas" },
  { id: "kai", name: "Kai Brenner", description: "@kai" },
  { id: "lukas", name: "Lukas Lindqvist", description: "@lukas" },
];

const WITH_PHOTOS: SelectionListItem[] = ITEMS.map((item) => ({
  ...item,
  avatar: `https://picsum.photos/seed/${item.id}/96/96`,
}));

const meta: Meta<typeof SelectionList> = {
  title: "Form/Selection List",
  component: SelectionList,
  args: {
    items: ITEMS,
    corner: 20,
    tone: "default",
    stroke: false,
    "aria-label": "Invite people",
  },
  argTypes: {
    corner: { control: { type: "range", min: 0, max: 40, step: 2 } },
    bounce: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SelectionList>;

/** bencho Selection list: pick people and the action drops out from under the box. */
export const Default: Story = {};

export const Preselected: Story = { args: { defaultValue: ["tomas", "kai"] } };

export const Photos: Story = { args: { items: WITH_PHOTOS } };

/** `onAction` returning a promise shows the busy state until it settles. */
export const AsyncAction: Story = {
  args: {
    onAction: () => new Promise((resolve) => setTimeout(resolve, 900)),
  },
};

export const CustomLabels: Story = {
  args: {
    actionLabel: (count: number) => `Invite ${String(count)}`,
    doneLabel: "Invites sent",
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(["nadia"]);
    return (
      <div className="flex flex-col gap-3">
        <SelectionList {...args} value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground">value: {JSON.stringify(value)}</p>
      </div>
    );
  },
};

/** Every workbench setting of the bencho block. */
export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-10">
      {[
        { caption: "bencho Selection list — default (Rows 4, Corner 20)", props: {} },
        { caption: "bencho Selection list — Rows 2", props: { items: ITEMS.slice(0, 2) } },
        { caption: "bencho Selection list — Rows 3", props: { items: ITEMS.slice(0, 3) } },
        {
          caption: "bencho Selection list — one selected (CTA out)",
          props: { defaultValue: ["kai"] },
        },
        { caption: "bencho Selection list — Corner 40", props: { corner: 40 } },
        { caption: "bencho Selection list — Corner 0", props: { corner: 0 } },
        {
          caption: "bencho Selection list — Fill: Dark",
          props: { tone: "inverted" as const, defaultValue: ["nadia", "lukas"] },
        },
        { caption: "bencho Selection list — Stroke", props: { stroke: true } },
      ].map(({ caption, props }) => (
        <div key={caption} className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{caption}</p>
          <SelectionList items={ITEMS} aria-label={caption} {...props} />
        </div>
      ))}
    </div>
  ),
};
