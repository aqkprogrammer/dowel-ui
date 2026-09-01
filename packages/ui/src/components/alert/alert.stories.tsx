import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-96">
    <Story />
  </div>
);

const meta = {
  title: "Feedback/Alert",
  component: Alert,
  args: { variant: "default", live: "off" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "success", "warning", "info"],
    },
    live: { control: "select", options: ["off", "polite", "assertive"] },
  },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>Your trial ends in 3 days.</AlertDescription>
    </Alert>
  ),
};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="space-y-3">
      <Alert>
        <Info />
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>Deployment succeeded</AlertTitle>
        <AlertDescription>Build 1420 is live in production.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>Approaching your quota</AlertTitle>
        <AlertDescription>You have used 92% of your monthly builds.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Update your card to keep your workspace active.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const WithoutIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Alert>
      <AlertTitle>Scheduled maintenance</AlertTitle>
      <AlertDescription>Deployments pause on Sunday from 02:00 to 04:00 UTC.</AlertDescription>
    </Alert>
  ),
};

export const TitleOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Alert variant="info">
      <Info />
      <AlertTitle>Two-factor authentication is now required.</AlertTitle>
    </Alert>
  ),
};

/**
 * An alert that appears in response to a user action should announce itself.
 * The default `live="off"` avoids announcing notices that were already on screen.
 */
export const LiveRegion: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Alert live="assertive" variant="destructive">
      <CircleAlert />
      <AlertTitle>Could not save changes</AlertTitle>
      <AlertDescription>Check your connection and try again.</AlertDescription>
    </Alert>
  ),
};
