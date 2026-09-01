import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bold, Italic, Underline } from "lucide-react";

import { Button } from "@/components/button";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Overlays/Tooltip",
  component: Tooltip,
  args: { delayDuration: 200 },
  argTypes: {
    delayDuration: { control: { type: "number", min: 0, max: 1000, step: 50 } },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover or focus me</Button>
      </TooltipTrigger>
      <TooltipContent>Deploys the current branch</TooltipContent>
    </Tooltip>
  ),
};

/**
 * On an icon-only control the accessible name comes from aria-label. The
 * tooltip repeats it visually; it does not supply it.
 */
export const IconButtons: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        {[
          { icon: Bold, label: "Bold" },
          { icon: Italic, label: "Italic" },
          { icon: Underline, label: "Underline" },
        ].map(({ icon: Icon, label }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={label}>
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};

export const Sides: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap gap-3">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="outline">{side}</Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Anchored {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};

export const LongText: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button variant="outline">Retention</Button>
      </TooltipTrigger>
      <TooltipContent>
        Logs are kept for 30 days on the current plan, then aggregated into daily summaries.
      </TooltipContent>
    </Tooltip>
  ),
};
