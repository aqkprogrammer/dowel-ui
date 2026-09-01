import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/label";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "Forms/Radio Group",
  component: RadioGroup,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Density</legend>
      <RadioGroup defaultValue="comfortable">
        {[
          { value: "default", label: "Default" },
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ].map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <fieldset className="w-80">
      <legend className="mb-3 text-sm font-medium">Plan</legend>
      <RadioGroup defaultValue="pro" className="gap-3">
        {[
          { value: "hobby", label: "Hobby", hint: "For personal projects. Free forever." },
          { value: "pro", label: "Pro", hint: "For teams shipping to production. $20/month." },
          { value: "enterprise", label: "Enterprise", hint: "SSO, audit logs and support." },
        ].map((plan) => (
          <div key={plan.value} className="flex items-start gap-2">
            <RadioGroupItem value={plan.value} id={plan.value} className="mt-0.5" />
            <div className="grid gap-1">
              <Label htmlFor={plan.value}>{plan.label}</Label>
              <p className="text-xs text-muted-foreground">{plan.hint}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  ),
};

/** A selected radio cannot be cleared, so offer an explicit "None". */
export const WithNoneOption: Story = {
  render: () => (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Notification sound</legend>
      <RadioGroup defaultValue="none">
        {[
          { value: "none", label: "None" },
          { value: "chime", label: "Chime" },
          { value: "ping", label: "Ping" },
        ].map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem value={option.value} id={`sound-${option.value}`} />
            <Label htmlFor={`sound-${option.value}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  ),
};

export const WithDisabledOption: Story = {
  render: () => (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Region</legend>
      <RadioGroup defaultValue="us">
        {[
          { value: "us", label: "United States", disabled: false },
          { value: "eu", label: "Europe", disabled: false },
          { value: "ap", label: "Asia Pacific (coming soon)", disabled: true },
        ].map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem
              value={option.value}
              id={`region-${option.value}`}
              disabled={option.disabled}
            />
            <Label htmlFor={`region-${option.value}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  ),
};
