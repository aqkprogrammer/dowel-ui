import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";

import { Stepper, type StepperProps, type StepperStep } from "./stepper";

function Panel({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-6">
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** The four steps of the SmoothUI demo. */
const STEPS: StepperStep[] = [
  {
    label: "Account",
    description: "Create your account",
    content: (
      <Panel title="Account details">
        Enter your email and create a password to get started.
      </Panel>
    ),
  },
  {
    label: "Profile",
    description: "Set up your profile",
    content: (
      <Panel title="Profile information">
        Add your name, avatar, and bio to personalise your experience.
      </Panel>
    ),
  },
  {
    label: "Preferences",
    description: "Choose your preferences",
    content: <Panel title="Preferences">Select your notification preferences and theme.</Panel>,
  },
  {
    label: "Complete",
    description: "You're all set",
    content: (
      <Panel title="All done!">Your account is ready. Start exploring the platform.</Panel>
    ),
  },
];

/** A stepper driven by the wizard's own Previous and Next buttons. */
function Wizard(props: Omit<StepperProps, "steps">) {
  const [step, setStep] = useState(0);
  return (
    <div className="grid w-full max-w-2xl gap-8">
      <Stepper steps={STEPS} step={step} onStepChange={setStep} {...props} />
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={step === 0}
          onClick={() => {
            setStep((s) => Math.max(0, s - 1));
          }}
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={step === STEPS.length - 1}
          onClick={() => {
            setStep((s) => Math.min(STEPS.length - 1, s + 1));
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof Stepper> = {
  title: "Navigation/Stepper",
  component: Stepper,
  args: {
    steps: STEPS,
    orientation: "horizontal",
    navigation: "all",
  },
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    navigation: { control: "select", options: ["none", "completed", "all"] },
    steps: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Animated Stepper" demo: click navigation plus Previous / Next. */
export const Default: Story = {
  render: ({ steps: _steps, ...args }) => <Wizard {...args} />,
};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Animated Stepper" (horizontal, `allowClickNavigation`) →
 *   `navigation="all"`.
 * - SmoothUI "Animated Stepper" `variant="vertical"` → `orientation="vertical"`.
 * - `StepItem.icon` → `icon` on a step; it gives way to the check once done.
 *
 * The source's steps were tabs (role="tab" with aria-selected), which promised
 * a tablist that was not there. Here they are an ordered list with
 * aria-current="step", and only buttons when `navigation` allows it.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-12">
      <figure className="grid gap-3">
        <Wizard navigation="all" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Animated Stepper (horizontal)
        </figcaption>
      </figure>
      <figure className="grid gap-3">
        <Wizard navigation="all" orientation="vertical" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Animated Stepper (vertical)
        </figcaption>
      </figure>
      <figure className="grid gap-3">
        <Stepper
          defaultStep={1}
          navigation="completed"
          steps={[
            { label: "Cart", icon: <ShoppingCart /> },
            { label: "Shipping", icon: <Package /> },
            { label: "Payment", icon: <CreditCard /> },
          ]}
        />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Animated Stepper (step icons)
        </figcaption>
      </figure>
    </div>
  ),
};

/** Indicator only: the wizard drives it, the steps are not buttons. */
export const IndicatorOnly: Story = {
  args: { navigation: "none", defaultStep: 2 },
};

/** Right-to-left: the list, connectors, slide and arrow keys all mirror. */
export const RightToLeft: Story = {
  render: ({ steps: _steps, ...args }) => (
    <div dir="rtl">
      <Wizard {...args} />
    </div>
  ),
};
