import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RailNav, railNavHookPath, type RailNavItem } from "./rail-nav";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const ITEMS: RailNavItem[] = [
  { label: "Getting started", heading: true },
  "Introduction",
  "Installation",
  { label: "Theming", disabled: true },
  { label: "Components", heading: true },
  "Button",
  "Card",
];

const LINKS: RailNavItem[] = [
  { label: "Overview", href: "#overview" },
  { label: "Usage", href: "#usage" },
  { label: "API", href: "#api" },
];

/** Every row 32px tall, stacked: row i is centred at 32i + 16. */
function layOutRows() {
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.parentElement ? [...this.parentElement.children].indexOf(this) * 32 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(32);
}

function accentPath(container: HTMLElement) {
  return container.querySelector('[data-slot="rail-nav-rail-accent"]')?.getAttribute("d");
}

beforeEach(() => {
  motionPreference.reduced = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RailNav", () => {
  it("renders a list of buttons with headings, the first selectable row current", () => {
    render(<RailNav items={ITEMS} aria-label="Docs" />);
    const nav = screen.getByRole("navigation", { name: "Docs" });
    expect(nav).toHaveAttribute("data-indicator", "bounce");
    expect(screen.getAllByRole("listitem")).toHaveLength(ITEMS.length);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Introduction" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("Getting started")).toHaveAttribute(
      "data-slot",
      "rail-nav-heading",
    );
    expect(screen.queryByRole("button", { name: "Getting started" })).toBeNull();
  });

  it("renders links with aria-current=page", () => {
    render(<RailNav items={LINKS} aria-label="On this page" defaultValue={1} />);
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "#usage");
    expect(screen.getByRole("link", { name: "API" })).not.toHaveAttribute("aria-current");
  });

  it("names the navigation after its visible label unless given aria-label", () => {
    const { rerender } = render(<RailNav items={LINKS} label="Guides" />);
    expect(screen.getByRole("navigation", { name: "Guides" })).toBeInTheDocument();
    rerender(<RailNav items={LINKS} label="Guides" aria-label="Guide pages" />);
    expect(screen.getByRole("navigation", { name: "Guide pages" })).toBeInTheDocument();
    rerender(<RailNav items={LINKS} />);
    expect(screen.getByRole("navigation")).not.toHaveAttribute("aria-labelledby");
  });

  it("selects on click when uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RailNav items={ITEMS} aria-label="Docs" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Card" }));
    expect(screen.getByRole("button", { name: "Card" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "Introduction" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(onValueChange).toHaveBeenCalledWith(6);

    await user.click(screen.getByRole("button", { name: "Card" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RailNav items={ITEMS} aria-label="Docs" value={2} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Button" }));
    expect(onValueChange).toHaveBeenCalledWith(5);
    expect(screen.getByRole("button", { name: "Installation" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("follows the controlled value", async () => {
    function Controlled() {
      const [value, setValue] = useState(1);
      return <RailNav items={ITEMS} aria-label="Docs" value={value} onValueChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Installation" }));
    expect(screen.getByRole("button", { name: "Installation" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("marks nothing when the value points at a heading", () => {
    render(<RailNav items={ITEMS} aria-label="Docs" value={0} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-current");
    }
  });

  it("keeps every row in the Tab order and moves with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<RailNav items={ITEMS} aria-label="Docs" />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Introduction" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Installation" })).toHaveFocus();

    // The disabled row and the heading are skipped.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Button" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "Installation" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Card" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Introduction" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "Card" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Introduction" })).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button", { name: "Installation" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await user.keyboard("a");
    expect(screen.getByRole("button", { name: "Installation" })).toHaveFocus();
  });

  it("never selects a disabled row", () => {
    const onValueChange = vi.fn();
    render(
      <RailNav
        items={[...LINKS, { label: "Legacy", href: "#legacy", disabled: true }]}
        aria-label="Docs"
        onValueChange={onValueChange}
      />,
    );
    const legacy = screen.getByRole("link", { name: "Legacy" });
    expect(legacy).toHaveAttribute("aria-disabled", "true");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(legacy, click);
    expect(click.defaultPrevented).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(legacy).not.toHaveAttribute("aria-current");
  });

  it("draws a bounce marker by default and a hook rail on request", () => {
    const { container, rerender } = render(<RailNav items={LINKS} aria-label="Docs" />);
    expect(container.querySelector('[data-slot="rail-nav-marker"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.querySelector('[data-slot="rail-nav-rail"]')).toBeNull();

    rerender(<RailNav items={LINKS} aria-label="Docs" indicator="hook" />);
    const rail = container.querySelector('[data-slot="rail-nav-rail"]');
    expect(rail).toHaveAttribute("aria-hidden", "true");
    expect(rail).toHaveAttribute("stroke-dasharray", "3 3");
    expect(container.querySelector('[data-slot="rail-nav-marker"]')).toBeNull();

    rerender(<RailNav items={LINKS} aria-label="Docs" indicator="hook" dashed={false} />);
    expect(rail).not.toHaveAttribute("stroke-dasharray");
  });

  it("hooks the rail into the active row's centre", async () => {
    layOutRows();
    motionPreference.reduced = true;
    const user = userEvent.setup();
    const { container } = render(
      <RailNav items={LINKS} aria-label="Docs" indicator="hook" defaultValue={1} />,
    );
    await waitFor(() => {
      expect(accentPath(container)).toBe(railNavHookPath(48));
    });
    await user.click(screen.getByRole("link", { name: "API" }));
    await waitFor(() => {
      expect(accentPath(container)).toBe(railNavHookPath(80));
    });
  });

  it("builds the hook path from the top, clamping the corner near the top", () => {
    expect(railNavHookPath(48)).toBe("M1 0V40A8 8 0 0 0 9 48H18");
    expect(railNavHookPath(4)).toBe("M1 0V0A4 4 0 0 0 5 4H18");
    expect(railNavHookPath(-10)).toBe("M1 0V0A0 0 0 0 0 1 0H18");
  });

  it("draws the neutral rail to a hovered or focused row", async () => {
    const user = userEvent.setup();
    const { container } = render(<RailNav items={LINKS} aria-label="Docs" indicator="hook" />);
    const neutral = container.querySelector('[data-slot="rail-nav-rail-hover"]');
    expect(neutral).toHaveAttribute("data-state", "hidden");

    fireEvent.pointerEnter(screen.getByRole("link", { name: "API" }));
    expect(neutral).toHaveAttribute("data-state", "visible");
    fireEvent.pointerLeave(container.querySelector('[data-slot="rail-nav-track"]')!);
    expect(neutral).toHaveAttribute("data-state", "hidden");

    // Hovering the active row itself draws nothing extra.
    fireEvent.pointerEnter(screen.getByRole("link", { name: "Overview" }));
    expect(neutral).toHaveAttribute("data-state", "hidden");
    fireEvent.pointerLeave(container.querySelector('[data-slot="rail-nav-track"]')!);

    await user.tab();
    await user.tab();
    expect(neutral).toHaveAttribute("data-state", "visible");
    await user.tab();
    await user.tab();
    expect(neutral).toHaveAttribute("data-state", "hidden");
  });

  it("colours the marker from the color prop, defaulting to primary", () => {
    render(<RailNav items={LINKS} aria-label="Docs" data-testid="nav" />);
    expect(screen.getByTestId("nav").style.getPropertyValue("--rail-nav-accent")).toBe(
      "var(--color-primary)",
    );
    render(<RailNav items={LINKS} aria-label="Docs 2" color="tomato" data-testid="tinted" />);
    expect(screen.getByTestId("tinted").style.getPropertyValue("--rail-nav-accent")).toBe(
      "tomato",
    );
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <RailNav ref={ref} items={LINKS} aria-label="Docs" className="gap-6" data-testid="nav" />,
    );
    const nav = screen.getByTestId("nav");
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass("gap-6");
    expect(nav).not.toHaveClass("gap-2");
  });

  it("has no accessibility violations with either indicator", async () => {
    const { container, rerender } = render(<RailNav items={ITEMS} label="Docs" />);
    await expectNoA11yViolations(container);
    rerender(
      <RailNav
        items={[...LINKS, { label: "More", heading: true }]}
        label="Docs"
        indicator="hook"
      />,
    );
    await expectNoA11yViolations(container);
  });
});
