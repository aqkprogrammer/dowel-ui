import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SettingsBlock, type SettingsNotification } from "./settings";

const PROFILE = { name: "Ada Lovelace", email: "ada@example.com", bio: "Building things." };

const NOTIFICATIONS: SettingsNotification[] = [
  {
    id: "deploys",
    label: "Deployment updates",
    description: "When a deploy finishes.",
    enabled: true,
  },
  {
    id: "digest",
    label: "Weekly digest",
    description: "A summary every Monday.",
    enabled: false,
  },
];

describe("SettingsBlock", () => {
  it("opens on the profile tab", () => {
    render(<SettingsBlock profile={PROFILE} notifications={NOTIFICATIONS} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
  });

  it("saves the profile as a staged change", async () => {
    const onSaveProfile = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsBlock
        profile={PROFILE}
        notifications={NOTIFICATIONS}
        onSaveProfile={onSaveProfile}
      />,
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Ada L");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada L" }));
  });

  it("refuses to save an invalid profile", async () => {
    const onSaveProfile = vi.fn();
    const user = userEvent.setup();
    render(
      <SettingsBlock
        profile={PROFILE}
        notifications={NOTIFICATIONS}
        onSaveProfile={onSaveProfile}
      />,
    );

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSaveProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  describe("notifications", () => {
    it("apply immediately, with no Save button", async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(
        <SettingsBlock
          profile={PROFILE}
          notifications={NOTIFICATIONS}
          onToggleNotification={onToggle}
        />,
      );

      await user.click(screen.getByRole("tab", { name: "Notifications" }));
      await user.click(await screen.findByRole("switch", { name: "Weekly digest" }));

      expect(onToggle).toHaveBeenCalledWith("digest", true);
      // A switch that needs saving is a broken promise.
      expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    });

    it("labels every switch", async () => {
      const user = userEvent.setup();
      render(<SettingsBlock profile={PROFILE} notifications={NOTIFICATIONS} />);

      await user.click(screen.getByRole("tab", { name: "Notifications" }));
      expect(await screen.findByRole("switch", { name: "Deployment updates" })).toBeChecked();
    });
  });

  describe("the danger zone", () => {
    async function openDialog() {
      const user = userEvent.setup();
      const onDeleteAccount = vi.fn();
      render(
        <SettingsBlock
          profile={PROFILE}
          notifications={NOTIFICATIONS}
          onDeleteAccount={onDeleteAccount}
        />,
      );

      await user.click(screen.getByRole("tab", { name: "Danger zone" }));
      await user.click(await screen.findByRole("button", { name: "Delete account" }));
      const dialog = await screen.findByRole("dialog");
      return { user, onDeleteAccount, dialog };
    }

    it("names what will be destroyed", async () => {
      await openDialog();
      // Not "Are you sure?" — that tells nobody anything they did not know.
      expect(
        screen.getByRole("dialog", { name: /Delete Ada Lovelace.s account\?/ }),
      ).toBeInTheDocument();
      expect(screen.getByText(/permanently deletes the account/)).toBeInTheDocument();
    });

    it("stays disabled until the email is typed exactly", async () => {
      const { user, dialog } = await openDialog();

      // Scoped to the dialog: while it is open the trigger behind it is inert,
      // so a document-wide query finds only one button and the index is a trap.
      const confirm = within(dialog).getByRole("button", { name: "Delete account" });
      expect(confirm).toBeDisabled();

      await user.type(screen.getByLabelText(/to confirm/), "ada@example.com");
      await waitFor(() => {
        expect(confirm).toBeEnabled();
      });
    });

    it("deletes only after confirmation", async () => {
      const { user, onDeleteAccount, dialog } = await openDialog();

      await user.type(screen.getByLabelText(/to confirm/), "ada@example.com");
      await user.click(within(dialog).getByRole("button", { name: "Delete account" }));
      expect(onDeleteAccount).toHaveBeenCalledTimes(1);
    });
  });

  it("accepts extra tabs", async () => {
    const user = userEvent.setup();
    render(
      <SettingsBlock
        profile={PROFILE}
        notifications={NOTIFICATIONS}
        extraTabs={[{ value: "billing", label: "Billing", content: <p>Your plan is Pro.</p> }]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Billing" }));
    expect(await screen.findByText("Your plan is Pro.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <SettingsBlock profile={PROFILE} notifications={NOTIFICATIONS} />,
    );
    await expectNoA11yViolations(container);
  });
});
