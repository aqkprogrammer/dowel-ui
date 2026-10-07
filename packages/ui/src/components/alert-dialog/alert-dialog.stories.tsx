import type { Meta, StoryObj } from "@storybook/react-vite";
import { CloudUpload, KeyRound, Trash2 } from "lucide-react";

import { Button } from "@/components/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

/**
 * Annotated rather than inferred with `satisfies`: AlertDialog is a direct
 * re-export of the Radix root, whose props type cannot be named from this path
 * in the emitted declaration (TS2883).
 */
const meta: Meta<typeof AlertDialog> = {
  title: "Overlays/Alert Dialog",
  component: AlertDialog,
  parameters: { layout: "centered", controls: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof AlertDialog>;

/** The destructive tone: the card springs up out of a blur, and the bin gives one shake as it lands. */
export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          Delete project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent tone="destructive" className="max-w-md">
        <AlertDialogHeader icon={<Trash2 />}>
          <AlertDialogTitle>Delete acme-inc?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the project, its 42 deployments and every environment
            variable. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep project</AlertDialogCancel>
          <AlertDialogAction>Delete project</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** The default tone: the same entrance, a neutral tile and a primary action. */
export const Confirmation: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>
          <CloudUpload />
          Publish
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader icon={<CloudUpload />}>
          <AlertDialogTitle>Publish to production?</AlertDialogTitle>
          <AlertDialogDescription>
            Version 2.4.0 goes live for every customer. You can roll back from the deployments
            page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction>Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** Plain text, no tile: the sections still follow the card in one after another. */
export const WithoutIcon: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Sign out everywhere</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of every device?</AlertDialogTitle>
          <AlertDialogDescription>
            You will need to sign in again on your phone, tablet and any other browser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Sign out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** AlertDialogMedia composed by hand, with the buttons restyled through `variant`. */
export const CustomMedia: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary">
          <KeyRound />
          Revoke key
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent tone="destructive" className="max-w-sm">
        <AlertDialogHeader className="items-center text-center">
          <AlertDialogMedia className="size-12 rounded-2xl">
            <KeyRound />
          </AlertDialogMedia>
          <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
          <AlertDialogDescription>
            Anything still using <code>sk_live_…3f9a</code> stops working immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
          <AlertDialogAction>Revoke key</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
