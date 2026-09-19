import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Direction } from "radix-ui";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FoldingFrame } from "./folding-frame";

const SRC = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A 300px-wide frame at the origin. */
function mockRect(element: Element) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 214,
    right: 300,
    width: 300,
    height: 214,
    toJSON: () => ({}),
  });
}

const slider = () => screen.getByRole("slider", { name: "Unfold" });
const part = (container: HTMLElement, slot: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

describe("FoldingFrame", () => {
  it("exposes the photo once and a shut slider", () => {
    const { container } = render(<FoldingFrame src={SRC} alt="A lake at dawn" />);
    expect(screen.getByRole("img", { name: "A lake at dawn" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    expect(slider()).toHaveAttribute("aria-valuetext", "Closed");
    expect(part(container, "folding-frame")).toHaveAttribute("data-state", "closed");
    expect(part(container, "folding-frame-cover")?.style.transform).toContain(
      "rotateY(176.000deg)",
    );
    expect(part(container, "folding-frame-cast")?.style.opacity).toBe("0.55");
  });

  it("describes partial and full openness", () => {
    const { container, rerender } = render(<FoldingFrame src={SRC} alt="Photo" value={40} />);
    expect(slider()).toHaveAttribute("aria-valuetext", "40% open");
    expect(part(container, "folding-frame")).toHaveAttribute("data-state", "partial");
    rerender(<FoldingFrame src={SRC} alt="Photo" value={100} />);
    expect(slider()).toHaveAttribute("aria-valuetext", "Open");
    expect(part(container, "folding-frame-cover")?.style.transform).toContain(
      "rotateY(0.000deg)",
    );
    expect(part(container, "folding-frame-liquid")?.style.width).toBe("0cqi");
    rerender(<FoldingFrame src={SRC} alt="Photo" value={250} />);
    expect(slider()).toHaveAttribute("aria-valuenow", "100");
  });

  it("steps from the keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <FoldingFrame
        src={SRC}
        alt="Photo"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    await user.tab();
    expect(slider()).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(slider()).toHaveAttribute("aria-valuenow", "5");
    expect(onValueCommit).toHaveBeenLastCalledWith(5);
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(slider()).toHaveAttribute("aria-valuenow", "15");
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(slider()).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("{PageUp}");
    expect(slider()).toHaveAttribute("aria-valuenow", "30");
    await user.keyboard("{PageDown}");
    expect(slider()).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("{End}");
    expect(slider()).toHaveAttribute("aria-valuetext", "Open");
    await user.keyboard("{Home}{ArrowDown}");
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    const calls = onValueChange.mock.calls.length;
    await user.keyboard("{a}");
    expect(onValueChange).toHaveBeenCalledTimes(calls);
  });

  it("mirrors horizontal keys and the drag in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <Direction.Provider dir="rtl">
        <FoldingFrame src={SRC} alt="Photo" defaultValue={50} />
      </Direction.Provider>,
    );
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(slider()).toHaveAttribute("aria-valuenow", "55");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider()).toHaveAttribute("aria-valuenow", "45");
    mockRect(slider());
    fireEvent.pointerDown(slider(), { clientX: 30, pointerId: 1, button: 0 });
    // 90% of the way from the inline start (the right edge) is shut.
    fireEvent.pointerMove(slider(), { clientX: 30, pointerId: 1 });
    expect(slider()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.pointerMove(slider(), { clientX: 270, pointerId: 1 });
    expect(slider()).toHaveAttribute("aria-valuenow", "100");
  });

  it("maps a horizontal drag to the cover angle and stays where released", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { container } = render(
      <FoldingFrame
        src={SRC}
        alt="Photo"
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );
    mockRect(slider());
    fireEvent.pointerMove(slider(), { clientX: 30, pointerId: 1 });
    expect(onValueChange).not.toHaveBeenCalled();

    fireEvent.pointerDown(slider(), { clientX: 270, pointerId: 1, button: 0 });
    expect(part(container, "folding-frame")).toHaveAttribute("data-dragging");
    expect(part(container, "folding-frame-rig")?.style.transition).toBe("none");
    // 55% across is 99° of 176°: 43.75% open, rounded.
    fireEvent.pointerMove(slider(), { clientX: 165, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(44);
    fireEvent.pointerMove(slider(), { clientX: 0, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(100);
    fireEvent.pointerMove(slider(), { clientX: 120, pointerId: 1 });
    expect(onValueChange).toHaveBeenLastCalledWith(63);
    fireEvent.pointerUp(slider(), { pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledExactlyOnceWith(63);
    expect(slider()).toHaveAttribute("aria-valuenow", "63");
    expect(part(container, "folding-frame")).not.toHaveAttribute("data-dragging");

    fireEvent.pointerCancel(slider(), { pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledOnce();
  });

  it("snaps open or shut on release when asked", () => {
    const onValueCommit = vi.fn();
    render(<FoldingFrame src={SRC} alt="Photo" snap onValueCommit={onValueCommit} />);
    mockRect(slider());
    fireEvent.pointerDown(slider(), { clientX: 270, pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider(), { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(slider(), { pointerId: 1 });
    expect(onValueCommit).toHaveBeenLastCalledWith(100);
    expect(slider()).toHaveAttribute("aria-valuenow", "100");
    fireEvent.pointerDown(slider(), { clientX: 30, pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider(), { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(slider(), { pointerId: 1 });
    expect(onValueCommit).toHaveBeenLastCalledWith(0);
  });

  it("ignores secondary buttons, an unmeasured frame and a disabled frame", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <FoldingFrame src={SRC} alt="Photo" onValueChange={onValueChange} />,
    );
    fireEvent.pointerDown(slider(), { clientX: 30, pointerId: 1, button: 2 });
    fireEvent.pointerMove(slider(), { clientX: 30, pointerId: 1 });
    // jsdom's zero-width rect: nothing to measure against.
    fireEvent.pointerDown(slider(), { clientX: 30, pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider(), { clientX: 30, pointerId: 1 });
    fireEvent.pointerUp(slider(), { pointerId: 1 });
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(<FoldingFrame src={SRC} alt="Photo" onValueChange={onValueChange} disabled />);
    fireEvent.keyDown(slider(), { key: "End" });
    fireEvent.pointerDown(slider(), { clientX: 30, pointerId: 1, button: 0 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(slider()).toHaveAttribute("tabindex", "-1");
    expect(slider()).toHaveAttribute("aria-disabled", "true");
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState(20);
      return (
        <>
          <FoldingFrame src={SRC} alt="Photo" value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await user.tab();
    await user.keyboard("{PageUp}");
    expect(screen.getByRole("status")).toHaveTextContent("45");
    expect(slider()).toHaveAttribute("aria-valuenow", "45");
  });

  it("applies the feel props and fill", () => {
    const { container } = render(
      <FoldingFrame
        src={SRC}
        alt="Photo"
        label="Open the photo"
        fill="dark"
        corner={30}
        thickness={12}
        depth={0}
        liquid={0}
      />,
    );
    expect(screen.getByRole("slider", { name: "Open the photo" })).toHaveStyle({
      borderRadius: "24px",
    });
    expect(part(container, "folding-frame")).toHaveClass(
      "[--ff-surface:var(--color-foreground)]",
    );
    expect(part(container, "folding-frame-spine")).toHaveStyle({ width: "12px" });
    expect(part(container, "folding-frame-liquid")).toBeNull();
    expect(part(container, "folding-frame-cast")?.style.opacity).toBe("0");
  });

  it("uses the SVG refraction only where it renders", () => {
    vi.stubGlobal("navigator", {
      userAgent: "x",
      userAgentData: { brands: [{ brand: "Chromium" }] },
    });
    const { container, unmount } = render(<FoldingFrame src={SRC} alt="Photo" />);
    expect(part(container, "folding-frame")).toHaveAttribute("data-liquid", "svg");
    expect(part(container, "folding-frame-liquid")?.style.backdropFilter).toContain("url(#");
    unmount();
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Firefox/130.0" });
    const second = render(<FoldingFrame src={SRC} alt="Photo" />);
    expect(part(second.container, "folding-frame")).toHaveAttribute("data-liquid", "fallback");
    expect(part(second.container, "folding-frame-liquid")?.style.backdropFilter).not.toContain(
      "url(",
    );
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FoldingFrame ref={ref} src={SRC} alt="Photo" className="w-40" data-testid="frame" />,
    );
    expect(ref.current).toBe(screen.getByTestId("frame"));
    expect(ref.current).toHaveClass("w-40");
    expect(ref.current).not.toHaveClass("w-75");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <FoldingFrame src={SRC} alt="A lake at dawn" defaultValue={40} />,
    );
    await expectNoA11yViolations(container);
  });
});
