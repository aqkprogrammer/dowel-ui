import type { Meta, StoryObj } from "@storybook/react-vite";

import { AnimatedChecklist, type ChecklistItem } from "./animated-checklist";

const TASKS: ChecklistItem[] = [
  { id: "studio", label: "Book the studio", done: true },
  { id: "estimate", label: "Send the estimate" },
  { id: "typeface", label: "Pick a typeface" },
];

const meta: Meta<typeof AnimatedChecklist> = {
  title: "Form/Animated Checklist",
  component: AnimatedChecklist,
  args: {
    "aria-label": "Tasks",
    defaultItems: TASKS,
    bounce: 50,
    boxSize: 18,
    radius: 18,
    maxItems: 6,
    stroke: false,
    removable: false,
    sortDone: false,
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    bounce: { control: { type: "range", min: 0, max: 100, step: 5 } },
    boxSize: { control: { type: "range", min: 14, max: 28, step: 1 } },
    radius: { control: { type: "range", min: 0, max: 40, step: 2 } },
  },
  decorators: [
    (Story) => (
      <div className="rounded-xl bg-muted p-10">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof AnimatedChecklist>;

export const Default: Story = {};

/** bencho "Checklist" at its defaults, then with Bounce, Corner, Box and Stroke moved. */
export const Gallery: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6 rounded-xl bg-muted p-10">
      <figure className="flex flex-col items-center gap-2">
        <AnimatedChecklist aria-label="Tasks" defaultItems={TASKS} maxItems={6} />
        <figcaption className="text-xs text-muted-foreground">bencho Checklist</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <AnimatedChecklist
          aria-label="Tasks"
          defaultItems={TASKS}
          bounce={100}
          boxSize={24}
          radius={8}
          stroke
          removable
        />
        <figcaption className="text-xs text-muted-foreground">
          Bounce 100 · Box 24 · Corner 8 · Stroke · removable
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <AnimatedChecklist
          aria-label="Tasks"
          defaultItems={TASKS}
          bounce={0}
          allowAdd={false}
        />
        <figcaption className="text-xs text-muted-foreground">Bounce 0 · no add row</figcaption>
      </figure>
    </div>
  ),
};

const WEEK: ChecklistItem[] = [
  { id: "brief", label: "Read the brief", done: true },
  { id: "moodboard", label: "Pull a moodboard" },
  { id: "estimate", label: "Send the estimate" },
  { id: "typeface", label: "Pick a typeface" },
  { id: "studio", label: "Book the studio" },
];

/**
 * `sortDone`: tick a task and it plays its tick — the fill, the strike, the
 * fade — then glides to the bottom; untick it and it glides straight back.
 * Try it with Space: focus rides along with the task. Only the order on screen
 * changes; `onItemsChange` still reports the list in its own order.
 */
export const SortDone: Story = {
  args: { defaultItems: WEEK, sortDone: true, removable: true, maxItems: 8 },
};

/** `size` scales text, box, rows, padding and corner together — the box is always one line tall. */
export const Sizes: Story = {
  decorators: [(Story) => <Story />],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid items-start gap-6 rounded-xl bg-muted p-10 sm:grid-cols-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <figure key={size} className="flex flex-col items-center gap-2">
          <AnimatedChecklist
            aria-label={`Tasks, ${size}`}
            defaultItems={TASKS}
            size={size}
            sortDone
            allowAdd={false}
          />
          <figcaption className="text-xs text-muted-foreground">size {size}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
