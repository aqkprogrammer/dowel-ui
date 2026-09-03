import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Cron, CronBuilder, CronExpression, CronNextRuns } from "./cron-editor";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

/** Fixed, so the next runs in the docs do not depend on when you read them. */
const NOW = new Date("2026-09-03T08:00:00Z");

const meta: Meta<typeof Cron> = {
  title: "Form/Cron Editor",
  component: Cron,
  decorators: [withWidth],
  args: {
    defaultValue: "0 9 * * 1",
    timeZone: "Europe/London",
    now: NOW,
  },
  render: (args) => (
    <Cron {...args}>
      <CronBuilder />
      <CronExpression />
      <CronNextRuns />
    </Cron>
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The reason this exists. Change a control and the expression follows; edit
 * the expression and the controls follow, until it says something they
 * cannot — then the field is the editor and says so. The next runs are in
 * the zone named beside them, which is the part every hand-rolled version
 * leaves you guessing at.
 */
export const RoundTrip: Story = {
  parameters: { controls: { disable: true } },
  render: function RoundTrip() {
    const [value, setValue] = useState("30 8 * * 1-5");
    return (
      <div className="flex flex-col gap-3">
        <Cron value={value} onValueChange={setValue} timeZone="Europe/London" now={NOW}>
          <CronBuilder />
          <CronExpression />
          <CronNextRuns />
        </Cron>
        <p className="text-xs text-muted-foreground">
          Saved value: <code className="font-mono">{value}</code>
        </p>
      </div>
    );
  },
};

/** The expression and its reading alone, for a settings row with no room for a builder. */
export const ExpressionOnly: Story = {
  args: { defaultValue: "*/15 9-17 * * 1-5" },
  render: (args) => (
    <Cron {...args}>
      <CronExpression />
    </Cron>
  ),
};

/** Both day fields set. Cron fires when either matches, and the sentence says "or". */
export const EitherDayMatches: Story = {
  args: { defaultValue: "0 12 1 * 1" },
};

/** A schedule that can never fire says so instead of showing an empty list. */
export const NeverRuns: Story = {
  args: { defaultValue: "0 0 30 2 *" },
};

/** The same wall-clock time in three zones is three different instants. */
export const InThreeZones: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {["America/New_York", "Europe/London", "Asia/Kolkata"].map((zone) => (
        <Cron key={zone} defaultValue="0 9 * * *" timeZone={zone} now={NOW}>
          <CronNextRuns count={3} />
        </Cron>
      ))}
    </div>
  ),
};
