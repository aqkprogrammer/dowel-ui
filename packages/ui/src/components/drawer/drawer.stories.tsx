import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";

import {
  Drawer,
  DrawerBody,
  DrawerCancel,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

const meta = {
  title: "Overlays/Drawer",
  component: Drawer,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag the handle downward to dismiss, or use Escape or Cancel. */
export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Narrow down the deployment list.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-2 text-sm text-muted-foreground">
          <p>Status, branch, environment and author filters would live here.</p>
        </DrawerBody>
        <DrawerFooter>
          <Button>Apply filters</Button>
          <DrawerCancel>Cancel</DrawerCancel>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const ScrollingContent: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Pick a region</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Region</DrawerTitle>
          <DrawerDescription>Where your workloads run.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="max-h-72">
          <ul className="grid gap-1 text-sm">
            {[
              "us-east-1",
              "us-west-2",
              "eu-west-1",
              "eu-central-1",
              "ap-south-1",
              "ap-southeast-2",
              "sa-east-1",
              "af-south-1",
            ].map((region) => (
              <li key={region}>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                >
                  {region}
                </button>
              </li>
            ))}
          </ul>
        </DrawerBody>
        <DrawerFooter>
          <DrawerCancel>Cancel</DrawerCancel>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

/** Without a handle the drawer cannot be dragged; keep an explicit way out. */
export const WithoutHandle: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open</Button>
      </DrawerTrigger>
      <DrawerContent showHandle={false}>
        <DrawerHeader>
          <DrawerTitle>Confirm</DrawerTitle>
          <DrawerDescription>This drawer cannot be dragged away.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="destructive">Delete</Button>
          <DrawerCancel>Cancel</DrawerCancel>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
