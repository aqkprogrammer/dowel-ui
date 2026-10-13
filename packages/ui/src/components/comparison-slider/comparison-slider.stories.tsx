import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";

import { ComparisonSlider } from "./comparison-slider";

const meta = {
  title: "Display/Comparison Slider",
  component: ComparisonSlider,
  args: {
    before: null,
    after: null,
    defaultValue: 50,
    interaction: "drag",
    orientation: "horizontal",
    hideLabels: false,
  },
  argTypes: {
    defaultValue: { control: { type: "range", min: 0, max: 100, step: 1 } },
    interaction: { control: "inline-radio", options: ["drag", "hover"] },
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
    before: { table: { disable: true } },
    after: { table: { disable: true } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ComparisonSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

function InviteCard() {
  return (
    <Card className="h-full rounded-none border-0 text-center">
      <CardHeader>
        <CardTitle>Invite your team</CardTitle>
        <CardDescription>Seats are billed monthly. Remove anyone at any time.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-2">
        <Button size="sm">Send invites</Button>
        <Button size="sm" variant="ghost">
          Later
        </Button>
      </CardContent>
    </Card>
  );
}

/** The same card in light and dark: drag the divider, or tab to it and use the arrows. */
export const Default: Story = {
  args: { beforeLabel: "Light", afterLabel: "Dark" },
  render: (args) => (
    <ComparisonSlider
      {...args}
      className="w-[min(28rem,90vw)] border border-border"
      before={
        <div className="h-48 bg-background text-foreground [color-scheme:light]">
          <InviteCard />
        </div>
      }
      after={
        <div className="dark h-48 bg-background text-foreground [color-scheme:dark]">
          <InviteCard />
        </div>
      }
    />
  ),
};

/** A redesign, compared by moving the mouse over it — no press needed. Touch still drags. */
export const FollowsTheMouse: Story = {
  args: { interaction: "hover", beforeLabel: "v1", afterLabel: "v2", defaultValue: 35 },
  render: (args) => (
    <ComparisonSlider
      {...args}
      className="w-[min(28rem,90vw)] border border-border"
      before={
        <div className="grid h-48 place-items-center bg-muted p-6 text-sm text-muted-foreground">
          <p>
            Status: <span className="font-mono">OK</span> · 3 incidents · last deploy 2h ago
          </p>
        </div>
      }
      after={
        <div className="flex h-48 flex-col justify-center gap-3 bg-card p-6">
          <div className="flex items-center gap-2">
            <Badge variant="success">Operational</Badge>
            <span className="text-sm text-card-foreground">All systems normal</span>
          </div>
          <p className="text-xs text-muted-foreground">
            3 incidents this month · deployed 2 hours ago
          </p>
        </div>
      }
    />
  ),
};

/** Top against bottom. */
export const Vertical: Story = {
  args: { orientation: "vertical", beforeLabel: "Before", afterLabel: "After" },
  render: (args) => (
    <ComparisonSlider
      {...args}
      className="h-72 w-72 border border-border"
      before={
        <div className="h-72 bg-[linear-gradient(135deg,var(--color-muted),var(--color-border))]" />
      }
      after={
        <div className="h-72 bg-[linear-gradient(135deg,var(--color-primary),var(--color-info))]" />
      }
    />
  ),
};
