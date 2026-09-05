import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLabel,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

function Shell({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex">
        <Sidebar label="Application">
          <SidebarHeader>
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton href="/app" isActive>
                    <SidebarMenuLabel>Dashboard</SidebarMenuLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton href="/app/billing">
                    <SidebarMenuLabel>Billing</SidebarMenuLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>Content</SidebarInset>
      </div>
    </SidebarProvider>
  );
}

describe("Sidebar", () => {
  it("names its navigation landmark", () => {
    render(<Shell />);

    // A page has several navigation regions; three called "navigation" is a
    // list nobody can choose from.
    expect(screen.getAllByRole("navigation", { name: "Application" }).length).toBeGreaterThan(
      0,
    );
  });

  it("marks the current page rather than only colouring it", () => {
    render(<Shell />);

    const active = screen.getAllByRole("link", { name: "Dashboard" })[0];
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Billing" })[0]).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders the menu as a list", () => {
    render(<Shell />);

    const list = screen.getAllByRole("list")[0]!;
    expect(list.tagName).toBe("UL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("points the trigger at the sidebar it controls", () => {
    render(<Shell />);

    const trigger = screen.getAllByRole("button", { name: /navigation/ })[0]!;
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it("labels the trigger with what pressing it does, not the current state", () => {
    render(<Shell />);

    // Expanded, so the useful half is what happens next.
    expect(
      screen.getAllByRole("button", { name: "Collapse navigation" })[0],
    ).toBeInTheDocument();
  });

  it("toggles from the keyboard, and relabels itself", async () => {
    const user = userEvent.setup();
    render(<Shell />);

    const trigger = screen.getAllByRole("button", { name: "Collapse navigation" })[0]!;
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("button", { name: "Expand navigation" })[0]).toBeInTheDocument();
  });

  it("keeps every entry named when the rail collapses", async () => {
    const user = userEvent.setup();
    render(<Shell />);

    await user.click(screen.getAllByRole("button", { name: "Collapse navigation" })[0]!);

    // Removing the label would leave a control whose only content is an icon,
    // and a column of links all announced as "link".
    expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Billing" })[0]).toBeInTheDocument();
  });

  it("keeps the group heading available when collapsed", async () => {
    const user = userEvent.setup();
    render(<Shell />);

    await user.click(screen.getAllByRole("button", { name: "Collapse navigation" })[0]!);
    expect(screen.getAllByText("Workspace")[0]).toBeInTheDocument();
  });

  it("reports the open state to a controlling parent", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar label="Application">
          <SidebarTrigger />
        </Sidebar>
      </SidebarProvider>,
    );

    await user.click(screen.getAllByRole("button", { name: "Collapse navigation" })[0]!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders a router's own link through asChild", () => {
    render(
      <SidebarProvider>
        <Sidebar label="Application">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <a href="/app" data-router="yes">
                  <SidebarMenuLabel>Dashboard</SidebarMenuLabel>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );

    const link = screen.getAllByRole("link", { name: "Dashboard" })[0]!;
    expect(link).toHaveAttribute("data-router", "yes");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("says which component was used outside a provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<SidebarTrigger />)).toThrow(/SidebarTrigger must be rendered inside/);
    error.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Shell />);
    await expectNoA11yViolations(container);
  });
});

/** A viewport on the far side of the breakpoint, for the length of one test. */
function pretendNarrow(): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Sidebar on a wide screen", () => {
  it("does not mount the overlay, so the page beside it stays reachable", () => {
    render(<Shell />);

    // The bug this guards against: a modal sheet that CSS hides is still modal.
    // It hid the whole page from assistive technology and turned pointer
    // events off on the body, on every desktop, whenever the rail was open.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).not.toHaveAttribute("aria-hidden");
    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});

describe("Sidebar on a narrow screen", () => {
  it("starts closed, whatever the rail's default", () => {
    pretendNarrow();
    render(<Shell defaultOpen />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens the navigation as a named dialog, and closes it on Escape", async () => {
    pretendNarrow();
    const user = userEvent.setup();
    render(<Shell />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Application" });
    expect(within(dialog).getByRole("link", { name: "Billing" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the labels in the overlay even when the rail is collapsed", async () => {
    pretendNarrow();
    const user = userEvent.setup();
    render(<Shell defaultOpen={false} />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Application" });

    // The rail's collapsed state hides labels visually; the sheet is always
    // wide enough for them, and hiding them there would leave icon-only links.
    const label = within(dialog).getByText("Billing");
    expect(label).not.toHaveClass("sr-only");
  });
});
