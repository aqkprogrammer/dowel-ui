import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { BrowserTabs, type BrowserTab } from "./browser-tabs";
import { springEasing } from "./browser-tabs-spring";

const TABS: BrowserTab[] = [
  { value: "home", label: "Home", icon: <svg data-testid="favicon" />, url: "example.com" },
  { value: "finds", label: "Finds", url: "example.com/finds" },
];

const THREE: BrowserTab[] = [
  ...TABS,
  { value: "notes", label: "Notes", url: "example.com/notes" },
];

function tabs() {
  return screen.getAllByRole("tab");
}

function tab(name: string) {
  return screen.getByRole("tab", { name });
}

function position(element: HTMLElement) {
  return Number(element.getAttribute("aria-posinset"));
}

function leaf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="browser-tabs-leaf"]');
}

function drag(element: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: (from + to) / 2 });
  fireEvent.pointerMove(element, { pointerId: 1, clientX: to });
  fireEvent.pointerUp(element, { pointerId: 1, clientX: to });
}

describe("BrowserTabs", () => {
  it("renders a named tablist, tabs and a labelled panel", () => {
    render(
      <BrowserTabs tabs={TABS} labels={{ tabList: "Open pages" }}>
        Page
      </BrowserTabs>,
    );
    expect(screen.getByRole("tablist", { name: "Open pages" })).toBeInTheDocument();
    expect(tabs()).toHaveLength(2);
    const home = tab("Home");
    expect(home).toHaveAttribute("aria-selected", "true");
    expect(home).toHaveAttribute("tabindex", "0");
    expect(tab("Finds")).toHaveAttribute("tabindex", "-1");
    const panel = screen.getByRole("tabpanel", { name: "Home" });
    expect(panel).toHaveTextContent("Page");
    expect(home).toHaveAttribute("aria-controls", panel.id);
    expect(screen.getByTestId("favicon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the active tab's url in the address field", async () => {
    const user = userEvent.setup();
    const { container } = render(<BrowserTabs tabs={TABS} />);
    const url = container.querySelector('[data-slot="browser-tabs-url"]');
    expect(url).toHaveTextContent("example.com");
    await user.click(tab("Finds"));
    expect(url).toHaveTextContent("example.com/finds");
  });

  it("selects on press and renders the panel for the active tab", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <BrowserTabs
        tabs={TABS}
        onValueChange={onValueChange}
        renderPanel={(active) => `Page for ${active.label}`}
      />,
    );
    await user.click(tab("Finds"));
    expect(onValueChange).toHaveBeenCalledWith("finds");
    expect(tab("Finds")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Page for Finds");
  });

  it("is controllable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <BrowserTabs tabs={TABS} value="home" onValueChange={onValueChange} />,
    );
    await user.click(tab("Finds"));
    expect(onValueChange).toHaveBeenCalledWith("finds");
    expect(tab("Home")).toHaveAttribute("aria-selected", "true");
    rerender(<BrowserTabs tabs={TABS} value="finds" onValueChange={onValueChange} />);
    expect(tab("Finds")).toHaveAttribute("aria-selected", "true");
  });

  it("roves with the arrow keys, wrapping, and Home/End", async () => {
    const user = userEvent.setup();
    render(<BrowserTabs tabs={THREE} />);
    await user.tab();
    expect(tab("Home")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tab("Finds")).toHaveFocus();
    expect(tab("Finds")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(tab("Home")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tab("Notes")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tab("Home")).toHaveFocus();
    await user.keyboard("{End}");
    expect(tab("Notes")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("a");
    expect(tab("Notes")).toHaveFocus();
  });

  it("mirrors the arrow keys in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(<BrowserTabs tabs={THREE} dir="rtl" />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(tab("Finds")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tab("Home")).toHaveFocus();
  });

  it("reads the inherited direction when no dir is given", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div dir="rtl">
        <BrowserTabs tabs={THREE} defaultValue="finds" />
      </div>,
    );
    expect(leaf(container)?.style.translate).toBe("-111px 0");
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(tab("Notes")).toHaveFocus();
  });

  it("moves the focused tab with Alt+Arrow and announces it", async () => {
    const user = userEvent.setup();
    const onOrderChange = vi.fn();
    render(<BrowserTabs tabs={THREE} onOrderChange={onOrderChange} />);
    await user.tab();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(onOrderChange).toHaveBeenLastCalledWith(["finds", "home", "notes"]);
    expect(position(tab("Home"))).toBe(2);
    expect(position(tab("Finds"))).toBe(1);
    expect(tab("Home")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Moved Home to position 2 of 3");

    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(position(tab("Home"))).toBe(1);
    // At the edge there is nowhere to go.
    onOrderChange.mockClear();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");
    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it("moves with Ctrl+Shift+PageDown/PageUp and follows visual order afterwards", async () => {
    const user = userEvent.setup();
    render(<BrowserTabs tabs={THREE} formatMove={(t, p, n) => `${t.label}: ${p}/${n}`} />);
    await user.tab();
    await user.keyboard("{Control>}{Shift>}{PageDown}{PageDown}{/Shift}{/Control}");
    expect(position(tab("Home"))).toBe(3);
    expect(screen.getByRole("status")).toHaveTextContent("Home: 3/3");
    // Arrow roving follows the new visual order: Home is last, so Right wraps to Finds.
    await user.keyboard("{ArrowRight}");
    expect(tab("Finds")).toHaveFocus();
    await user.keyboard("{Control>}{Shift>}{PageUp}{/Shift}{/Control}");
    expect(position(tab("Finds"))).toBe(1);
    // Other modified keys are left alone.
    await user.keyboard("{Control>}{ArrowRight}{/Control}");
    expect(tab("Finds")).toHaveFocus();
  });

  it("honours a controlled order and repairs an incomplete one", async () => {
    const user = userEvent.setup();
    const onOrderChange = vi.fn();
    render(
      <BrowserTabs
        tabs={THREE}
        order={["notes", "ghost", "notes"]}
        onOrderChange={onOrderChange}
      />,
    );
    expect(position(tab("Notes"))).toBe(1);
    expect(position(tab("Home"))).toBe(2);
    expect(position(tab("Finds"))).toBe(3);
    await user.tab();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(onOrderChange).toHaveBeenCalledWith(["notes", "finds", "home"]);
    // Still controlled: nothing moved until the parent says so.
    expect(position(tab("Home"))).toBe(2);
  });

  it("starts from defaultOrder", () => {
    render(<BrowserTabs tabs={TABS} defaultOrder={["finds", "home"]} />);
    expect(position(tab("Finds"))).toBe(1);
  });

  it("drags a tab past its neighbour's midpoint to swap, then springs home", () => {
    const onOrderChange = vi.fn();
    const { container } = render(<BrowserTabs tabs={TABS} onOrderChange={onOrderChange} />);
    const home = tab("Home");

    fireEvent.pointerDown(home, { button: 0, pointerId: 1, clientX: 10 });
    fireEvent.pointerMove(home, { pointerId: 1, clientX: 11 });
    // Under the slop: still a press.
    expect(home).not.toHaveAttribute("data-held");
    fireEvent.pointerMove(home, { pointerId: 1, clientX: 40 });
    expect(home).toHaveAttribute("data-held");
    expect(home.style.translate).toBe("30px 0");
    expect(home.style.transitionDuration).toBe("0s");
    expect(leaf(container)?.style.translate).toBe("30px 0");
    expect(onOrderChange).not.toHaveBeenCalled();

    // Clamped to the strip.
    fireEvent.pointerMove(home, { pointerId: 1, clientX: 500 });
    expect(home.style.translate).toBe("111px 0");
    expect(onOrderChange).toHaveBeenLastCalledWith(["finds", "home"]);
    expect(tab("Finds").style.translate).toBe("0px 0");

    fireEvent.pointerUp(home, { pointerId: 1, clientX: 500 });
    expect(home).not.toHaveAttribute("data-held");
    expect(home.style.transitionDuration).toContain("var(--motion-scale)");
    expect(position(home)).toBe(2);
    expect(screen.getByRole("status")).toHaveTextContent("Moved Home to position 2 of 2");
  });

  it("drags in the visual direction in right-to-left layouts", () => {
    render(<BrowserTabs tabs={TABS} dir="rtl" />);
    const home = tab("Home");
    drag(home, 300, 100);
    expect(position(home)).toBe(2);
  });

  it("does not announce a drag that ends where it started", () => {
    render(<BrowserTabs tabs={TABS} />);
    const home = tab("Home");
    drag(home, 10, 30);
    expect(position(home)).toBe(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ignores secondary buttons and stray pointers", () => {
    render(<BrowserTabs tabs={TABS} />);
    const finds = tab("Finds");
    fireEvent.pointerDown(finds, { button: 2, pointerId: 1, clientX: 10 });
    expect(finds).toHaveAttribute("aria-selected", "false");
    fireEvent.pointerMove(finds, { pointerId: 1, clientX: 300 });
    fireEvent.pointerUp(finds, { pointerId: 1 });
    fireEvent.pointerDown(finds, { button: 0, pointerId: 1, clientX: 10 });
    fireEvent.pointerMove(finds, { pointerId: 2, clientX: 300 });
    fireEvent.pointerCancel(finds, { pointerId: 2 });
    expect(finds).not.toHaveAttribute("data-held");
    fireEvent.pointerCancel(finds, { pointerId: 1 });
    expect(position(finds)).toBe(2);
  });

  it("collapses the leaf's start ear and body corner at slot 0", async () => {
    const user = userEvent.setup();
    const { container } = render(<BrowserTabs tabs={TABS} corner={20} />);
    const body = container.querySelector<HTMLElement>('[data-slot="browser-tabs-body"]');
    const startEar = container.querySelector<HTMLElement>('[data-side="start"]');
    expect(leaf(container)).toHaveAttribute("data-at-start");
    expect(body?.style.borderStartStartRadius).toBe("0px");
    expect(startEar?.style.scale).toBe("0");

    await user.click(tab("Finds"));
    expect(leaf(container)).not.toHaveAttribute("data-at-start");
    expect(leaf(container)?.style.translate).toBe("111px 0");
    expect(body?.style.borderStartStartRadius).toBe("20px");
    expect(startEar?.style.scale).toBe("1");
  });

  it("applies geometry, tone and stroke props", () => {
    const { container } = render(
      <BrowserTabs tabs={TABS} tabWidth={120} corner={10} tone="inverted" stroke bounce={0} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("--browser-tabs-surface:var(--color-foreground)");
    expect(root.style.getPropertyValue("--browser-tabs-spring")).toMatch(/^linear\(/);
    expect(tab("Home").style.width).toBe("120px");
    expect(container.querySelector('[data-slot="browser-tabs-body"]')?.className).toContain(
      "ring-1",
    );
  });

  it("renders decorative nav glyphs unless handlers are given", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BrowserTabs tabs={TABS} />);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    const onBack = vi.fn();
    const onForward = vi.fn();
    const onReload = vi.fn();
    rerender(
      <BrowserTabs
        tabs={TABS}
        onBack={onBack}
        onForward={onForward}
        onReload={onReload}
        labels={{ reload: "Refresh" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Forward" }));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onForward).toHaveBeenCalledOnce();
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("works as a controlled pair of value and order", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("home");
      const [order, setOrder] = useState(["home", "finds"]);
      return (
        <BrowserTabs
          tabs={TABS}
          value={value}
          onValueChange={setValue}
          order={order}
          onOrderChange={setOrder}
        />
      );
    }
    render(<Harness />);
    await user.tab();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(position(tab("Home"))).toBe(2);
    await user.keyboard("{ArrowRight}");
    expect(tab("Finds")).toHaveAttribute("aria-selected", "true");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <BrowserTabs tabs={TABS} ref={ref} className="bg-transparent" data-testid="window" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("bg-transparent");
    expect(root).not.toHaveClass("bg-muted");
    expect(root).toHaveAttribute("data-testid", "window");
  });

  it("renders with no tabs", () => {
    render(<BrowserTabs tabs={[]} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("builds a spring easing for any bounce", () => {
    expect(springEasing(0)).toMatch(/^linear\(0, .*, 1\)$/);
    expect(springEasing(2, 4).split(",")).toHaveLength(5);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <BrowserTabs tabs={TABS} onBack={() => {}}>
        Page
      </BrowserTabs>,
    );
    await act(async () => {
      await expectNoA11yViolations(container);
    });
  });
});
