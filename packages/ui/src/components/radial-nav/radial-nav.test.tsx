import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

import { expectNoA11yViolations } from "../../../test/a11y";
import { RadialNav, radialNavArc, radialNavNearest, type RadialNavItem } from "./radial-nav";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof MotionModule>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  motionPreference.reduced = false;
});

const ITEMS: RadialNavItem[] = [
  { id: "home", label: "Home", icon: <svg data-testid="home-icon" /> },
  { id: "search", label: "Search", icon: <svg /> },
  { id: "inbox", label: "Inbox", icon: <svg /> },
  { id: "calendar", label: "Calendar", icon: <svg /> },
  { id: "music", label: "Music", icon: <svg /> },
  { id: "settings", label: "Settings", icon: <svg /> },
];

const LINKS: RadialNavItem[] = ITEMS.slice(0, 4).map((item) => ({
  ...item,
  href: `#${item.id}`,
}));

function nav() {
  return screen.getByRole("navigation");
}

function slot(name: string) {
  return nav().querySelector(`[data-slot="radial-nav-${name}"]`);
}

describe("RadialNav", () => {
  it("renders a named nav around a list of toggle buttons, the first active", () => {
    render(<RadialNav items={ITEMS} />);
    const root = screen.getByRole("navigation", { name: "Main" });
    expect(root).toHaveAttribute("data-slot", "radial-nav");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    const home = screen.getByRole("button", { name: "Home" });
    expect(home).toHaveAttribute("aria-pressed", "true");
    expect(home).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(slot("hub")).toHaveAttribute("aria-hidden", "true");
    expect(slot("hub")).toHaveTextContent("Home");
    expect(slot("indicator")).toHaveAttribute("aria-hidden", "true");
  });

  it("places items clockwise from the top", () => {
    render(<RadialNav items={ITEMS.slice(0, 4)} />);
    const rows = nav().querySelectorAll<HTMLElement>('[data-slot="radial-nav-row"]');
    expect(rows[0]?.style.translate).toBe(
      "calc(0 * var(--radial-nav-radius)) calc(-1 * var(--radial-nav-radius))",
    );
    expect(rows[1]?.style.translate).toBe(
      "calc(1 * var(--radial-nav-radius)) calc(0 * var(--radial-nav-radius))",
    );
    expect(rows[2]?.style.translate).toBe(
      "calc(0 * var(--radial-nav-radius)) calc(1 * var(--radial-nav-radius))",
    );
  });

  it("mirrors the ring right to left", () => {
    render(
      <div style={{ direction: "rtl" }}>
        <RadialNav items={ITEMS.slice(0, 4)} />
      </div>,
    );
    const rows = nav().querySelectorAll<HTMLElement>('[data-slot="radial-nav-row"]');
    expect(rows[1]?.style.translate).toBe(
      "calc(-1 * var(--radial-nav-radius)) calc(0 * var(--radial-nav-radius))",
    );
  });

  it("selects on click, uncontrolled, and the hub follows", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadialNav items={ITEMS} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Inbox" }));
    expect(onValueChange).toHaveBeenCalledWith("inbox");
    expect(screen.getByRole("button", { name: "Inbox" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await waitFor(() => {
      expect(slot("hub")).toHaveTextContent("Inbox");
    });
    await user.click(screen.getByRole("button", { name: "Inbox" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("is controllable", async () => {
    function Controlled() {
      const [value, setValue] = useState("music");
      return <RadialNav items={ITEMS} value={value} onValueChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.getByRole("button", { name: "Music" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("only requests a change when controlled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RadialNav items={ITEMS} value="home" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(onValueChange).toHaveBeenCalledWith("search");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("starts on defaultValue", () => {
    render(<RadialNav items={ITEMS} defaultValue="calendar" />);
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders links with aria-current when given hrefs", async () => {
    const user = userEvent.setup();
    render(<RadialNav items={LINKS} aria-label="Sections" />);
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home).toHaveAttribute("href", "#home");
    await user.click(screen.getByRole("link", { name: "Inbox" }));
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    expect(home).not.toHaveAttribute("aria-current");
  });

  it("respects a prevented click", () => {
    render(
      <div
        onClickCapture={(event) => {
          event.preventDefault();
        }}
      >
        <RadialNav items={ITEMS} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("is one Tab stop, and arrows move around the ring", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadialNav items={ITEMS} defaultValue="search" />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Inbox" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(search).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Home" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Settings" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Home" })).toHaveFocus();
    await user.keyboard("x");
    expect(screen.getByRole("button", { name: "Home" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.keyboard("{ArrowRight} ");
    expect(search).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    const stops = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("tabindex") === "0");
    expect(stops).toEqual([search]);
  });

  it("swaps Left and Right in right-to-left", async () => {
    const user = userEvent.setup();
    render(
      <div style={{ direction: "rtl" }}>
        <RadialNav items={ITEMS} />
      </div>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  });

  it("springs the indicator the short way round", async () => {
    const user = userEvent.setup();
    render(<RadialNav items={ITEMS} />);
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => {
      expect((slot("indicator") as HTMLElement).style.transform).toMatch(/rotate\(-\d/);
    });
  });

  it("jumps under reduced motion", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    render(<RadialNav items={ITEMS} />);
    await user.click(screen.getByRole("button", { name: "Inbox" }));
    await waitFor(() => {
      expect((slot("indicator") as HTMLElement).style.transform).toBe("rotate(120deg)");
    });
  });

  it("hides the indicator and hub content when nothing matches", () => {
    render(<RadialNav items={ITEMS} value="missing" />);
    expect((slot("indicator") as HTMLElement).style.opacity).toBe("0");
    expect(slot("hub")).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("tabindex", "0");
  });

  it("renders with no items", () => {
    render(<RadialNav items={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("takes a labelledby name instead of the default label", () => {
    render(
      <>
        <h2 id="ring">Workspace</h2>
        <RadialNav items={ITEMS} aria-labelledby="ring" />
      </>,
    );
    const root = screen.getByRole("navigation", { name: "Workspace" });
    expect(root).not.toHaveAttribute("aria-label");
  });

  it.each([
    ["sm", "[--radial-nav-size:14rem]"],
    ["md", "[--radial-nav-size:18rem]"],
    ["lg", "[--radial-nav-size:22rem]"],
  ] as const)("applies the %s size", (size, token) => {
    render(<RadialNav items={ITEMS} size={size} />);
    expect(nav()).toHaveClass(token);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(<RadialNav items={ITEMS} ref={ref} className="size-80" data-testid="ring" />);
    const root = screen.getByTestId("ring");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("size-80");
    expect(root).not.toHaveClass("size-(--radial-nav-size)");
  });

  it("calls a ref callback", () => {
    const ref = vi.fn();
    render(<RadialNav items={ITEMS} ref={ref} />);
    expect(ref).toHaveBeenCalledWith(nav());
  });

  it("draws the arc and takes the nearest turn", () => {
    expect(radialNavArc(0)).toBe("M50 12A38 38 0 0 1 50 12");
    expect(radialNavArc(90)).toBe("M12 50A38 38 0 0 1 88 50");
    expect(radialNavNearest(0, 300)).toBe(-60);
    expect(radialNavNearest(-60, 0)).toBe(0);
    expect(radialNavNearest(350, 10)).toBe(370);
    expect(radialNavNearest(0, 180)).toBe(-180);
  });

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<RadialNav items={ITEMS} />);
    await expectNoA11yViolations(container);
    rerender(<RadialNav items={LINKS} />);
    await expectNoA11yViolations(container);
  });
});
