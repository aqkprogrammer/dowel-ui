import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";

import { PasswordStrength, type PasswordScore } from "./password-strength";

const meta = {
  title: "Form/Password Strength",
  component: PasswordStrength,
  args: { value: "Tango-tango", minLength: 12, showRules: true },
  argTypes: {
    minLength: { control: { type: "range", min: 6, max: 32, step: 1 } },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof PasswordStrength>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under a password field: type to see the meter and the checklist follow. */
export const Default: Story = {
  render: function Render(args) {
    const id = useId();
    const [password, setPassword] = useState(args.value);
    const [score, setScore] = useState<PasswordScore | null>(null);
    return (
      <form
        className="grid w-80 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Label htmlFor={`${id}-password`}>New password</Label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete="new-password"
          aria-describedby={`${id}-strength`}
          value={password}
          onChange={(event) => {
            setPassword(event.currentTarget.value);
          }}
        />
        <PasswordStrength
          {...args}
          id={`${id}-strength`}
          value={password}
          onScoreChange={setScore}
        />
        <Button type="submit" className="mt-2" disabled={(score?.score ?? 0) < 3}>
          Set password
        </Button>
      </form>
    );
  },
};

/** Just the meter, for a compact form. */
export const MeterOnly: Story = {
  args: { value: "abc", showRules: false },
  render: (args) => <PasswordStrength {...args} className="w-64" />,
};
