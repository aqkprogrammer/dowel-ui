import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/form";

import { OtpInput } from "./otp-input";

const meta: Meta<typeof OtpInput> = {
  title: "Form/OTP Input",
  component: OtpInput,
  args: {
    length: 6,
    groups: [3, 3],
    allow: "numeric",
    mask: false,
    slotSize: "md",
    "aria-label": "Verification code",
  },
  argTypes: {
    allow: { control: "select", options: ["numeric", "alphanumeric", "alpha"] },
    slotSize: { control: "select", options: ["sm", "md", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** SmoothUI "Animated OTP Input": six digits in two groups of three. */
export const Default: Story = {};

/**
 * Every source item this component reproduces.
 *
 * - SmoothUI "Animated OTP Input" → `groups={[3, 3]}`. Slots rise in with a
 *   stagger, a digit flips in as it lands, the filled slot swells slightly
 *   and the active one rings; all in CSS. The source's per-slot hover scale is
 *   dropped: the real input sits over the slots and takes the pointer.
 * - The docs demo ("Verify Your Code") → a card that verifies on
 *   `onComplete` and resets. The input-otp library it was built on is not
 *   used; one native input does the same job with no dependency.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: function Gallery() {
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");
    return (
      <div className="flex flex-wrap items-start gap-10">
        <figure className="flex flex-col items-center gap-3">
          <OtpInput groups={[3, 3]} aria-label="One-time code" />
          <figcaption className="text-xs text-muted-foreground">
            SmoothUI · Animated OTP Input
          </figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-3">
          <div className="grid w-80 max-w-full gap-4 rounded-xl border border-border bg-card p-6 text-center text-card-foreground">
            <div className="grid gap-1">
              <h3 className="text-xl font-semibold">Verify your code</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to your device
              </p>
            </div>
            <OtpInput
              className="justify-self-center"
              aria-label="Verification code"
              value={code}
              onValueChange={setCode}
              onComplete={() => {
                setStatus("checking");
                setTimeout(() => {
                  setStatus("done");
                }, 1500);
              }}
            />
            <p role="status" className="min-h-5 text-sm text-muted-foreground">
              {status === "checking" ? "Verifying code…" : null}
              {status === "done" ? "Code verified." : null}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setCode("");
                setStatus("idle");
              }}
            >
              Reset code
            </Button>
          </div>
          <figcaption className="text-xs text-muted-foreground">
            SmoothUI · Animated OTP Input demo
          </figcaption>
        </figure>
      </div>
    );
  },
};

/** Inside the Dowel form: FormControl wires the label, description and error. */
export const InForm: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <FormField error="That code has expired. Request a new one.">
      <FormLabel>Verification code</FormLabel>
      <FormControl>
        <OtpInput groups={[3, 3]} defaultValue="4821" />
      </FormControl>
      <FormDescription>We sent it to the phone ending 42.</FormDescription>
      <FormMessage />
    </FormField>
  ),
};

/** Masked, alphanumeric, a custom separator, and every size. */
export const Options: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      <OtpInput aria-label="PIN" length={4} mask defaultValue="12" />
      <OtpInput
        aria-label="Recovery code"
        allow="alphanumeric"
        length={8}
        groups={[4, 4]}
        separator={<span className="text-lg">·</span>}
      />
      <OtpInput aria-label="Small code" slotSize="sm" length={4} />
      <OtpInput aria-label="Large code" slotSize="lg" length={4} />
      <OtpInput aria-label="Disabled code" disabled defaultValue="123456" />
    </div>
  ),
};
