import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Bookmark, Folder, House, Search, User } from "lucide-react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DirectionProvider } from "@/components/direction";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MagnifyDock, magnifyFalloff, type MagnifyDockItem } from "./magnify-dock";

const ITEMS: MagnifyDockItem[] = [
  { value: "home", label: "Home", icon: <House /> },
  { value: "search", label: "Search", icon: <Search /> },
  { value: "files", label: "Files", icon: <Folder /> },
  { value: "saved", label: "Saved", icon: <Bookmark /> },
  { value: "you", label: "You", icon: <User /> },
];

const item = (name: string) => screen.getByRole("button", { name });
const glyph = (name: string) =>
  item(name).querySelector<HTMLElement>('[data-slot="magnify-dock-glyph"]')?.style.transform;
const tip = (name: string) => item(name).querySelector('[data-slot="magnify-dock-tip"]');

describe("magnifyFalloff", () => {
  it("fits the measured cos² curve and stops past reach", () => {
    expect(magnifyFalloff(0, 2)).toBe(1);
    expect(magnifyFalloff(1, 2)).toBeCloseTo(0.75);
    expect(magnifyFalloff(2, 2)).toBeCloseTo(0.25);
    expect(magnifyFalloff(3, 2)).toBe(0);
    expect(magnifyFalloff(1, 4)).toBeCloseTo(0.905, 2);
    expect(magnifyFalloff(2, 4)).toBeCloseTo(0.655, 2);
    expect(magnifyFalloff(1, 0)).toBe(0);
    expect(magnifyFalloff(Infinity, 9)).toBe(0);
  });
});

describe("MagnifyDock", () => {
  it("is a named horizontal toolbar of labelled buttons with aria-hidden decoration", () => {
    render(<MagnifyDock items={ITEMS} defaultValue="home" />);
    const toolbar = screen.getByRole("toolbar", { name: "Dock" });
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(item("Home")).toHaveAttribute("aria-current", "page");
    expect(item("Search")).not.toHaveAttribute("aria-current");
    expect(tip("Home")).toHaveAttribute("aria-hidden", "true");
    expect(tip("Home")).toHaveTextContent("Home");
    expect(tip("Home")).not.toHaveAttribute("data-on");
  });

  it("magnifies the hovered item and its neighbours by distance, and resets on leave", () => {
    render(<MagnifyDock items={ITEMS} />);
    fireEvent.pointerEnter(item("Files"));
    expect(glyph("Files")).toBe("translateY(-8px) scale(1.32)");
    expect(glyph("Search")).toBe("translateY(-6px) scale(1.24)");
    expect(glyph("Saved")).toBe("translateY(-6px) scale(1.24)");
    expect(glyph("Home")).toBe("translateY(-2px) scale(1.08)");
    expect(item("Files")).toHaveStyle({ opacity: "1" });
    expect(item("Search")).toHaveStyle({ opacity: "0.66" });
    expect(item("Home")).toHaveStyle({ opacity: "0.42" });
    expect(item("Search")).toHaveAttribute("data-near");
    expect(tip("Files")).toHaveAttribute("data-on");
    expect(tip("Search")).not.toHaveAttribute("data-on");

    fireEvent.pointerLeave(screen.getByRole("toolbar"));
    expect(glyph("Files")).toBe("translateY(0px) scale(1)");
    expect(tip("Files")).not.toHaveAttribute("data-on");
  });

  it("honours magnify, lift and reach, clamped to their ranges", () => {
    render(<MagnifyDock items={ITEMS} magnify={3} lift={40} reach={0} />);
    fireEvent.pointerEnter(item("Files"));
    expect(glyph("Files")).toBe("translateY(-22px) scale(2)");
    expect(glyph("Search")).toBe("translateY(0px) scale(1)");
    expect(item("Search")).not.toHaveAttribute("data-near");
    expect(item("Search")).toHaveStyle({ opacity: "0.42" });
  });

  it("magnifies and shows the tooltip for the keyboard-focused item, clearing on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MagnifyDock items={ITEMS} />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    expect(item("Home")).toHaveFocus();
    expect(glyph("Home")).toBe("translateY(-8px) scale(1.32)");
    expect(tip("Home")).toHaveAttribute("data-on");
    await user.keyboard("{ArrowRight}");
    expect(item("Search")).toHaveFocus();
    expect(glyph("Search")).toBe("translateY(-8px) scale(1.32)");
    expect(tip("Home")).not.toHaveAttribute("data-on");
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(glyph("Search")).toBe("translateY(0px) scale(1)");
  });

  it("roves focus with arrows (wrapping), Home and End, skipping disabled items", async () => {
    const user = userEvent.setup();
    const items = ITEMS.map((entry) =>
      entry.value === "search" ? { ...entry, disabled: true } : entry,
    );
    render(<MagnifyDock items={items} />);
    expect(item("Home")).toHaveAttribute("tabindex", "0");
    expect(item("Files")).toHaveAttribute("tabindex", "-1");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(item("Files")).toHaveFocus();
    expect(item("Files")).toHaveAttribute("tabindex", "0");
    expect(item("Home")).toHaveAttribute("tabindex", "-1");
    await user.keyboard("{ArrowLeft}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("You")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("You")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Home")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Home")).toHaveFocus();
    expect(item("Search")).toBeDisabled();
  });

  it("mirrors the arrow keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <div dir="rtl">
          <MagnifyDock items={ITEMS} />
        </div>
      </DirectionProvider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(item("Search")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Home")).toHaveFocus();
  });

  it("starts the tab stop on the active item and activates on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<MagnifyDock items={ITEMS} defaultValue="saved" onValueChange={onValueChange} />);
    expect(item("Saved")).toHaveAttribute("tabindex", "0");
    await user.click(item("Files"));
    expect(onValueChange).toHaveBeenCalledWith("files");
    expect(item("Files")).toHaveAttribute("aria-current", "page");
    expect(item("Saved")).not.toHaveAttribute("aria-current");
    const dot = item("Files").querySelector<HTMLElement>('[data-slot="magnify-dock-dot"]');
    expect(dot).toHaveStyle({ opacity: "0.55" });
  });

  it("activates with Enter and Space from the keyboard", async () => {
    const user = userEvent.setup();
    render(<MagnifyDock items={ITEMS} />);
    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(item("Search")).toHaveAttribute("aria-current", "page");
    await user.keyboard("{ArrowRight} ");
    expect(item("Files")).toHaveAttribute("aria-current", "page");
  });

  it("is controlled by value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("home");
      return (
        <>
          <MagnifyDock items={ITEMS} value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.click(item("You"));
    expect(screen.getByText("you", { selector: "output" })).toBeInTheDocument();
    expect(item("You")).toHaveAttribute("aria-current", "page");
  });

  it("stays put when a controlled value is not updated", async () => {
    const user = userEvent.setup();
    render(<MagnifyDock items={ITEMS} value="home" />);
    await user.click(item("You"));
    expect(item("Home")).toHaveAttribute("aria-current", "page");
  });

  it("renders links for items with an href, and inert links when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <MagnifyDock
        onValueChange={onValueChange}
        items={[
          { value: "home", label: "Home", icon: <House />, href: "/" },
          { value: "files", label: "Files", icon: <Folder />, href: "/files", disabled: true },
        ]}
      />,
    );
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/");
    const files = screen.getByRole("link", { name: "Files" });
    expect(files).not.toHaveAttribute("href");
    expect(files).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(files);
    expect(onValueChange).not.toHaveBeenCalled();
    home.addEventListener("click", (event) => event.preventDefault());
    await user.click(home);
    expect(onValueChange).toHaveBeenCalledWith("home");
  });

  it("does not move the lens on pointer focus", () => {
    vi.useFakeTimers();
    try {
      render(<MagnifyDock items={ITEMS} />);
      const home = item("Home");
      fireEvent.pointerDown(home);
      fireEvent.focus(home);
      expect(glyph("Home")).toBe("translateY(0px) scale(1)");
      vi.runAllTimers();
      fireEvent.blur(home);
      fireEvent.focus(home);
      expect(glyph("Home")).toBe("translateY(-8px) scale(1.32)");
    } finally {
      vi.useRealTimers();
    }
  });

  it("drives every move through --motion-scale so reduced motion jumps", () => {
    render(<MagnifyDock items={ITEMS} />);
    const style = item("Home").querySelector<HTMLElement>('[data-slot="magnify-dock-glyph"]')
      ?.style.transition;
    expect(style).toContain("var(--motion-scale)");
    expect(item("Home").style.transition).toContain("var(--motion-scale)");
  });

  it("applies fill and stroke, and lets a consumer className win", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MagnifyDock
        ref={ref}
        items={ITEMS}
        fill="dark"
        stroke
        className="gap-4"
        aria-label="Apps"
        data-testid="dock"
      />,
    );
    const dock = screen.getByRole("toolbar", { name: "Apps" });
    expect(ref.current).toBe(dock);
    expect(dock).toHaveAttribute("data-testid", "dock");
    expect(dock).toHaveClass("bg-foreground", "ring-1", "gap-4");
    expect(dock).not.toHaveClass("gap-2.5");
    expect(tip("Home")).toHaveClass("bg-background");
  });

  it("calls consumer handlers and respects a prevented keydown", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn((event: { key: string; preventDefault: () => void }) => {
      if (event.key.startsWith("Arrow")) event.preventDefault();
    });
    const onPointerLeave = vi.fn();
    const onBlur = vi.fn();
    render(
      <>
        <MagnifyDock
          items={ITEMS}
          onKeyDown={onKeyDown}
          onPointerLeave={onPointerLeave}
          onBlur={onBlur}
        />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(item("Home")).toHaveFocus();
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
    fireEvent.pointerLeave(screen.getByRole("toolbar"));
    expect(onPointerLeave).toHaveBeenCalled();
  });

  it("uses aria-labelledby instead of the default name when given", () => {
    render(
      <>
        <span id="dock-name">Launcher</span>
        <MagnifyDock items={ITEMS} aria-labelledby="dock-name" />
      </>,
    );
    expect(screen.getByRole("toolbar", { name: "Launcher" })).toBeInTheDocument();
  });

  it("has no axe violations, idle and magnified", async () => {
    const { container } = render(<MagnifyDock items={ITEMS} defaultValue="home" />);
    await expectNoA11yViolations(container);
    fireEvent.pointerEnter(item("Search"));
    await expectNoA11yViolations(container);
  });
});
