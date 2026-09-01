import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/label";

import { Switch } from "./switch";

const meta = {
  title: "Forms/Switch",
  component: Switch,
  args: { disabled: false },
  argTypes: { disabled: { control: "boolean" } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" {...args} />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-3">
      {[
        { id: "off", label: "Off", checked: false },
        { id: "on", label: "On", checked: true },
      ].map((state) => (
        <div key={state.id} className="flex items-center gap-2">
          <Switch id={state.id} checked={state.checked} />
          <Label htmlFor={state.id}>{state.label}</Label>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="disabled-on" disabled checked />
        <Label htmlFor="disabled-on">Disabled and on</Label>
      </div>
    </div>
  ),
};

/** A switch applies immediately — if it needs a Save button, use a Checkbox. */
export const SettingsRow: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-80 divide-y divide-border rounded-lg border border-border">
      {[
        { id: "row-1", label: "Automatic deploys", hint: "Deploy every push to main." },
        { id: "row-2", label: "Preview comments", hint: "Comment on pull requests." },
      ].map((row) => (
        <div key={row.id} className="flex items-start justify-between gap-4 p-4">
          <div className="grid gap-1">
            <Label htmlFor={row.id}>{row.label}</Label>
            <p className="text-xs text-muted-foreground">{row.hint}</p>
          </div>
          <Switch id={row.id} defaultChecked={row.id === "row-1"} />
        </div>
      ))}
    </div>
  ),
};
