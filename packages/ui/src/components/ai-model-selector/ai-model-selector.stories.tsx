import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/badge";

import { ModelSelector, type ModelOption } from "./ai-model-selector";

const MODELS: ModelOption[] = [
  {
    id: "fast",
    name: "Fast",
    description: "Lowest latency. Good for short answers.",
    group: "General",
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "The default for most work.",
    group: "General",
    badge: (
      <Badge size="sm" variant="secondary">
        Default
      </Badge>
    ),
  },
  {
    id: "deep",
    name: "Deep Research",
    description: "Multi-step research with citations.",
    group: "Advanced",
  },
  {
    id: "vision",
    name: "Vision Pro",
    group: "Advanced",
    disabled: true,
    disabledReason: "Available on the Team plan",
  },
];

const meta = {
  title: "AI/Model Selector",
  component: ModelSelector,
  args: { models: MODELS, defaultValue: "balanced", "aria-label": "Model" },
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof ModelSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The trigger shows only the model name; descriptions stay in the list. */
export const Default: Story = {};

export const Ungrouped: Story = {
  args: {
    models: [
      { id: "a", name: "Model A", description: "Fast and cheap." },
      { id: "b", name: "Model B", description: "Slower and stronger." },
    ],
    defaultValue: "a",
  },
};

/** A disabled model always says why. Otherwise it reads as a broken interface. */
export const WithUnavailableModel: Story = {
  args: { defaultValue: "fast" },
};
