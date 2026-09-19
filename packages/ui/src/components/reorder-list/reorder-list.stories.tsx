import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

import { ReorderList, type ReorderListItem } from "./reorder-list";

/*
 * bencho's four people. Their photos are excluded from the licence, so the
 * avatars are initials on token-coloured backings (violet, teal, rust, green
 * in the source become the theme's accent roles).
 */
const PEOPLE: ReorderListItem[] = [
  { id: "mara", label: "Mara Quinn", initials: "MQ", accent: "var(--color-primary)" },
  { id: "tomas", label: "Tomás Oliveira", initials: "TO", accent: "var(--color-info)" },
  { id: "lars", label: "Lars Andersen", initials: "LA", accent: "var(--color-warning)" },
  { id: "sofia", label: "Sofia Ricci", initials: "SR", accent: "var(--color-success)" },
];

// Annotated: an inline decorator makes the inferred type unnameable (TS2883).
const meta: Meta<typeof ReorderList> = {
  title: "Form/Reorder List",
  component: ReorderList,
  args: {
    items: PEOPLE,
    "aria-label": "Speaking order",
    give: 50,
    lean: 18,
    corner: 22,
    fill: "light",
    stroke: false,
    disabled: false,
  },
  argTypes: {
    give: { control: { type: "range", min: 0, max: 100, step: 5 } },
    lean: { control: { type: "range", min: 0, max: 100, step: 5 } },
    corner: { control: { type: "range", min: 0, max: 22, step: 2 } },
    fill: { control: "inline-radio", options: ["light", "dark"] },
    items: { control: false },
    renderItem: { control: false },
    announcements: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="grid min-h-[20rem] place-items-center rounded-xl bg-muted p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag a pill, or focus one and press Space, the arrow keys, then Space again. */
export const Default: Story = {};

function Cell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-3">
      <div className="grid min-h-[15rem] place-items-center rounded-xl bg-muted px-6 py-8">
        {children}
      </div>
      <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** bencho Reorder list: the source block and its workbench feel settings. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  decorators: [(Story) => <Story />],
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Cell caption="bencho Reorder list">
        <ReorderList items={PEOPLE} aria-label="Speaking order" />
      </Cell>
      <Cell caption="bencho Reorder list · Give 0 (stiff)">
        <ReorderList items={PEOPLE} aria-label="Speaking order, stiff" give={0} />
      </Cell>
      <Cell caption="bencho Reorder list · Give 100 (soft)">
        <ReorderList items={PEOPLE} aria-label="Speaking order, soft" give={100} />
      </Cell>
      <Cell caption="bencho Reorder list · Lean 0">
        <ReorderList items={PEOPLE} aria-label="Speaking order, no lean" lean={0} />
      </Cell>
      <Cell caption="bencho Reorder list · Lean 60">
        <ReorderList items={PEOPLE} aria-label="Speaking order, heavy lean" lean={60} />
      </Cell>
      <Cell caption="bencho Reorder list · Corner 8">
        <ReorderList items={PEOPLE} aria-label="Speaking order, square" corner={8} />
      </Cell>
      <Cell caption="bencho Reorder list · Fill dark">
        <ReorderList items={PEOPLE} aria-label="Speaking order, dark" fill="dark" />
      </Cell>
      <Cell caption="bencho Reorder list · Stroke on">
        <ReorderList items={PEOPLE} aria-label="Speaking order, outlined" stroke />
      </Cell>
    </div>
  ),
};

/** The presence dot (success token) the source hides by default. */
export const Presence: Story = {
  args: {
    items: PEOPLE.map((person, i) => ({ ...person, online: i % 2 === 0 })),
  },
};

/** The order is yours: `value` + `onValueChange`. */
export const Controlled: Story = {
  render: (args) => {
    const [order, setOrder] = useState(PEOPLE.map((person) => person.id));
    return (
      <div className="flex flex-col items-center gap-4">
        <ReorderList {...args} value={order} onValueChange={setOrder} />
        <output className="text-xs text-muted-foreground">{order.join(" → ")}</output>
      </div>
    );
  },
};

/** Live-region messages and instructions are overridable for other languages. */
export const Localised: Story = {
  args: {
    "aria-label": "Orden de intervención",
    instructions:
      "Pulsa Espacio o Intro para coger, las flechas para mover, Espacio para soltar, Escape para cancelar.",
    announcements: {
      grabbed: ({ item, position, total }) =>
        `${item.label} cogido. Posición ${String(position)} de ${String(total)}.`,
      moved: ({ item, position, total }) =>
        `${item.label} movido a la posición ${String(position)} de ${String(total)}`,
      dropped: ({ item, position, total }) =>
        `${item.label} soltado en la posición ${String(position)} de ${String(total)}`,
      cancelled: ({ item, position, total }) =>
        `Cancelado. ${item.label} vuelve a la posición ${String(position)} de ${String(total)}`,
    },
  },
};

/** `renderItem` swaps the row content; the label still names each button. */
export const CustomRows: Story = {
  args: {
    className: "w-64",
    renderItem: (item, { index, grabbed }) => (
      <span className="flex w-full items-center gap-3 ps-2.5">
        <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
        <span className="truncate font-medium">{item.label}</span>
        {grabbed ? <span className="ms-auto text-xs text-muted-foreground">moving</span> : null}
      </span>
    ),
  },
};

export const Disabled: Story = { args: { disabled: true } };
