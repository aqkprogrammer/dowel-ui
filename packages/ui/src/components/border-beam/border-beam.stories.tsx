import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";

import { BorderBeam } from "./border-beam";

const meta = {
  title: "Effects/Border Beam",
  component: BorderBeam,
  args: {
    tone: "primary",
    glow: false,
    duration: 6000,
    length: 0.2,
    thickness: 1,
    reverse: false,
    trigger: "always",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["primary", "brand", "foreground", "info", "success", "warning", "destructive"],
    },
    duration: { control: { type: "range", min: 1000, max: 15000, step: 500 } },
    length: { control: { type: "range", min: 0.05, max: 1, step: 0.05 } },
    thickness: { control: { type: "range", min: 1, max: 4, step: 0.5 } },
    trigger: { control: "inline-radio", options: ["always", "hover"] },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof BorderBeam>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A featured card with the beam on its hairline border. */
export const Default: Story = {
  render: (args) => (
    <Card className="relative w-[min(22rem,90vw)]">
      <CardHeader>
        <CardTitle>Pro</CardTitle>
        <CardDescription>Everything in Team, plus the licensed blocks.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-card-foreground">$29</p>
      </CardContent>
      <BorderBeam {...args} />
    </Card>
  ),
};

/** An AI action that glows while idle: the brand pair, with a soft glow. */
export const GenerateButton: Story = {
  args: { tone: "brand", glow: true, duration: 4000, length: 0.3 },
  render: (args) => (
    <Button variant="outline" className="relative">
      <Sparkles aria-hidden="true" />
      Generate with AI
      <BorderBeam {...args} />
    </Button>
  ),
};

/** Only while hovered or focused: tab to the field, or point at it. */
export const OnHover: Story = {
  args: { trigger: "hover", tone: "info", duration: 3000 },
  render: (args) => (
    <div className="relative w-72 rounded-md">
      <Input aria-label="Ask anything" placeholder="Ask anything…" />
      <BorderBeam {...args} />
    </div>
  ),
};

/** Two beams chasing each other: the second starts half a lap behind and runs the other way. */
export const Pair: Story = {
  args: { tone: "brand", length: 0.15 },
  render: (args) => (
    <div className="relative grid size-56 place-items-center rounded-3xl border border-border bg-card">
      <span className="text-sm text-muted-foreground">Synced</span>
      <BorderBeam {...args} />
      <BorderBeam {...args} tone="info" reverse delay={-3000} />
    </div>
  ),
};
