import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";

import { ConfirmTyped } from "./confirm-typed";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const meta = {
  title: "Form/Confirm Typed",
  component: ConfirmTyped,
  decorators: [withWidth],
  args: {
    expected: "acme-api",
    action: "Delete project",
    onConfirm: () => undefined,
    children: (
      <p className="text-sm text-muted-foreground">
        This deletes the project, its deployments and its logs. It cannot be undone.
      </p>
    ),
  },
} satisfies Meta<typeof ConfirmTyped>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Press the button, or Enter, before the name matches and it says what it
 * expected. Type the name and it says the action is available. Neither is
 * a colour change.
 */
export const Default: Story = {};

/** The action running. The button stays where it is, and says so. */
export const Pending: Story = {
  args: { pending: true, value: "acme-api" },
};

/** For a name people will not remember the capitalisation of. */
export const CaseInsensitive: Story = {
  args: { expected: "Acme Corporation", caseSensitive: false, action: "Leave organisation" },
};

/** An action worth confirming that is not a deletion. */
export const NotDestructive: Story = {
  args: {
    expected: "dana@acme.test",
    action: "Transfer ownership",
    variant: "primary",
    children: (
      <p className="text-sm text-muted-foreground">
        Dana becomes the owner. You stay a member and lose billing access.
      </p>
    ),
  },
};

/** Where it usually lives. Confirming closes the dialog. */
export const InADialog: Story = {
  parameters: { controls: { disable: true } },
  render: function InADialog() {
    const [open, setOpen] = useState(false);
    const [deleted, setDeleted] = useState(false);

    return (
      <div className="flex flex-col gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={deleted}>
              {deleted ? "Project deleted" : "Delete project…"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete acme-api</DialogTitle>
              <DialogDescription>
                This deletes the project, its deployments and its logs. It cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <ConfirmTyped
              expected="acme-api"
              action="Delete project"
              onConfirm={() => {
                setDeleted(true);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};
