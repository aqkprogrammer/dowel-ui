import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SignaturePad } from "./signature-pad";

const meta: Meta<typeof SignaturePad> = {
  title: "Form/Signature Pad",
  component: SignaturePad,
  args: { label: "Signature", size: "md", allowTyped: true, disabled: false },
  argTypes: { size: { control: "select", options: ["sm", "md", "lg"] } },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Draw with a mouse, finger or pen; the faster you go, the thinner the line. */
export const Default: Story = {};

function WithPreview() {
  const [signature, setSignature] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <SignaturePad label="Sign to accept delivery" onChange={setSignature} name="signature" />
      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
        {signature ? (
          <img src={signature} alt="Your signature" className="h-full object-contain" />
        ) : (
          "The saved image appears here"
        )}
      </div>
    </div>
  );
}

/** The PNG it hands to `onChange`, shown as it is saved. */
export const WithPreviewImage: Story = {
  parameters: { controls: { disable: true } },
  render: () => <WithPreview />,
};

/** Small, initials only, without the typed alternative. */
export const Initials: Story = {
  args: { label: "Initials", size: "sm", allowTyped: false, placeholder: "Initial here" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
