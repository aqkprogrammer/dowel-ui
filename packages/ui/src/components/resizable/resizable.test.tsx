import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  initialPanelSizes,
  movePanelBoundary,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelGroupProps,
  type ResizablePanelProps,
} from "./resizable";

function Two({
  first,
  second,
  ...props
}: Partial<ResizablePanelGroupProps> & {
  first?: Partial<ResizablePanelProps>;
  second?: Partial<ResizablePanelProps>;
}) {
  return (
    <ResizablePanelGroup data-testid="group" {...props}>
      <ResizablePanel id="sidebar" {...first}>
        Sidebar
      </ResizablePanel>
      <ResizableHandle aria-label="Resize sidebar" />
      <ResizablePanel id="main" {...second}>
        Main
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

const handle = (name = "Resize sidebar") => screen.getByRole("separator", { name });
const grow = (id: string) => document.getElementById(id)?.style.flexGrow;

describe("Resizable", () => {
  it("is a window splitter: a separator valued by the panel before it", async () => {
    const { container } = render(<Two />);
    expect(handle()).toHaveAttribute("aria-orientation", "vertical");
    expect(handle()).toHaveAttribute("aria-controls", "sidebar");
    expect(handle()).toHaveAttribute("aria-valuenow", "50");
    expect(handle()).toHaveAttribute("aria-valuemin", "10");
    expect(handle()).toHaveAttribute("aria-valuemax", "90");
    expect(handle()).toHaveAttribute("tabindex", "0");
    expect(grow("sidebar")).toBe("50");
    expect(grow("main")).toBe("50");
    await expectNoA11yViolations(container);
  });

  it("starts at the given sizes and shares what is left among the rest", () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="a" defaultSize={30} />
        <ResizableHandle />
        <ResizablePanel id="b" />
        <ResizableHandle />
        <ResizablePanel id="c" />
      </ResizablePanelGroup>,
    );
    expect(grow("a")).toBe("30");
    expect(grow("b")).toBe("35");
    expect(grow("c")).toBe("35");
  });

  it("resizes with the arrow keys, further with Shift, and to the limits with Home and End", () => {
    const onLayout = vi.fn();
    render(<Two onLayout={onLayout} />);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "51");
    expect(grow("main")).toBe("49");
    expect(onLayout).toHaveBeenLastCalledWith([51, 49]);
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    expect(handle()).toHaveAttribute("aria-valuenow", "41");
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(handle()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(handle()).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(handle(), { key: "End" });
    expect(handle()).toHaveAttribute("aria-valuenow", "90");
  });

  it("keeps both panels inside their limits", () => {
    render(<Two first={{ minSize: 20, maxSize: 60 }} second={{ minSize: 30 }} />);
    expect(handle()).toHaveAttribute("aria-valuemin", "20");
    expect(handle()).toHaveAttribute("aria-valuemax", "60");
    fireEvent.keyDown(handle(), { key: "End" });
    expect(grow("sidebar")).toBe("60");
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(grow("sidebar")).toBe("20");
  });

  it("collapses a collapsible panel with Enter and brings it back to where it was", () => {
    render(<Two first={{ collapsible: true, minSize: 15 }} />);
    fireEvent.keyDown(handle(), { key: "ArrowRight", shiftKey: true });
    expect(grow("sidebar")).toBe("60");
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(grow("sidebar")).toBe("0");
    expect(document.getElementById("sidebar")).toHaveAttribute("data-collapsed", "true");
    expect(handle()).toHaveAttribute("aria-valuemin", "0");
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(grow("sidebar")).toBe("60");
    expect(document.getElementById("sidebar")).not.toHaveAttribute("data-collapsed");
  });

  it("snaps a collapsible panel shut when dragged well below its minimum", () => {
    render(<Two first={{ collapsible: true, minSize: 20 }} />);
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    // 50 → 40 → 30 → 20: at its minimum, still open.
    expect(grow("sidebar")).toBe("20");
    fireEvent.keyDown(handle(), { key: "ArrowLeft", shiftKey: true });
    // Asked for 10, halfway to closed or beyond: it closes.
    expect(grow("sidebar")).toBe("0");
  });

  it("follows a drag, in percent of the group", () => {
    render(<Two />);
    const group = screen.getByTestId("group");
    group.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 400);
    const separator = handle();
    separator.setPointerCapture = vi.fn();
    fireEvent.pointerDown(separator, { pointerId: 1, button: 0, clientX: 500 });
    expect(separator).toHaveAttribute("data-dragging", "true");
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 600 });
    expect(grow("sidebar")).toBe("60");
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 550 });
    expect(grow("sidebar")).toBe("55");
    fireEvent.pointerUp(separator, { pointerId: 1 });
    expect(separator).not.toHaveAttribute("data-dragging");
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 900 });
    expect(grow("sidebar")).toBe("55");
  });

  it("follows reading direction in a right-to-left layout", () => {
    render(<Two style={{ direction: "rtl" }} />);
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(grow("sidebar")).toBe("51");
    const group = screen.getByTestId("group");
    group.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 400);
    const separator = handle();
    separator.setPointerCapture = vi.fn();
    fireEvent.pointerDown(separator, { pointerId: 1, button: 0, clientX: 500 });
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 400 });
    expect(grow("sidebar")).toBe("61");
  });

  it("stacks vertically, resizing with up and down", () => {
    render(<Two direction="vertical" />);
    expect(screen.getByTestId("group")).toHaveClass("flex-col");
    expect(handle()).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(handle(), { key: "ArrowDown" });
    expect(grow("sidebar")).toBe("51");
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(grow("sidebar")).toBe("51");
  });

  it("resizes only the two panels either side of a handle", () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel id="a" />
        <ResizableHandle aria-label="First" />
        <ResizablePanel id="b" />
        <ResizableHandle aria-label="Second" />
        <ResizablePanel id="c" />
      </ResizablePanelGroup>,
    );
    const second = handle("Second");
    expect(second).toHaveAttribute("aria-controls", "b");
    const before = grow("a");
    fireEvent.keyDown(second, { key: "ArrowRight", shiftKey: true });
    expect(grow("a")).toBe(before);
    expect(Number(grow("b"))).toBeCloseTo(43.333, 2);
    expect(Number(grow("c"))).toBeCloseTo(23.333, 2);
  });

  it("lets className win, forwards refs and refuses parts outside a group", () => {
    const groupRef = createRef<HTMLDivElement>();
    const handleRef = createRef<HTMLDivElement>();
    render(
      <ResizablePanelGroup ref={groupRef} className="overflow-visible">
        <ResizablePanel id="x" className="overflow-hidden" />
        <ResizableHandle ref={handleRef} withHandle />
        <ResizablePanel id="y" />
      </ResizablePanelGroup>,
    );
    expect(groupRef.current).toHaveClass("overflow-visible");
    expect(groupRef.current).not.toHaveClass("overflow-hidden");
    expect(document.getElementById("x")).toHaveClass("overflow-hidden");
    expect(handleRef.current?.querySelector("[data-slot=resizable-grip]")).toBeInTheDocument();

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ResizableHandle />)).toThrow(
      "<ResizableHandle> must be used inside <ResizablePanelGroup>.",
    );
    vi.restoreAllMocks();
  });
});

describe("resizable helpers", () => {
  it("shares unset sizes and scales to 100", () => {
    expect(initialPanelSizes([])).toEqual([]);
    expect(initialPanelSizes([undefined, undefined])).toEqual([50, 50]);
    expect(initialPanelSizes([20, undefined, undefined, undefined])).toEqual([
      20,
      80 / 3,
      80 / 3,
      80 / 3,
    ]);
    // Over-specified sizes are scaled down rather than overflowing.
    expect(initialPanelSizes([60, 60])).toEqual([50, 50]);
    expect(initialPanelSizes([0, 0])).toEqual([50, 50]);
  });

  it("moves a boundary within both panels' limits", () => {
    const panel = (size: number, min = 10, max = 100) => ({ size, min, max });
    expect(movePanelBoundary(panel(50), panel(50), 10)).toEqual([60, 40]);
    expect(movePanelBoundary(panel(50), panel(50), 100)).toEqual([90, 10]);
    expect(movePanelBoundary(panel(50, 10, 70), panel(50), 100)).toEqual([70, 30]);
    expect(movePanelBoundary(panel(50), panel(50, 10, 60), -100)).toEqual([40, 60]);
  });
});
