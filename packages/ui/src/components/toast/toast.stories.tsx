import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import { Toaster, type ToastPosition } from "./toast";
import { toast } from "./toast-store";

const meta = {
  title: "Feedback/Toast",
  component: Toaster,
  args: { position: "bottom-right" },
  argTypes: {
    position: {
      control: "select",
      options: [
        "top-left",
        "top-center",
        "top-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ] satisfies ToastPosition[],
    },
    duration: { control: { type: "number", min: 1000, max: 20000, step: 500 } },
  },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <>
      <Button onClick={() => toast("Project created")}>Show toast</Button>
      <Toaster {...args} />
    </>
  ),
};

export const Variants: Story = {
  render: (args) => (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => toast("Saved")}>
          Default
        </Button>
        <Button variant="outline" onClick={() => toast.success("Deployment succeeded")}>
          Success
        </Button>
        <Button variant="outline" onClick={() => toast.info("Build queued")}>
          Info
        </Button>
        <Button variant="outline" onClick={() => toast.warning("Approaching your quota")}>
          Warning
        </Button>
        <Button variant="outline" onClick={() => toast.error("Payment failed")}>
          Error
        </Button>
      </div>
      <Toaster {...args} />
    </>
  ),
};

export const WithDescription: Story = {
  render: (args) => (
    <>
      <Button
        onClick={() =>
          toast.success("Project created", {
            description: "acme-inc is ready. Deploy when you are.",
          })
        }
      >
        Show toast
      </Button>
      <Toaster {...args} />
    </>
  ),
};

/** An action needs alt text: "Undo" alone is meaningless once the toast is gone. */
export const WithAction: Story = {
  render: (args) => (
    <>
      <Button
        onClick={() =>
          toast("Message archived", {
            action: {
              label: "Undo",
              altText: "Undo archiving the message",
              onClick: () => toast.success("Message restored"),
            },
          })
        }
      >
        Archive message
      </Button>
      <Toaster {...args} />
    </>
  ),
};

export const Persistent: Story = {
  render: (args) => (
    <>
      <Button
        variant="outline"
        onClick={() =>
          toast.custom({
            title: "Connection lost",
            description: "Reconnecting…",
            variant: "destructive",
            duration: Infinity,
          })
        }
      >
        Show until dismissed
      </Button>
      <Toaster {...args} />
    </>
  ),
};

export const Promise: Story = {
  render: (args) => (
    <>
      <Button
        variant="outline"
        onClick={() => {
          const work = new window.Promise<string>((resolve) => {
            window.setTimeout(() => {
              resolve("acme-inc");
            }, 1500);
          });

          void toast.promise(work, {
            loading: "Creating project…",
            success: (name) => `Created ${name}`,
            error: "Could not create the project",
          });
        }}
      >
        Create project
      </Button>
      <Toaster {...args} />
    </>
  ),
};

export const Stacking: Story = {
  render: (args) => (
    <>
      <Button
        variant="outline"
        onClick={() => {
          for (let index = 1; index <= 6; index += 1) {
            toast(`Event ${String(index)}`);
          }
        }}
      >
        Raise six toasts
      </Button>
      <Toaster {...args} />
    </>
  ),
};
