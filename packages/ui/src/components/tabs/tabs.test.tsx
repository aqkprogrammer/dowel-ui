import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function Sliding({
  variant,
  orientation,
}: {
  variant?: TabsListProps["variant"];
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <Tabs defaultValue="account" orientation={orientation}>
      <TabsList variant={variant} indicator="slide">
        <TabsTrigger value="account" variant={variant}>
          Account
        </TabsTrigger>
        <TabsTrigger value="password" variant={variant}>
          Password
        </TabsTrigger>
        <TabsTrigger value="team" variant={variant}>
          Team
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
      <TabsContent value="team">Team panel</TabsContent>
    </Tabs>
  );
}

/** jsdom has no layout: give each tab a box by its label. */
function stubGeometry() {
  const lefts: Record<string, number> = { Account: 4, Password: 90, Team: 180 };
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const left = lefts[this.textContent] ?? 0;
    return DOMRect.fromRect({ x: left, y: 0, width: 80, height: 28 });
  });
}

describe("Tabs sliding indicator (SmoothUI AnimatedTabs)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders no indicator by default", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("[data-slot='tabs-indicator']")).toBeNull();
    expect(screen.getByRole("tablist")).not.toHaveAttribute("data-indicator");
  });

  it("renders a decorative indicator under the active tab when opted in", () => {
    stubGeometry();
    const { container } = render(<Sliding />);
    const indicator = container.querySelector<HTMLElement>("[data-slot='tabs-indicator']");

    expect(screen.getByRole("tablist")).toHaveAttribute("data-indicator", "slide");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(indicator).toHaveAttribute("data-ready");
    expect(indicator?.style.transform).toBe("translate(4px, 0px)");
    expect(indicator?.style.width).toBe("80px");
  });

  it("follows the selection from pointer and keyboard", async () => {
    stubGeometry();
    const user = userEvent.setup();
    const { container } = render(<Sliding />);
    const indicator = () =>
      container.querySelector<HTMLElement>("[data-slot='tabs-indicator']")?.style.transform;

    await user.click(screen.getByRole("tab", { name: "Password" }));
    expect(indicator()).toBe("translate(90px, 0px)");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Team" })).toHaveFocus();
    expect(indicator()).toBe("translate(180px, 0px)");
  });

  it("uses the offset box when the list is the tab's offset parent", () => {
    vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.closest("[role='tablist']");
    });
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(12);
    vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockReturnValue(3);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(64);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(36);

    const { container } = render(<Sliding variant="underline" />);
    const indicator = container.querySelector<HTMLElement>("[data-slot='tabs-indicator']");

    // The underline sits on the trigger's own 2px bottom border.
    expect(indicator?.style.transform).toBe("translate(12px, 37px)");
    expect(indicator?.style.height).toBe("2px");
    expect(indicator).toHaveClass("bg-primary");
  });

  it("keeps the arrow-key pattern in a vertical list", async () => {
    const user = userEvent.setup();
    render(<Sliding orientation="vertical" />);

    await user.click(screen.getByRole("tab", { name: "Account" }));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Password" })).toHaveFocus();
    expect(screen.getByText("Password panel")).toBeInTheDocument();
  });

  it("only strips the trigger's own active styling once the indicator has measured", () => {
    render(<Sliding />);
    const list = screen.getByRole("tablist");
    expect(list.className).toContain(
      "has-[>[data-slot=tabs-indicator][data-ready]]:[&_[role=tab][data-state=active]]:bg-transparent",
    );
    // The trigger itself is untouched: its active background is still there
    // for the moment before measuring, and for anyone not opting in.
    expect(screen.getByRole("tab", { name: "Account" })).toHaveClass(
      "data-[state=active]:bg-background",
    );
  });

  it("stops the slide under reduced motion", () => {
    const { container } = render(<Sliding />);
    expect(container.querySelector("[data-slot='tabs-indicator']")).toHaveClass(
      "motion-reduce:transition-none",
    );
  });

  it("keeps the indicator out of the tab sequence and the tab count", () => {
    render(<Sliding />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("has no accessibility violations with the indicator", async () => {
    const { container } = render(<Sliding />);
    await expectNoA11yViolations(container);
  });
});
