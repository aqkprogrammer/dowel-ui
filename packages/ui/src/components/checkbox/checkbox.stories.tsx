import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Label } from "@/components/label";

import { Checkbox } from "./checkbox";

const meta = {
  title: "Forms/Checkbox",
  component: Checkbox,
  args: { disabled: false },
  argTypes: { disabled: { control: "boolean" } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" {...args} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithDescription: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-start gap-2">
      <Checkbox id="marketing" className="mt-0.5" />
      <div className="grid gap-1">
        <Label htmlFor="marketing">Product updates</Label>
        <p className="text-xs text-muted-foreground">
          Occasional email about new features. No more than once a month.
        </p>
      </div>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      {[
        { id: "s1", label: "Unchecked", checked: false as const },
        { id: "s2", label: "Checked", checked: true as const },
        { id: "s3", label: "Indeterminate", checked: "indeterminate" as const },
      ].map((state) => (
        <div key={state.id} className="flex items-center gap-2">
          <Checkbox id={state.id} checked={state.checked} />
          <Label htmlFor={state.id}>{state.label}</Label>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Checkbox id="s4" disabled />
        <Label htmlFor="s4">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="s5" disabled checked />
        <Label htmlFor="s5">Disabled and checked</Label>
      </div>
    </div>
  ),
};

/** Indeterminate summarises a partial selection; the user never cycles into it. */
export const SelectAll: Story = {
  parameters: { controls: { disable: true } },
  render: function SelectAll() {
    const items = ["Analytics", "Deployments", "Logs"];
    const [selected, setSelected] = useState<string[]>(["Analytics"]);

    const all = selected.length === items.length;
    const some = selected.length > 0 && !all;

    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="all"
            checked={all ? true : some ? "indeterminate" : false}
            onCheckedChange={(checked) => {
              setSelected(checked === true ? items : []);
            }}
          />
          <Label htmlFor="all">Select all</Label>
        </div>
        <div className="ml-6 grid gap-3">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Checkbox
                id={item}
                checked={selected.includes(item)}
                onCheckedChange={(checked) => {
                  setSelected((current) =>
                    checked ? [...current, item] : current.filter((entry) => entry !== item),
                  );
                }}
              />
              <Label htmlFor={item}>{item}</Label>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Invalid: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Checkbox id="invalid" aria-invalid aria-describedby="invalid-error" />
        <Label htmlFor="invalid">Accept terms</Label>
      </div>
      <p id="invalid-error" className="text-xs text-destructive">
        You must accept the terms to continue.
      </p>
    </div>
  ),
};
