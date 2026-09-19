import type { Meta, StoryObj } from "@storybook/react-vite";

import { TodoTower, type TodoItem } from "./todo-tower";

const LABELS = [
  "Back up the drive",
  "Water the plants",
  "Call the landlord",
  "Pay the invoice",
  "Export the icons",
  "Book the flights",
  "Renew the domain",
  "Reply to Nadia",
];

/** The source's to-dos, bottom-most last; `count` takes the top n. */
function todos(count: number): TodoItem[] {
  return LABELS.slice(-count).map((label) => ({ id: label, label }));
}

const meta: Meta<typeof TodoTower> = {
  title: "Display/Todo Tower",
  component: TodoTower,
  args: {
    defaultItems: todos(6),
    gravity: 50,
    slip: 45,
    fill: "light",
    stroke: false,
    loop: true,
  },
  argTypes: {
    gravity: { control: { type: "range", min: 0, max: 100, step: 5 } },
    slip: { control: { type: "range", min: 0, max: 100, step: 5 } },
    fill: { control: "select", options: ["light", "dark"] },
  },
  decorators: [
    (Story) => (
      <div className="flex h-[25rem] items-end justify-center rounded-xl bg-muted px-10">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof TodoTower>;

/** Tick a card to flick it away; grab one and shake the stack. */
export const Default: Story = {};

/** bencho "Todo tower": Todos 6 and 8 (Fill dark, Stroke), and Todos 3 with low gravity and high slip. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-6">
      <figure className="flex flex-col items-center gap-2">
        <div className="flex h-[25rem] items-end rounded-xl bg-muted px-6">
          <TodoTower defaultItems={todos(6)} loop />
        </div>
        <figcaption className="text-xs text-muted-foreground">bencho Todo tower</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <div className="flex h-[25rem] items-end rounded-xl bg-muted px-6">
          <TodoTower defaultItems={todos(8)} fill="dark" stroke loop />
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Todos 8 · Fill dark · Stroke
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <div className="flex h-[25rem] items-end rounded-xl bg-muted px-6">
          <TodoTower defaultItems={todos(3)} gravity={10} slip={100} loop />
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Todos 3 · Gravity 10 · Slip 100
        </figcaption>
      </figure>
    </div>
  ),
};
