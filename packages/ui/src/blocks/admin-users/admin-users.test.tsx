import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AdminUsersBlock, type AdminUser } from "./admin-users";

const USERS: AdminUser[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "Owner",
    status: "Active",
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admin",
    status: "Active",
    lastActive: "Yesterday",
  },
  {
    id: "3",
    name: "Katherine Johnson",
    email: "kj@example.com",
    role: "Member",
    status: "Invited",
    lastActive: "Never",
  },
  {
    id: "4",
    name: "Radia Perlman",
    email: "radia@example.com",
    role: "Viewer",
    status: "Suspended",
    lastActive: "3 weeks ago",
  },
];

function rowCount(): number {
  const body = screen.getAllByRole("rowgroup")[1];
  return body ? within(body).queryAllByRole("row").length : 0;
}

describe("AdminUsersBlock", () => {
  it("renders a row per user", () => {
    render(<AdminUsersBlock users={USERS} />);
    expect(rowCount()).toBe(4);
  });

  it("gives the filter a real label, not just a placeholder", () => {
    render(<AdminUsersBlock users={USERS} />);
    // A placeholder disappears the moment anyone types, taking the field's name
    // with it.
    expect(screen.getByLabelText("Filter by name or email")).toBeInTheDocument();
  });

  it("filters by name and by email", async () => {
    const user = userEvent.setup();
    render(<AdminUsersBlock users={USERS} />);

    await user.type(screen.getByLabelText("Filter by name or email"), "grace");
    await waitFor(() => {
      expect(rowCount()).toBe(1);
    });
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Filter by name or email"));
    await user.type(screen.getByLabelText("Filter by name or email"), "kj@example");
    await waitFor(() => {
      expect(screen.getByText("Katherine Johnson")).toBeInTheDocument();
    });
  });

  it("announces the matching count, since results change unbidden", async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminUsersBlock users={USERS} />);

    const status = container.querySelector("[aria-live='polite']");
    expect(status).toHaveTextContent("4 people match the filter.");

    await user.type(screen.getByLabelText("Filter by name or email"), "grace");
    await waitFor(() => {
      expect(status).toHaveTextContent("1 person match");
    });
  });

  it("shows an empty state naming the query that found nothing", async () => {
    const user = userEvent.setup();
    render(<AdminUsersBlock users={USERS} />);

    await user.type(screen.getByLabelText("Filter by name or email"), "zzzz");
    expect(await screen.findByText(/No one matches/)).toBeInTheDocument();
  });

  it("names each row's action button after its row", () => {
    render(<AdminUsersBlock users={USERS} />);
    // Four identical "Actions" buttons say nothing about which row you are on.
    expect(
      screen.getByRole("button", { name: "Actions for Ada Lovelace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Grace Hopper" }),
    ).toBeInTheDocument();
  });

  it("runs the row actions", async () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersBlock users={USERS} onEdit={onEdit} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Actions for Ada Lovelace" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit member" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada Lovelace" }));

    await user.click(screen.getByRole("button", { name: "Actions for Grace Hopper" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove from team" }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ name: "Grace Hopper" }));
  });

  it("states each status in words", () => {
    render(<AdminUsersBlock users={USERS} />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(screen.getByText("Invited")).toBeInTheDocument();
  });

  it("sorts by a column", async () => {
    const user = userEvent.setup();
    render(<AdminUsersBlock users={USERS} />);

    await user.click(screen.getByRole("button", { name: /User, not sorted/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Sort descending" }));

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /User/ })).toHaveAttribute(
        "aria-sort",
        "descending",
      );
    });
  });

  it("invites people", async () => {
    const onInvite = vi.fn();
    const user = userEvent.setup();
    render(<AdminUsersBlock users={USERS} onInvite={onInvite} />);

    await user.click(screen.getByRole("button", { name: "Invite people" }));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<AdminUsersBlock users={USERS} />);
    await expectNoA11yViolations(container);
  });
});
