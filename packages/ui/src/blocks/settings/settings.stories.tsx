import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SettingsBlock, type SettingsNotification } from "./settings";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[48rem] max-w-full">
    <Story />
  </div>
);

const PROFILE = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  bio: "Working on analytical engines.",
};

const NOTIFICATIONS: SettingsNotification[] = [
  {
    id: "deploys",
    label: "Deployment updates",
    description: "When a deploy starts or finishes.",
    enabled: true,
  },
  {
    id: "failures",
    label: "Build failures",
    description: "Only when something breaks.",
    enabled: true,
  },
  {
    id: "digest",
    label: "Weekly digest",
    description: "A summary every Monday morning.",
    enabled: false,
  },
];

const meta = {
  title: "Blocks/Settings",
  component: SettingsBlock,
  args: { profile: PROFILE, notifications: NOTIFICATIONS },
  parameters: { controls: { disable: true } },
  decorators: [withPageWidth],
} satisfies Meta<typeof SettingsBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Switches apply immediately. There is no Save button, and that is the point. */
export const Interactive: Story = {
  render: function Interactive() {
    const [notifications, setNotifications] = useState(NOTIFICATIONS);
    const [pending, setPending] = useState(false);

    return (
      <SettingsBlock
        profile={PROFILE}
        notifications={notifications}
        pending={pending}
        onToggleNotification={(id, enabled) => {
          setNotifications((current) =>
            current.map((item) => (item.id === id ? { ...item, enabled } : item)),
          );
        }}
        onSaveProfile={() => {
          setPending(true);
          window.setTimeout(() => {
            setPending(false);
          }, 1000);
        }}
      />
    );
  },
};

export const WithExtraTab: Story = {
  args: {
    extraTabs: [
      {
        value: "billing",
        label: "Billing",
        content: (
          <p className="p-6 text-sm text-muted-foreground">
            You are on the Pro plan, billed yearly. Next invoice 1 October.
          </p>
        ),
      },
    ],
  },
};
