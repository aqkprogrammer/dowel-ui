"use client";

import { useState } from "react";

import {
  SettingsBlock,
  type SettingsNotification,
  type SettingsProfile,
} from "@/components/blocks/settings";

export default function SettingsPage() {
  const [profile, setProfile] = useState<SettingsProfile>({
    name: "Ada Lovelace",
    email: "ada@example.com",
    bio: "Replace this with the signed-in user.",
  });

  const [notifications, setNotifications] = useState<SettingsNotification[]>([
    {
      id: "product",
      label: "Product updates",
      description: "New features and changes worth knowing about.",
      enabled: true,
    },
    {
      id: "billing",
      label: "Billing",
      description: "Invoices, failed payments and plan changes.",
      enabled: true,
    },
    {
      id: "digest",
      label: "Weekly digest",
      description: "A summary of activity every Monday.",
      enabled: false,
    },
  ]);

  return (
    <SettingsBlock
      profile={profile}
      notifications={notifications}
      onSaveProfile={setProfile}
      onToggleNotification={(id, enabled) => {
        setNotifications((previous) =>
          previous.map((entry) => (entry.id === id ? { ...entry, enabled } : entry)),
        );
      }}
    />
  );
}
