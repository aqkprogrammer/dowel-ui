import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";

import { Progress } from "./progress";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-72">
    <Story />
  </div>
);

const meta = {
  title: "Feedback/Progress",
  component: Progress,
  args: { value: 40, size: "md", tone: "primary", "aria-label": "Upload" },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100 } },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    tone: { control: "select", options: ["primary", "success", "warning", "destructive"] },
    easing: { control: "inline-radio", options: ["smooth", "spring"] },
    effect: { control: "inline-radio", options: ["none", "striped", "shine"] },
    fillOnMount: { control: "boolean" },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The number belongs on screen too — a bar alone is hard to read precisely. */
export const WithLabel: Story = {
  parameters: { controls: { disable: true } },
  render: function WithLabel() {
    const [value, setValue] = useState(12);

    useEffect(() => {
      const timer = setInterval(() => {
        setValue((current) => (current >= 100 ? 0 : current + 4));
      }, 400);
      return () => {
        clearInterval(timer);
      };
    }, []);

    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm">
          <span id="upload-label">Uploading assets</span>
          <span className="text-muted-foreground tabular-nums">{value}%</span>
        </div>
        <Progress value={value} aria-labelledby="upload-label" />
      </div>
    );
  },
};

/** No known duration — announced as indeterminate, not as zero percent. */
export const Indeterminate: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      <span className="text-sm" id="indeterminate-label">
        Preparing your export…
      </span>
      <Progress aria-labelledby="indeterminate-label" />
    </div>
  ),
};

export const Tones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      {(["primary", "success", "warning", "destructive"] as const).map((tone) => (
        <Progress key={tone} tone={tone} value={65} aria-label={tone} />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Progress key={size} size={size} value={55} aria-label={size} />
      ))}
    </div>
  ),
};

/**
 * SmoothUI's AnimatedProgressBar: a springy fill (`easing="spring"`) that runs
 * up from empty when it appears (`fillOnMount`), plus two opt-in textures
 * (`effect`). Press "Step" to watch the spring settle on each new value.
 */
export const AnimatedProgressBar: Story = {
  parameters: { controls: { disable: true } },
  render: function AnimatedProgressBar() {
    const [value, setValue] = useState(30);
    return (
      <div className="grid gap-5">
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            setValue((current) => (current >= 100 ? 10 : current + 30));
          }}
        >
          Step
        </Button>
        <div className="grid gap-1.5">
          <span className="text-sm text-muted-foreground">
            Spring, fills on mount · {value}%
          </span>
          <Progress value={value} easing="spring" fillOnMount aria-label="Spring" />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm text-muted-foreground">Striped · {value}%</span>
          <Progress value={value} effect="striped" size="lg" aria-label="Striped" />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm text-muted-foreground">Shine · {value}%</span>
          <Progress value={value} effect="shine" tone="success" aria-label="Shine" />
        </div>
      </div>
    );
  },
};
