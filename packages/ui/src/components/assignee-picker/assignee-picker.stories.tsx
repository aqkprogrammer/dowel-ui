import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { AssigneePicker, type AssigneePickerPerson } from "./assignee-picker";

// Neutral placeholders: initials by default, picsum seeds for the photo variant.
const PEOPLE: AssigneePickerPerson[] = [
  { id: "adam", name: "Adam Marsh", description: "Design" },
  { id: "priya", name: "Priya Raman", description: "Research" },
  { id: "nora", name: "Nora Wilder", description: "Engineering" },
  { id: "marco", name: "Marco Bellini", description: "Product" },
];

const WITH_PHOTOS: AssigneePickerPerson[] = PEOPLE.map((person) => ({
  ...person,
  avatar: `https://picsum.photos/seed/${person.id}/96/96`,
}));

const MORE: AssigneePickerPerson[] = [
  ...PEOPLE,
  { id: "lena", name: "Lena Ortiz", description: "Support" },
  { id: "omar", name: "Omar Haddad", description: "Data" },
];

const meta: Meta<typeof AssigneePicker> = {
  title: "Form/Assignee Picker",
  component: AssigneePicker,
  args: {
    people: PEOPLE,
    defaultValue: ["adam", "priya"],
    overlap: 10,
    corner: 22,
    stack: "row",
    tone: "default",
    stroke: false,
  },
  argTypes: {
    overlap: { control: { type: "range", min: 0, max: 22, step: 1 } },
    corner: { control: { type: "range", min: 0, max: 26, step: 1 } },
    stack: { control: "inline-radio", options: ["row", "grid"] },
    tone: { control: "inline-radio", options: ["default", "inverted"] },
  },
  decorators: [
    (Story) => (
      <div className="min-h-80 p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AssigneePicker>;

/** bencho Assignees: two people assigned; open the pill and toggle rows. */
export const Default: Story = {};

export const Unassigned: Story = { args: { defaultValue: [] } };

export const GridStack: Story = {
  args: { stack: "grid", defaultValue: ["adam", "priya", "nora"] },
};

export const Photos: Story = { args: { people: WITH_PHOTOS } };

export const Overflow: Story = {
  args: { people: MORE, maxFaces: 4, defaultValue: MORE.map((person) => person.id) },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(["nora"]);
    return (
      <div className="flex flex-col gap-3">
        <AssigneePicker {...args} value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground">value: {JSON.stringify(value)}</p>
      </div>
    );
  },
};

export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl">
      <AssigneePicker {...args} />
    </div>
  ),
};

/** Every workbench setting of the bencho block. */
export const Gallery: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-10">
      {[
        { caption: "bencho Assignees — default (Row, Overlap 10, Corner 22)", props: {} },
        { caption: "bencho Assignees — Unassigned", props: { defaultValue: [] } },
        { caption: "bencho Assignees — Stack: Grid", props: { stack: "grid" as const } },
        {
          caption: "bencho Assignees — Overlap 0 / Corner 8",
          props: { overlap: 0, corner: 8 },
        },
        { caption: "bencho Assignees — Fill: Dark", props: { tone: "inverted" as const } },
        { caption: "bencho Assignees — Stroke: On", props: { stroke: true } },
      ].map(({ caption, props }) => (
        <div key={caption} className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{caption}</p>
          <AssigneePicker people={PEOPLE} defaultValue={["adam", "priya", "nora"]} {...props} />
        </div>
      ))}
    </div>
  ),
};
