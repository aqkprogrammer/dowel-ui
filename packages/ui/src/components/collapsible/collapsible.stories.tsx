import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const meta = {
  title: "Layout/Collapsible",
  component: Collapsible,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible className="grid gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit">
          Advanced settings
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          Options most people never need, kept out of the way until they do.
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const OpenByDefault: Story = {
  render: () => (
    <Collapsible defaultOpen className="grid gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit">
          Details
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-lg border border-border p-4 text-sm">Already open.</div>
      </CollapsibleContent>
    </Collapsible>
  ),
};
