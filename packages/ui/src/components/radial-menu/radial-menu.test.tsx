import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Frame, PenTool, Square, Star, Type } from "lucide-react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  RadialMenu,
  radialPosition,
  type RadialMenuItem,
  type RadialMenuProps,
} from "./radial-menu";

const ITEMS: RadialMenuItem[] = [
  { value: "frame", label: "Frame", icon: <Frame /> },
  { value: "text", label: "Text", icon: <Type /> },
  { value: "shape", label: "Shape", icon: <Square /> },
  { value: "pen", label: "Pen", icon: <PenTool /> },
  { value: "note", label: "Note", icon: <Star /> },
];

function setup(props: Partial<RadialMenuProps> = {}) {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  const utils = render(
    <RadialMenu items={ITEMS} onSelect={onSelect} onOpenChange={onOpenChange} {...props} />,
  );
  const core = screen.getByRole("button", { name: "Add" });
  return { ...utils, core, onSelect, onOpenChange };
}

function item(name: string) {
  return screen.getByRole("menuitem", { name, hidden: true });
}

/** Lays each option out as a 48px box at its fan position around (100, 100). */
function mockRects() {
  vi.spyOn(
    screen.getByRole("button", { name: "Add" }),
    "getBoundingClientRect",
  ).mockReturnValue(DOMRect.fromRect({ x: 72, y: 72, width: 56, height: 56 }));
  ITEMS.forEach(({ label }, index) => {
    const { x, y } = radialPosition(index, ITEMS.length, 180, 68);
    vi.spyOn(item(label), "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 100 + x - 24, y: 100 + y - 24, width: 48, height: 48 }),
    );
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("radialPosition", () => {
  it("spreads options evenly over the arc, endpoints included, centred on straight up", () => {
    expect(radialPosition(0, 5, 180, 68)).toEqual({ x: -68, y: 0 });
    expect(radialPosition(1, 5, 180, 68)).toEqual({ x: -48.08, y: -48.08 });
    expect(radialPosition(2, 5, 180, 68)).toEqual({ x: 0, y: -68 });
    expect(radialPosition(4, 5, 180, 68)).toEqual({ x: 68, y: 0 });
  });

  it("puts a single option straight up, mirrors in RTL and spaces a full circle", () => {
    expect(radialPosition(0, 1, 180, 50)).toEqual({ x: 0, y: -50 });
    expect(radialPosition(0, 5, 180, 68, true)).toEqual({ x: 68, y: 0 });
    // 360°: endpoints would coincide, so the step is 360 / count.
    expect(radialPosition(0, 4, 360, 10)).toEqual({ x: -7.07, y: 7.07 });
    expect(radialPosition(3, 4, 360, 10)).toEqual({ x: 7.07, y: 7.07 });
  });
});

describe("RadialMenu", () => {
  it("renders a closed menu button whose menu is hidden and inert", () => {
    const { core } = setup();
    expect(core).toHaveAttribute("aria-haspopup", "menu");
    expect(core).toHaveAttribute("aria-expanded", "false");
    const menu = screen.getByRole("menu", { hidden: true });
    expect(core).toHaveAttribute("aria-controls", menu.id);
    expect(menu).toHaveAttribute("aria-hidden", "true");
    expect(menu).toHaveAttribute("inert");
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("opens from the keyboard and focuses the first option", async () => {
    const user = userEvent.setup();
    const { core, onOpenChange } = setup();
    await user.tab();
    expect(core).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(core).toHaveAttribute("aria-expanded", "true");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("menu")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("menuitem", { name: "Frame" })).toHaveFocus();
    expect(screen.getAllByRole("menuitem")).toHaveLength(5);
  });

  it("walks the ring with arrows (wrapping), and jumps with Home/End", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard(" ");
    expect(item("Frame")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Text")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item("Shape")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(item("Frame")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("Note")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Frame")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Note")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Frame")).toHaveFocus();
    // Other keys are left alone.
    await user.keyboard("a");
    expect(item("Frame")).toHaveFocus();
  });

  it("follows visual order in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <RadialMenu items={ITEMS} />
      </div>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(item("Frame")).toHaveFocus();
    // Frame sits at the right in RTL; ArrowLeft moves on to Text.
    expect(item("Frame").style.transform).toContain("translate(68px, 0px)");
    await user.keyboard("{ArrowLeft}");
    expect(item("Text")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item("Frame")).toHaveFocus();
  });

  it("opens onto the last option with ArrowUp and the first with ArrowDown", async () => {
    const user = userEvent.setup();
    const { core } = setup();
    core.focus();
    await user.keyboard("{ArrowUp}");
    expect(item("Note")).toHaveFocus();
    // Already open: ArrowDown on the core just moves focus in.
    core.focus();
    await user.keyboard("{ArrowDown}");
    expect(item("Frame")).toHaveFocus();
  });

  it("selects with Enter, closes and refocuses the core", async () => {
    const user = userEvent.setup();
    const { core, onSelect } = setup();
    await user.tab();
    await user.keyboard("{Enter}{ArrowRight}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("text");
    expect(core).toHaveAttribute("aria-expanded", "false");
    expect(core).toHaveFocus();
  });

  it("closes on Escape from an option or the core and refocuses the core", async () => {
    const user = userEvent.setup();
    const { core } = setup();
    await user.tab();
    await user.keyboard("{Enter}{Escape}");
    expect(core).toHaveAttribute("aria-expanded", "false");
    expect(core).toHaveFocus();

    await user.keyboard("{Enter}");
    core.focus();
    await user.keyboard("{Escape}");
    expect(core).toHaveAttribute("aria-expanded", "false");
    // Escape on a closed core does nothing.
    await user.keyboard("{Escape}");
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles closed with Enter on the core", async () => {
    const user = userEvent.setup();
    const { core } = setup();
    await user.tab();
    await user.keyboard("{Enter}");
    core.focus();
    await user.keyboard("{Enter}");
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when Tab moves focus away", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadialMenu items={ITEMS} />
        <button type="button">Next</button>
      </>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("closes when focus leaves the component", () => {
    render(
      <>
        <RadialMenu items={ITEMS} defaultOpen />
        <button type="button">Elsewhere</button>
      </>,
    );
    act(() => {
      item("Frame").focus();
    });
    act(() => {
      screen.getByRole("button", { name: "Elsewhere" }).focus();
    });
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens on press, stays open on release over the core, and a click picks an option", async () => {
    const user = userEvent.setup();
    const { core, onSelect } = setup();
    await user.click(core);
    expect(core).toHaveAttribute("aria-expanded", "true");
    expect(item("Shape").style.opacity).toBe("1");
    await user.click(item("Shape"));
    expect(onSelect).toHaveBeenCalledWith("shape");
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the core is pressed again, or on an outside press", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadialMenu items={ITEMS} />
        <button type="button">Outside</button>
      </>,
    );
    const core = screen.getByRole("button", { name: "Add" });
    await user.click(core);
    await user.click(core);
    expect(core).toHaveAttribute("aria-expanded", "false");
    await user.click(core);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores non-primary buttons", () => {
    const { core } = setup();
    fireEvent.pointerDown(core, { button: 2, pointerId: 1 });
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("targets an option while dragging and selects it on release", () => {
    const { core, onSelect } = setup();
    mockRects();
    fireEvent.pointerDown(core, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    expect(core).toHaveAttribute("aria-expanded", "true");

    // Shape sits straight up at (100, 32).
    fireEvent.pointerMove(core, { pointerId: 1, clientX: 100, clientY: 34 });
    expect(item("Shape")).toHaveAttribute("data-live");
    fireEvent.pointerMove(core, { pointerId: 1, clientX: 100, clientY: 70 });
    expect(item("Shape")).not.toHaveAttribute("data-live");
    fireEvent.pointerMove(core, { pointerId: 1, clientX: 34, clientY: 100 });
    expect(item("Frame")).toHaveAttribute("data-live");

    fireEvent.pointerUp(core, { pointerId: 1, clientX: 34, clientY: 100 });
    expect(onSelect).toHaveBeenCalledWith("frame");
    expect(core).toHaveAttribute("aria-expanded", "false");
    expect(item("Frame")).not.toHaveAttribute("data-live");
  });

  it("ignores moves and releases that are not part of a press, and cancels cleanly", () => {
    const { core, onSelect } = setup();
    mockRects();
    fireEvent.pointerMove(core, { clientX: 100, clientY: 34 });
    fireEvent.pointerUp(core, { clientX: 100, clientY: 34 });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.pointerDown(core, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(core, { pointerId: 1, clientX: 100, clientY: 34 });
    fireEvent.pointerCancel(core, { pointerId: 1 });
    expect(item("Shape")).not.toHaveAttribute("data-live");
    fireEvent.pointerUp(core, { pointerId: 1, clientX: 100, clientY: 34 });
    expect(onSelect).not.toHaveBeenCalled();
    expect(core).toHaveAttribute("aria-expanded", "true");
  });

  it("skips disabled options for keys, clicks and targeting", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <RadialMenu
        onSelect={onSelect}
        items={ITEMS.map((entry) =>
          entry.value === "text" ? { ...entry, disabled: true } : entry,
        )}
      />,
    );
    await user.tab();
    await user.keyboard("{Enter}{ArrowRight}");
    expect(item("Shape")).toHaveFocus();
    expect(item("Text")).toHaveAttribute("aria-disabled", "true");
    await user.click(item("Text"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <span data-testid="state">{String(open)}</span>
          <RadialMenu items={ITEMS} open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Controlled />);
    const core = screen.getByRole("button", { name: "Add" });
    expect(core).toHaveAttribute("aria-expanded", "true");
    await user.click(core);
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    expect(core).toHaveAttribute("aria-expanded", "false");
  });

  it("staggers options out and collapses them together, scaled by --motion-scale", async () => {
    const user = userEvent.setup();
    const { core } = setup({ stagger: 40 });
    expect(item("Pen").style.transition).toContain("0s");
    expect(item("Pen").style.transform).toBe("translate(0px, 0px) scale(0.4)");
    await user.click(core);
    expect(item("Pen").style.transition).toContain("calc(120ms * var(--motion-scale))");
    expect(item("Pen").style.transform).toBe("translate(48.08px, -48.08px) scale(1)");
    expect(core.querySelector('[data-slot="radial-menu-core-icon"]')).toHaveClass("rotate-135");
  });

  it("applies label, icon, radius, tone and stroke", () => {
    render(
      <RadialMenu
        items={ITEMS}
        defaultOpen
        label="Insert"
        icon={<svg data-testid="icon" aria-hidden="true" />}
        radius={100}
        tone="inverted"
        stroke
      />,
    );
    const core = screen.getByRole("button", { name: "Insert" });
    expect(screen.getByRole("menu", { name: "Insert" })).toBeInTheDocument();
    expect(core).toContainElement(screen.getByTestId("icon"));
    expect(core).toHaveClass("bg-card", "inset-ring");
    expect(item("Shape")).toHaveClass("bg-foreground");
    expect(item("Shape").style.transform).toBe("translate(0px, -100px) scale(1)");
  });

  it("lets consumer className win, forwards props and refs", () => {
    const ref = createRef<HTMLDivElement>();
    let callbackNode: HTMLDivElement | null = null;
    const onBlur = vi.fn();
    const { rerender } = render(
      <RadialMenu
        ref={ref}
        items={ITEMS}
        className="size-20"
        data-testid="root"
        onBlur={onBlur}
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("size-20");
    expect(root).not.toHaveClass("size-14");
    act(() => {
      screen.getByRole("button", { name: "Add" }).focus();
      screen.getByRole("button", { name: "Add" }).blur();
    });
    expect(onBlur).toHaveBeenCalled();

    rerender(
      <RadialMenu
        ref={(node) => {
          callbackNode = node;
        }}
        items={ITEMS}
        data-testid="root"
      />,
    );
    expect(callbackNode).toBe(root);
  });

  it("has no axe violations closed or open", async () => {
    const { container, core } = setup();
    await expectNoA11yViolations(container);
    fireEvent.pointerDown(core, { button: 0, pointerId: 1 });
    await expectNoA11yViolations(container);
  });
});
