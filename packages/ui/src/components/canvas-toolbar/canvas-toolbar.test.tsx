import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Circle, Hand, MousePointer2, PenTool, Slash, Square, Star, Type } from "lucide-react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DirectionProvider } from "../direction";
import {
  CanvasToolbar,
  type CanvasToolbarItem,
  type CanvasToolbarProps,
} from "./canvas-toolbar";

const SHAPES = [
  { value: "rect", label: "Rectangle", icon: <Square />, shortcut: "r" },
  { value: "oval", label: "Oval", icon: <Circle />, shortcut: "o" },
  { value: "line", label: "Line", icon: <Slash /> },
  { value: "star", label: "Star", icon: <Star /> },
];

const TOOLS: CanvasToolbarItem[] = [
  { value: "move", label: "Move", icon: <MousePointer2 />, shortcut: "v" },
  { value: "hand", label: "Hand", icon: <Hand />, shortcut: "h" },
  {
    type: "slot",
    label: "Shapes",
    tools: SHAPES,
  },
  { type: "separator" },
  { value: "pen", label: "Pen", icon: <PenTool />, shortcut: "p", disabled: false },
  { value: "text", label: "Text", icon: <Type />, shortcut: "t" },
];

function renderToolbar(props: Partial<CanvasToolbarProps> = {}) {
  return render(<CanvasToolbar aria-label="Canvas tools" tools={TOOLS} {...props} />);
}

const tool = (name: string) => screen.getByRole("button", { name });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CanvasToolbar", () => {
  it("renders a named toolbar of toggle buttons with the first tool pressed", () => {
    renderToolbar();
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(tool("Move")).toHaveAttribute("aria-pressed", "true");
    expect(tool("Hand")).toHaveAttribute("aria-pressed", "false");
    expect(tool("Rectangle")).toHaveAttribute("aria-pressed", "false");
    expect(tool("Move")).toHaveAttribute("aria-keyshortcuts", "v");
    expect(screen.getByRole("group", { name: "Shapes" })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("selects a single tool at a time on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderToolbar({ onValueChange });
    await user.click(tool("Pen"));
    expect(tool("Pen")).toHaveAttribute("aria-pressed", "true");
    expect(tool("Pen")).toHaveAttribute("data-state", "on");
    expect(tool("Move")).toHaveAttribute("aria-pressed", "false");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("pen");

    // Pressing the active tool again keeps it active: radio behaviour.
    await user.click(tool("Pen"));
    expect(tool("Pen")).toHaveAttribute("aria-pressed", "true");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("marks the slot active when its tool is chosen", async () => {
    const user = userEvent.setup();
    renderToolbar();
    const slot = screen.getByRole("group", { name: "Shapes" });
    expect(slot).toHaveAttribute("data-state", "off");
    await user.click(tool("Rectangle"));
    expect(slot).toHaveAttribute("data-state", "on");
  });

  it("starts from defaultValue, and a slot's defaultTool", () => {
    const tools: CanvasToolbarItem[] = [
      { value: "move", label: "Move", icon: <MousePointer2 /> },
      {
        type: "slot",
        label: "Shapes",
        defaultTool: "oval",
        tools: SHAPES,
      },
    ];
    const { rerender } = render(<CanvasToolbar aria-label="Tools" tools={tools} />);
    expect(tool("Move")).toHaveAttribute("aria-pressed", "true");
    expect(tool("Oval")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Rectangle" })).not.toBeInTheDocument();
    rerender(<CanvasToolbar key="b" aria-label="Tools" tools={tools} defaultValue="oval" />);
    expect(tool("Oval")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Rectangle" })).not.toBeInTheDocument();
  });

  it("defaults to a slot's tool when the slot comes first", () => {
    render(
      <CanvasToolbar
        aria-label="Tools"
        tools={[{ type: "separator" }, TOOLS[2]!, TOOLS[0]!]}
      />,
    );
    expect(tool("Rectangle")).toHaveAttribute("aria-pressed", "true");
  });

  it("follows the controlled value and only requests changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = renderToolbar({ value: "hand", onValueChange });
    await user.click(tool("Text"));
    expect(onValueChange).toHaveBeenCalledWith("text");
    expect(tool("Hand")).toHaveAttribute("aria-pressed", "true");

    // A controlled value inside a slot swaps the slot to show it.
    rerender(
      <CanvasToolbar
        aria-label="Canvas tools"
        tools={TOOLS}
        value="star"
        onValueChange={onValueChange}
      />,
    );
    expect(tool("Star")).toHaveAttribute("aria-pressed", "true");
  });

  it("roves focus with arrow keys, Home and End, wrapping around", async () => {
    const user = userEvent.setup();
    renderToolbar({ tooltips: false });
    await user.tab();
    expect(tool("Move")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tool("Hand")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tool("Rectangle")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tool("More shapes")).toHaveFocus();
    await user.keyboard("{End}");
    expect(tool("Text")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(tool("Move")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tool("Text")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tool("Move")).toHaveFocus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(tool("Hand")).toHaveAttribute("aria-pressed", "true");
    // Only one tab stop.
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("mirrors arrow keys in RTL", async () => {
    const user = userEvent.setup();
    render(
      <DirectionProvider dir="rtl">
        <CanvasToolbar aria-label="Tools" tools={TOOLS} tooltips={false} />
      </DirectionProvider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(tool("Hand")).toHaveFocus();
  });

  it("supports a vertical orientation", async () => {
    const user = userEvent.setup();
    renderToolbar({ orientation: "vertical", tooltips: false });
    expect(screen.getByRole("toolbar")).toHaveAttribute("aria-orientation", "vertical");
    expect(screen.getByRole("separator")).toHaveAttribute("data-orientation", "horizontal");
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(tool("Hand")).toHaveFocus();
  });

  describe("shape flyout", () => {
    it("opens from the notch, picks a shape, swaps the slot and returns focus to it", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderToolbar({ onValueChange });
      const notch = tool("More shapes");
      expect(notch).toHaveAttribute("aria-haspopup", "menu");
      expect(notch).toHaveAttribute("aria-expanded", "false");

      await user.click(notch);
      expect(notch).toHaveAttribute("aria-expanded", "true");
      const menu = screen.getByRole("menu", { name: "More shapes" });
      expect(menu).toHaveAttribute("data-slot", "canvas-toolbar-flyout");
      const rect = screen.getByRole("menuitemradio", { name: "Rectangle" });
      expect(rect).toHaveAttribute("aria-checked", "true");

      await user.click(screen.getByRole("menuitemradio", { name: "Star" }));
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      expect(onValueChange).toHaveBeenCalledWith("star");
      expect(tool("Star")).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByRole("button", { name: "Rectangle" })).not.toBeInTheDocument();
      await waitFor(() => expect(tool("Star")).toHaveFocus());
    });

    it("keeps the picked shape in the slot after another tool is chosen", async () => {
      const user = userEvent.setup();
      renderToolbar({ tooltips: false });
      await user.click(tool("More shapes"));
      await user.click(screen.getByRole("menuitemradio", { name: "Oval" }));
      await user.click(tool("Pen"));
      expect(tool("Oval")).toHaveAttribute("aria-pressed", "false");
    });

    it("opens from the keyboard, moves with Left/Right and closes on Escape", async () => {
      const user = userEvent.setup();
      renderToolbar({ tooltips: false });
      const notch = tool("More shapes");
      act(() => notch.focus());
      await user.keyboard("{Enter}");
      const items = screen.getAllByRole("menuitemradio");
      await waitFor(() => expect(items[0]).toHaveFocus());
      await user.keyboard("{ArrowRight}");
      expect(items[1]).toHaveFocus();
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(items[3]).toHaveFocus();
      // Up/Down are left to the menu.
      await user.keyboard("{ArrowUp}");
      expect(items[2]).toHaveFocus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      expect(notch).toHaveFocus();
      expect(tool("Rectangle")).toHaveAttribute("aria-pressed", "false");
    });

    it("mirrors Left/Right in an RTL flyout", async () => {
      const user = userEvent.setup();
      render(
        <DirectionProvider dir="rtl">
          <CanvasToolbar aria-label="Tools" tools={TOOLS} tooltips={false} />
        </DirectionProvider>,
      );
      act(() => tool("More shapes").focus());
      await user.keyboard("{Enter}");
      const items = screen.getAllByRole("menuitemradio");
      await waitFor(() => expect(items[0]).toHaveFocus());
      await user.keyboard("{ArrowLeft}");
      expect(items[1]).toHaveFocus();
    });

    it("opens to the inline end of a vertical rail and takes flyoutClassName", async () => {
      const user = userEvent.setup();
      renderToolbar({ orientation: "vertical", flyoutClassName: "custom-flyout" });
      await user.click(tool("More shapes"));
      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("data-side", "right");
      expect(menu).toHaveClass("custom-flyout");
    });

    it("names the notch from moreLabel", () => {
      render(
        <CanvasToolbar
          aria-label="Tools"
          tools={[
            {
              type: "slot",
              label: "Pens",
              moreLabel: "Pick a pen",
              tools: [TOOLS[0] as never],
            },
          ]}
        />,
      );
      expect(tool("Pick a pen")).toBeInTheDocument();
    });
  });

  describe("shortcuts", () => {
    it("picks tools by key while focus is in the toolbar, including slot tools", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderToolbar({ onValueChange, tooltips: false });
      await user.tab();
      await user.keyboard("p");
      expect(tool("Pen")).toHaveAttribute("aria-pressed", "true");
      await user.keyboard("O");
      expect(tool("Oval")).toHaveAttribute("aria-pressed", "true");
      // Modified keys and unknown keys are left alone.
      await user.keyboard("{Control>}t{/Control}x");
      expect(tool("Oval")).toHaveAttribute("aria-pressed", "true");
      expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it("ignores shortcuts outside the toolbar unless globalShortcuts is set", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <>
          <input aria-label="Name" />
          <button type="button">Elsewhere</button>
          <CanvasToolbar aria-label="Tools" tools={TOOLS} tooltips={false} />
        </>,
      );
      act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
      await user.keyboard("h");
      expect(tool("Hand")).toHaveAttribute("aria-pressed", "false");

      rerender(
        <>
          <input aria-label="Name" />
          <button type="button">Elsewhere</button>
          <CanvasToolbar aria-label="Tools" tools={TOOLS} tooltips={false} globalShortcuts />
        </>,
      );
      await user.keyboard("h");
      expect(tool("Hand")).toHaveAttribute("aria-pressed", "true");

      await user.click(screen.getByRole("textbox", { name: "Name" }));
      await user.keyboard("t");
      expect(tool("Text")).toHaveAttribute("aria-pressed", "false");
    });

    it("skips disabled tools", async () => {
      const user = userEvent.setup();
      render(
        <CanvasToolbar
          aria-label="Tools"
          tooltips={false}
          tools={[
            TOOLS[0]!,
            { value: "pen", label: "Pen", icon: <PenTool />, shortcut: "p", disabled: true },
          ]}
        />,
      );
      await user.tab();
      await user.keyboard("p");
      expect(tool("Pen")).toBeDisabled();
      expect(tool("Move")).toHaveAttribute("aria-pressed", "true");
    });

    it("calls the consumer's onKeyDown", () => {
      const onKeyDown = vi.fn();
      renderToolbar({ onKeyDown, tooltips: false });
      fireEvent.keyDown(tool("Move"), { key: "h" });
      expect(onKeyDown).toHaveBeenCalled();
      expect(tool("Hand")).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("shows the name and shortcut in a tooltip on focus", async () => {
    const user = userEvent.setup();
    renderToolbar();
    await user.tab();
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Move");
    expect(tip).toHaveTextContent("v");
  });

  it("applies corner, tone and stroke", () => {
    renderToolbar({ corner: 20, tone: "inverted", stroke: true });
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveStyle({ borderRadius: "20px" });
    expect(toolbar.style.getPropertyValue("--canvas-toolbar-tool-r")).toBe("16px");
    expect(toolbar).toHaveClass("bg-foreground", "ring-1");
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    renderToolbar({ ref, className: "bg-muted p-3", id: "rail" });
    const toolbar = screen.getByRole("toolbar");
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveClass("bg-muted", "p-3");
    expect(toolbar).not.toHaveClass("bg-card", "p-1.5");
    expect(toolbar).toHaveAttribute("id", "rail");
  });

  it("warns in development when unnamed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<CanvasToolbar tools={TOOLS} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[CanvasToolbar]"));
  });

  it("works as a controlled component in a parent", async () => {
    function Harness() {
      const [value, setValue] = useState("move");
      return (
        <>
          <CanvasToolbar
            aria-label="Tools"
            tools={TOOLS}
            value={value}
            onValueChange={setValue}
          />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tool("Hand"));
    expect(screen.getByRole("status")).toHaveTextContent("hand");
  });

  it("has no axe violations, closed and with the flyout open", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderToolbar();
    await expectNoA11yViolations(baseElement);
    await user.click(tool("More shapes"));
    await screen.findByRole("menu");
    await expectNoA11yViolations(baseElement);
  });
});
