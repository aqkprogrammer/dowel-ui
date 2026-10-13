import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeviceMockup } from "./device-mockup";

/** A small piece of live UI to put on the screens. */
function Screen({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex size-full flex-col gap-3 bg-linear-to-b from-primary/10 to-background p-4 pt-10">
      <p className="text-sm font-semibold text-foreground">Good morning</p>
      <div className="grid grid-cols-2 gap-2">
        {["Revenue", "Users", "Uptime", "Latency"].slice(0, compact ? 2 : 4).map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold text-foreground">—</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-auto rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        View report
      </button>
    </div>
  );
}

const meta = {
  title: "Display/Device Mockup",
  component: DeviceMockup,
  args: { device: "phone", tilt: "none" },
  argTypes: {
    device: { control: "inline-radio", options: ["phone", "tablet", "laptop", "browser"] },
    tilt: { control: "inline-radio", options: ["none", "left", "right", "back"] },
    orientation: { control: "inline-radio", options: ["portrait", "landscape"] },
  },
  parameters: { layout: "padded" },
  render: (args) => (
    <DeviceMockup {...args}>
      <Screen compact={args.device === "phone"} />
    </DeviceMockup>
  ),
} satisfies Meta<typeof DeviceMockup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {};
export const Tablet: Story = { args: { device: "tablet", orientation: "landscape" } };
export const Laptop: Story = { args: { device: "laptop", tilt: "back" } };
export const Browser: Story = { args: { device: "browser", url: "app.example.com/dashboard" } };

/** Tilted for a hero; hover or tab into it to straighten it. */
export const Tilted: Story = {
  args: { device: "phone", tilt: "left", caption: "Live on iOS and Android" },
};
