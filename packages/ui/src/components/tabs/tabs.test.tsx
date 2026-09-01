import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsListProps } from "./tabs";

function Example({
  variant,
  onValueChange,
  activationMode,
}: {
  variant?: TabsListProps["variant"];
  onValueChange?: (value: string) => void;
  activationMode?: "automatic" | "manual";
} = {}) {
  return (
    <Tabs defaultValue="account" onValueChange={onValueChange} activationMode={activationMode}>
      <TabsList variant={variant}>
        <TabsTrigger value="account" variant={variant}>
          Account
        </TabsTrigger>
        <TabsTrigger value="password" variant={variant}>
          Password
        </TabsTrigger>
        <TabsTrigger value="team" variant={variant} disabled>
          Team
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
      <TabsContent value="team">Team panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows only the active panel", () => {
    render(<Example />);
    expect(screen.getByText("Account panel")).toBeInTheDocument();
    expect(screen.queryByText("Password panel")).not.toBeInTheDocument();
  });

  it("marks the active tab as selected", () => {
    render(<Example />);
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Password" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches panels on click", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("tab", { name: "Password" }));
    expect(screen.getByText("Password panel")).toBeInTheDocument();
    expect(screen.queryByText("Account panel")).not.toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("tab", { name: "Account" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Password" })).toHaveFocus();
    expect(screen.getByText("Password panel")).toBeInTheDocument();
  });

  it("keeps only the active tab in the tab sequence", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Account" })).toHaveFocus();

    // A second Tab leaves the tablist entirely rather than visiting each tab.
    await user.tab();
    expect(screen.getByRole("tab", { name: "Password" })).not.toHaveFocus();
  });

  it("skips disabled tabs when arrowing", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("tab", { name: "Password" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Team" })).not.toHaveFocus();
  });

  it("defers activation in manual mode", async () => {
    const user = userEvent.setup();
    render(<Example activationMode="manual" />);

    await user.click(screen.getByRole("tab", { name: "Account" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Password" })).toHaveFocus();
    expect(screen.getByText("Account panel")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(screen.getByText("Password panel")).toBeInTheDocument();
  });

  it("reports value changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onValueChange={onValueChange} />);

    await user.click(screen.getByRole("tab", { name: "Password" }));
    expect(onValueChange).toHaveBeenCalledWith("password");
  });

  it.each([
    ["solid", "bg-muted"],
    ["underline", "border-b"],
  ] as const)("applies the %s list variant", (variant, expectedClass) => {
    render(<Example variant={variant} />);
    expect(screen.getByRole("tablist")).toHaveClass(expectedClass);
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="bg-card">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel</TabsContent>
      </Tabs>,
    );

    const list = screen.getByRole("tablist");
    expect(list).toHaveClass("bg-card");
    expect(list).not.toHaveClass("bg-muted");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });
});
