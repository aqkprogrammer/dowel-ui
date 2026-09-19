import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AccountMenu,
  AccountMenuOrders,
  AccountMenuProfileForm,
  AccountMenuSection,
  type AccountMenuOrder,
  type AccountMenuProps,
  type AccountMenuUser,
} from "./account-menu";

const USER = { name: "Jane Doe", email: "jane@example.com", avatarUrl: "/jane.jpg" };
const ORDERS: AccountMenuOrder[] = [
  { id: "ORD100", date: "2024-06-01", status: "delivered", progress: 100 },
  { id: "ORD101", date: "2024-06-10", status: "shipped", progress: 60 },
  { id: "ORD102", date: "2024-06-12", status: "processing", progress: 10 },
];

function Example(
  props: Partial<AccountMenuProps> & {
    onSave?: (u: AccountMenuUser) => void;
    onView?: (id: string) => void;
  },
) {
  const { onSave, onView, ...rest } = props;
  return (
    <AccountMenu user={USER} {...rest}>
      <AccountMenuSection
        value="profile"
        label="Edit profile"
        icon={<svg data-testid="icon" />}
      >
        <AccountMenuProfileForm onSave={onSave} />
      </AccountMenuSection>
      <AccountMenuSection value="orders" label="Last orders">
        <AccountMenuOrders orders={ORDERS} onView={onView} />
      </AccountMenuSection>
    </AccountMenu>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AccountMenu", () => {
  it("opens from the avatar into a dialog named by the user", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Account menu for Jane Doe" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Jane Doe" });
    expect(dialog).toHaveTextContent("jane@example.com");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit profile" })).toHaveFocus(),
    );
  });

  it("closes on Escape and returns focus to the avatar", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: /Account menu/ });
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("toggles one section at a time from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example defaultOpen />);
    const profile = await screen.findByRole("button", { name: "Edit profile" });
    const orders = screen.getByRole("button", { name: "Last orders" });
    const profilePanel = document.getElementById(profile.getAttribute("aria-controls")!);
    expect(profilePanel).toHaveAttribute("inert");

    profile.focus();
    await user.keyboard("{Enter}");
    expect(profile).toHaveAttribute("aria-expanded", "true");
    expect(profilePanel).not.toHaveAttribute("inert");
    expect(screen.getByRole("region", { name: "Edit profile" })).toBeInTheDocument();

    await user.click(orders);
    expect(orders).toHaveAttribute("aria-expanded", "true");
    expect(profile).toHaveAttribute("aria-expanded", "false");

    await user.click(orders);
    expect(orders).toHaveAttribute("aria-expanded", "false");
  });

  it("saves the edited profile and collapses the section", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Example defaultOpen defaultSection="profile" onSave={onSave} />);
    const name = await screen.findByLabelText("Name");
    expect(name).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("jane@example.com");
    await user.clear(name);
    await user.type(name, "Janet Doe");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith({ ...USER, name: "Janet Doe" });
    expect(screen.getByRole("button", { name: "Edit profile" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("lists orders with named progress that fills only while expanded", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(<Example defaultOpen onView={onView} />);
    const bar = await screen.findByRole("progressbar", {
      name: "Order ORD101 progress",
      hidden: true,
    });
    expect(bar).toHaveAttribute("aria-valuenow", "0");

    await user.click(screen.getByRole("button", { name: "Last orders" }));
    expect(screen.getByRole("progressbar", { name: "Order ORD101 progress" })).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
    await user.click(screen.getByRole("button", { name: "View order ORD102" }));
    expect(onView).toHaveBeenCalledWith("ORD102");
  });

  it("supports a controlled section", async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    const { rerender } = render(
      <Example defaultOpen section={null} onSectionChange={onSectionChange} />,
    );
    await user.click(await screen.findByRole("button", { name: "Last orders" }));
    expect(onSectionChange).toHaveBeenCalledWith("orders");
    expect(screen.getByRole("button", { name: "Last orders" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    rerender(<Example defaultOpen section="orders" onSectionChange={onSectionChange} />);
    expect(screen.getByRole("button", { name: "Last orders" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("uses initials without an avatar image, a custom label and consumer classNames", async () => {
    render(
      <Example
        defaultOpen
        user={{ name: "bo", email: "bo@example.com" }}
        triggerLabel="Your account"
        triggerClassName="rounded-md"
        className="w-96"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Your account" });
    expect(trigger).toHaveTextContent("B");
    expect(trigger).toHaveClass("rounded-md");
    const content = await screen.findByRole("dialog");
    expect(content).toHaveClass("w-96");
    expect(content).not.toHaveClass("w-72");
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("throws when a part is used outside AccountMenu", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <AccountMenuSection value="x" label="X">
          x
        </AccountMenuSection>,
      ),
    ).toThrow(/inside <AccountMenu>/);
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Example defaultSection="orders" />);
    await user.click(screen.getByRole("button", { name: /Account menu/ }));
    await screen.findByRole("dialog");
    await expectNoA11yViolations(baseElement);
  });
});
