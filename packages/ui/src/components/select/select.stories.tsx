import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/label";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-64">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Select",
  component: SelectTrigger,
  args: { triggerSize: "md" },
  argTypes: { triggerSize: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof SelectTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid gap-2">
      <Label htmlFor="fruit">Fruit</Label>
      <Select>
        <SelectTrigger id="fruit" {...args}>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="grapes">Grapes</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Grouped: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="food">Food</Label>
      <Select>
        <SelectTrigger id="food">
          <SelectValue placeholder="Select something" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            <SelectItem value="carrot">Carrot</SelectItem>
            <SelectItem value="potato">Potato</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const WithDisabledOption: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Select>
      <SelectTrigger aria-label="Plan">
        <SelectValue placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hobby">Hobby</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="enterprise" disabled>
          Enterprise (contact sales)
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};

/** Past about a dozen options, people want to type — reach for Combobox. */
export const LongList: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Select>
      <SelectTrigger aria-label="Timezone">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 24 }, (_, index) => (
          <SelectItem key={index} value={`utc-${String(index)}`}>
            UTC{index >= 12 ? "+" : "-"}
            {String(Math.abs(index - 12)).padStart(2, "0")}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

export const Invalid: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="required-select">Region</Label>
      <Select>
        <SelectTrigger id="required-select" aria-invalid aria-describedby="region-error">
          <SelectValue placeholder="Select a region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="us">United States</SelectItem>
          <SelectItem value="eu">Europe</SelectItem>
        </SelectContent>
      </Select>
      <p id="region-error" className="text-xs text-destructive">
        Choose a region to continue.
      </p>
    </div>
  ),
};
