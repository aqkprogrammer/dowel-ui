import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Overlays/Popover",
  component: PopoverContent,
  args: { side: "bottom", align: "center" },
  argTypes: {
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
    align: { control: "inline-radio", options: ["start", "center", "end"] },
  },
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Dimensions</Button>
      </PopoverTrigger>
      <PopoverContent {...args} aria-labelledby="dimensions-heading">
        <div className="grid gap-3">
          <div className="space-y-1">
            <h4 id="dimensions-heading" className="text-sm font-medium">
              Dimensions
            </h4>
            <p className="text-xs text-muted-foreground">Set the layout for the layer.</p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <Label htmlFor="width">Width</Label>
              <Input id="width" inputSize="sm" defaultValue="100%" className="col-span-2" />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label htmlFor="height">Height</Label>
              <Input id="height" inputSize="sm" defaultValue="24px" className="col-span-2" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

/** Growth direction follows the anchor, so every side reads as one motion. */
export const Sides: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger asChild>
            <Button variant="outline">{side}</Button>
          </PopoverTrigger>
          <PopoverContent side={side} className="w-48" aria-label={`Opened from the ${side}`}>
            <p className="text-sm">Opened from the {side}.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};

export const WithArrow: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Show details</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" aria-label="Deployment details">
        <p className="text-sm">Deployed 4 minutes ago from main.</p>
        <PopoverArrow />
      </PopoverContent>
    </Popover>
  ),
};
