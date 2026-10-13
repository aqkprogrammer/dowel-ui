import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ApiKeysBlock, type ApiKey } from "./api-keys";

const keys: ApiKey[] = [
  {
    id: "a",
    name: "Server",
    preview: "sk_live_…aaaa",
    scopes: ["read", "write"],
    created: "2026-01-05T10:00:00Z",
    lastUsed: "2026-02-01T10:00:00Z",
  },
  {
    id: "b",
    name: "Laptop",
    preview: "sk_test_…bbbb",
    scopes: ["read"],
    created: "2026-01-10T10:00:00Z",
    lastUsed: null,
  },
];

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("ApiKeysBlock", () => {
  it("lists keys in a captioned table inside a focusable region, masked", async () => {
    const { container } = render(<ApiKeysBlock keys={keys} locale="en-GB" />);
    const table = screen.getByRole("table", { name: "API keys" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("sk_live_…aaaa")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "API keys table" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("button", { name: "Revoke Laptop" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("offers to create the first key when there are none", () => {
    render(<ApiKeysBlock keys={[]} />);
    expect(screen.getByText("No API keys yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create key" })).toBeInTheDocument();
  });

  it("asks for a name and a permission before creating", () => {
    const onCreate = vi.fn();
    render(<ApiKeysBlock keys={keys} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    const dialog = screen.getByRole("dialog", { name: "Create an API key" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Read/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create key" }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText("Name the key after what will use it."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Choose at least one permission.")).toBeInTheDocument();
  });

  it("creates a key, shows it once, then lists it masked", async () => {
    const onCreate = vi.fn(({ name, scopes }: { name: string; scopes: string[] }) =>
      Promise.resolve({
        secret: "sk_live_supersecretvalue1234",
        key: {
          id: "new",
          name,
          preview: "sk_live_…1234",
          scopes,
          created: "2026-03-01T10:00:00Z",
          lastUsed: null,
        },
      }),
    );
    render(<ApiKeysBlock keys={keys} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Worker" } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Write/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create key" }));
    await settle();
    expect(onCreate).toHaveBeenCalledWith({ name: "Worker", scopes: ["read", "write"] });
    expect(screen.getByRole("dialog", { name: "Your new key" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("sk_live_supersecretvalue1234")).toBeInTheDocument();
    expect(screen.getByText(/Key “Worker” created/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I have saved it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("sk_live_…1234")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("sk_live_supersecretvalue1234")).not.toBeInTheDocument();
  });

  it("makes a demo key in the browser without onCreate", async () => {
    render(<ApiKeysBlock keys={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Demo" } });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Create key" }),
    );
    await settle();
    const field = screen.getByDisplayValue(/^sk_live_[A-Za-z0-9]{32}$/);
    expect(field).toBeInTheDocument();
  });

  it("asks before revoking, and removes the key when confirmed", async () => {
    const onRevoke = vi.fn();
    render(<ApiKeysBlock keys={keys} onRevoke={onRevoke} />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke Server" }));
    const alert = screen.getByRole("alertdialog", { name: "Revoke “Server”?" });
    expect(alert).toHaveTextContent("stops working immediately");
    fireEvent.click(within(alert).getByRole("button", { name: "Revoke key" }));
    await settle();
    expect(onRevoke).toHaveBeenCalledWith("a");
    expect(screen.queryByText("Server")).not.toBeInTheDocument();
    expect(screen.getByText(/Key “Server” revoked/)).toBeInTheDocument();
  });

  it("keeps a key whose revoke fails", async () => {
    const onRevoke = vi.fn(() => Promise.reject(new Error("no")));
    render(<ApiKeysBlock keys={keys} onRevoke={onRevoke} />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke Laptop" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Revoke key" }),
    );
    await settle();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText(/couldn't be revoked/)).toBeInTheDocument();
  });
});
