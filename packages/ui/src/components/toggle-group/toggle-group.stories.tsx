import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  LayoutGrid,
  List,
  Rows3,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

/**
 * Annotated rather than inferred: the group's props are a union of Radix's
 * single and multiple types, which `satisfies` cannot name in the emitted
 * declaration.
 */
const meta: Meta<typeof ToggleGroup> = {
  title: "Form/Toggle Group",
  component: ToggleGroup,
  parameters: { layout: "centered", controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

/** Single choice slides one pill between items; multiple choice springs a highlight into each. */
export const Default: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-5">
      <ToggleGroup type="single" variant="outline" defaultValue="start" aria-label="Alignment">
        <ToggleGroupItem value="start" aria-label="Align start">
          <AlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align centre">
          <AlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem value="end" aria-label="Align end">
          <AlignRight />
        </ToggleGroupItem>
        <ToggleGroupItem value="justify" aria-label="Justify">
          <AlignJustify />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="multiple" defaultValue={["bold"]} aria-label="Formatting">
        <ToggleGroupItem value="bold" aria-label="Bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline">
          <Underline />
        </ToggleGroupItem>
        <ToggleGroupItem value="strike" aria-label="Strikethrough">
          <Strikethrough />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};

/** Labelled items: the pill stretches between widths as it travels. */
export const Segmented: Story = {
  render: () => (
    <ToggleGroup type="single" variant="outline" defaultValue="week" aria-label="Range">
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
      <ToggleGroupItem value="quarter">Quarter</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      {(["sm", "md", "lg"] as const).map((size) => (
        <ToggleGroup
          key={size}
          type="single"
          variant="outline"
          size={size}
          defaultValue="grid"
          aria-label={`Layout, ${size}`}
        >
          <ToggleGroupItem value="grid" aria-label="Grid">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List">
            <List />
          </ToggleGroupItem>
          <ToggleGroupItem value="rows" aria-label="Rows">
            <Rows3 />
          </ToggleGroupItem>
        </ToggleGroup>
      ))}
    </div>
  ),
};

function FilterDemo() {
  const [tags, setTags] = useState<string[]>(["design", "motion"]);
  return (
    <div className="flex flex-col items-center gap-3">
      <ToggleGroup type="multiple" value={tags} onValueChange={setTags} aria-label="Topics">
        {["design", "motion", "a11y", "tokens"].map((tag) => (
          <ToggleGroupItem key={tag} value={tag}>
            {tag}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        Selected: {tags.length > 0 ? tags.join(", ") : "none"}
      </p>
    </div>
  );
}

/** Controlled multiple selection. */
export const Controlled: Story = {
  render: () => <FilterDemo />,
};
