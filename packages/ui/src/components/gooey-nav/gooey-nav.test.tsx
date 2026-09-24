import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { GooeyNav, gooeyNavOffset, gooeyNavSeam, type GooeyNavItem } from "./gooey-nav";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

const ITEMS = ["Home", "Work", "About", "Contact"];

const LINKS: GooeyNavItem[] = [
  { label: "Overview", href: "#overview", icon: <svg data-testid="icon" /> },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

function shape(element: HTMLElement) {
  const read = (name: string) => Number(element.style.getPropertyValue(name));
  return {
    x: read("--gooey-nav-x"),
    start: read("--gooey-nav-rs"),
    end: read("--gooey-nav-re"),
  };
}

beforeEach(() => {
  motionPreference.reduced = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GooeyNav", () => {
  it("renders a list of buttons with the first selected", () => {
    render(<GooeyNav items={ITEMS} aria-label="Sections" />);
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByRole("button", { name: "Work" })).not.toHaveAttribute("aria-current");
  });

  it("renders links with aria-current=page and decorative icons", () => {
    render(<GooeyNav items={LINKS} aria-label="Site" defaultValue={1} />);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "#overview");
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("styles the selected tile with activeClassName and the rest as muted", () => {
    render(
      <GooeyNav
        items={ITEMS}
        aria-label="Sections"
        activeClassName="bg-foreground text-background"
        itemClassName="font-semibold"
      />,
    );
    const home = screen.getByRole("button", { name: "Home" });
    const work = screen.getByRole("button", { name: "Work" });
    expect(home).toHaveClass("bg-foreground", "text-background", "font-semibold");
    expect(home).not.toHaveClass("bg-muted", "hover:text-foreground");
    expect(work).toHaveClass("bg-muted", "text-muted-foreground", "font-semibold");
    expect(work).not.toHaveClass("font-medium");
  });

  it("defaults the active tile to the primary colours", () => {
    render(<GooeyNav items={ITEMS} aria-label="Sections" />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
  });

  it("selects on click when uncontrolled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<GooeyNav items={ITEMS} aria-label="Sections" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByRole("button", { name: "About" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(onValueChange).toHaveBeenCalledWith(2);
    await user.click(screen.getByRole("button", { name: "About" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("only requests a change when controlled, and follows the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <GooeyNav items={ITEMS} aria-label="Sections" value={1} onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(onValueChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: "Work" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    function Controlled() {
      const [value, setValue] = useState(0);
      return (
        <GooeyNav items={ITEMS} aria-label="Other" value={value} onValueChange={setValue} />
      );
    }
    rerender(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(screen.getByRole("button", { name: "Contact" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("opens a gap on each side of the selected tile, with rounded corners along it", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    render(<GooeyNav items={ITEMS} aria-label="Sections" defaultValue={1} />);
    const [home, work, about, contact] = ITEMS.map((name) =>
      screen.getByRole("button", { name }),
    ) as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];

    // md: separation 20, radius 12. Seams open either side of Work.
    await waitFor(() => {
      expect(shape(home)).toEqual({ x: -20, start: 12, end: 12 });
    });
    expect(shape(work)).toEqual({ x: 0, start: 12, end: 12 });
    expect(shape(about)).toEqual({ x: 20, start: 12, end: 0 });
    expect(shape(contact)).toEqual({ x: 20, start: 0, end: 12 });

    // At an end only one gap opens, and the bar re-centres.
    await user.click(contact);
    await waitFor(() => {
      expect(shape(contact)).toEqual({ x: 10, start: 12, end: 12 });
    });
    expect(shape(home)).toEqual({ x: -10, start: 12, end: 0 });
    expect(shape(about)).toEqual({ x: -10, start: 0, end: 12 });
  });

  it("takes separation and radius from the size, or from props", async () => {
    motionPreference.reduced = true;
    const { rerender } = render(<GooeyNav items={ITEMS} aria-label="Sections" size="xs" />);
    const home = screen.getByRole("button", { name: "Home" });
    expect(home).toHaveClass("h-7", "text-xs");
    expect(screen.getByRole("list").style.paddingInline).toBe("14px");
    await waitFor(() => {
      expect(shape(home)).toEqual({ x: -7, start: 8, end: 8 });
    });

    rerender(<GooeyNav items={ITEMS} aria-label="Sections" size="lg" />);
    expect(home).toHaveClass("h-12", "text-base");
    expect(screen.getByRole("list").style.paddingInline).toBe("24px");

    rerender(
      <GooeyNav items={ITEMS} aria-label="Sections" size="sm" separation={30} radius={4} />,
    );
    expect(home).toHaveClass("h-8");
    expect(screen.getByRole("list").style.paddingInline).toBe("30px");
    await waitFor(() => {
      expect(shape(home)).toEqual({ x: -15, start: 4, end: 4 });
    });
  });

  it("derives seams and offsets from a continuous position", () => {
    expect(gooeyNavSeam(0, 0)).toBe(1);
    expect(gooeyNavSeam(0, 1)).toBe(1);
    expect(gooeyNavSeam(1, 0)).toBe(0);
    expect(gooeyNavSeam(1, 0.5)).toBe(0.5);
    expect(gooeyNavSeam(1, 2.25)).toBe(0.75);
    // Midway between 1 and 2 the total gap stays two separations.
    expect(gooeyNavOffset(0, 4, 1.5)).toBe(-1);
    expect(gooeyNavOffset(3, 4, 1.5)).toBe(1);
    expect(gooeyNavOffset(0, 1, 0)).toBe(0);
  });

  it("moves focus with arrow keys in the reading direction, Home and End", async () => {
    const user = userEvent.setup();
    render(
      <GooeyNav
        items={["One", { label: "Two", disabled: true }, "Three", "Four"]}
        aria-label="N"
      />,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Three" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Four" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Four" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByRole("button", { name: "Three" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("reverses the arrow keys right to left", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <GooeyNav items={ITEMS} aria-label="Sections" />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Work" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Home" })).toHaveFocus();
  });

  it("never selects a disabled item", () => {
    const onValueChange = vi.fn();
    render(
      <GooeyNav
        items={[...LINKS, { label: "Legacy", href: "#legacy", disabled: true }]}
        aria-label="Site"
        onValueChange={onValueChange}
      />,
    );
    const legacy = screen.getByRole("link", { name: "Legacy" });
    expect(legacy).toHaveAttribute("aria-disabled", "true");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(legacy, click);
    expect(click.defaultPrevented).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(
      <GooeyNav
        ref={ref}
        items={ITEMS}
        aria-label="Sections"
        data-testid="nav"
        className="overflow-visible"
      />,
    );
    const nav = screen.getByTestId("nav");
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass("overflow-visible");
    expect(nav).not.toHaveClass("overflow-x-auto");
  });

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<GooeyNav items={ITEMS} aria-label="Sections" />);
    await expectNoA11yViolations(container);
    rerender(<GooeyNav items={LINKS} aria-label="Site" />);
    await expectNoA11yViolations(container);
  });
});
