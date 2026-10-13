import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  ModelComparison,
  type ModelComparisonMetric,
  type ModelComparisonModel,
} from "./model-comparison";

// Made-up models and numbers, for illustration.
const models: ModelComparisonModel[] = [
  {
    id: "swift",
    name: "Swift",
    provider: "Small · fast",
    values: {
      input: 0.25,
      output: 1.25,
      speed: 210,
      context: 128_000,
      score: 71,
      vision: false,
      tools: true,
    },
  },
  {
    id: "sage",
    name: "Sage",
    provider: "Balanced",
    values: {
      input: 3,
      output: 15,
      speed: 80,
      context: 200_000,
      score: 84,
      vision: true,
      tools: true,
    },
  },
  {
    id: "atlas",
    name: "Atlas",
    provider: "Largest",
    values: {
      input: 15,
      output: 75,
      speed: 40,
      context: 200_000,
      score: 90,
      vision: true,
      tools: true,
    },
  },
  {
    id: "ember",
    name: "Ember",
    provider: "Open weights",
    values: {
      input: 0.6,
      output: 0.6,
      speed: 150,
      context: 32_000,
      score: 68,
      vision: false,
      tools: null,
    },
  },
];

const usd = (value: number) => `$${value.toFixed(2)}`;
const metrics: ModelComparisonMetric[] = [
  {
    id: "input",
    label: "Input price",
    description: "per million tokens",
    better: "lower",
    format: usd,
  },
  {
    id: "output",
    label: "Output price",
    description: "per million tokens",
    better: "lower",
    format: usd,
  },
  { id: "speed", label: "Speed", description: "tokens per second", better: "higher" },
  {
    id: "context",
    label: "Context window",
    description: "tokens",
    better: "higher",
    format: (v) => `${String(v / 1000)}k`,
  },
  { id: "score", label: "Benchmark", description: "out of 100", better: "higher" },
  { id: "vision", label: "Image input" },
  { id: "tools", label: "Tool use" },
];

const meta = {
  title: "AI/Model Comparison",
  component: ModelComparison,
  args: { label: "Compare models", models, metrics },
  argTypes: { models: { control: false }, metrics: { control: false } },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ModelComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Each model can be chosen; the chosen column is tinted. */
export const Selectable: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState("sage");
    return <ModelComparison {...args} selected={selected} onSelect={setSelected} />;
  },
};
