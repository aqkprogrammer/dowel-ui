import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "./canvas-mock";
import {
  DitherCanvas,
  DitherTable,
  formatDitherValue,
  prefersReducedMotion,
  type DitherDraw,
  type DitherFrame,
} from "./dither-canvas";
import {
  DitherCursor,
  indexFromKey,
  indexFromPointer,
  useDitherScrubber,
} from "./dither-scrubber";

function mockReducedMotion(reduced: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("DitherCanvas", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 200, height: 100 });
  });
  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it("sizes the backing store to the box, capping DPR at 2, and scales to CSS pixels", () => {
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
    const frames: DitherFrame[] = [];
    const { container } = render(
      <DitherCanvas draw={(_, frame) => void frames.push(frame)} animate={false} />,
    );
    act(() => void mock.flush());
    const canvas = container.querySelector("canvas");
    expect(canvas?.width).toBe(400);
    expect(canvas?.height).toBe(200);
    expect(frames[0]).toMatchObject({
      width: 200,
      height: 100,
      dpr: 2,
      cell: 4.6,
      animated: false,
      time: 0,
    });
    expect(mock.calls.find((call) => call.method === "setTransform")?.args).toEqual([
      2, 0, 0, 2, 0, 0,
    ]);
    expect(mock.calls.find((call) => call.method === "clearRect")?.args).toEqual([
      0, 0, 200, 100,
    ]);
  });

  it("keeps animating while animate is on, and advances the clock", () => {
    const draw = vi.fn<DitherDraw>();
    render(<DitherCanvas draw={draw} cell={6} />);
    act(() => void mock.flush(5));
    expect(draw.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(mock.pending()).toBe(1);
    const last = draw.mock.calls.at(-1)?.[1];
    expect(last?.animated).toBe(true);
    expect(last?.time).toBeGreaterThan(0);
    expect(last?.cell).toBe(6);
  });

  it("draws on demand when not animating, continuing only while draw asks", () => {
    let settling = 3;
    const draw = vi.fn<DitherDraw>(() => settling-- > 0);
    render(<DitherCanvas draw={draw} animate={false} />);
    act(() => void mock.flush(10));
    expect(draw).toHaveBeenCalledTimes(4);
    expect(mock.pending()).toBe(0);
  });

  it("redraws when the draw function changes", () => {
    const first = vi.fn<DitherDraw>();
    const second = vi.fn<DitherDraw>();
    const { rerender } = render(<DitherCanvas draw={first} animate={false} />);
    act(() => void mock.flush(3));
    rerender(<DitherCanvas draw={second} animate={false} />);
    act(() => void mock.flush(3));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("draws a single static frame under reduced motion", () => {
    mockReducedMotion(true);
    const draw = vi.fn<DitherDraw>();
    render(<DitherCanvas draw={draw} />);
    act(() => void mock.flush(10));
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw.mock.calls[0]?.[1]).toMatchObject({
      reducedMotion: true,
      animated: false,
      time: 0,
    });
  });

  it("treats a theme --motion-scale near zero as reduced motion", () => {
    document.documentElement.style.setProperty("--motion-scale", "0.001");
    expect(prefersReducedMotion()).toBe(true);
    document.documentElement.style.removeProperty("--motion-scale");
    expect(prefersReducedMotion()).toBe(false);
  });

  it("pauses while the tab is hidden and resumes when it returns", () => {
    const draw = vi.fn<DitherDraw>();
    render(<DitherCanvas draw={draw} />);
    act(() => void mock.flush(2));
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => void mock.flush(1));
    const count = draw.mock.calls.length;
    expect(mock.pending()).toBe(0);
    hidden.mockReturnValue(false);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    act(() => void mock.flush(2));
    expect(draw.mock.calls.length).toBe(count + 2);
    // Resuming does not count the paused time as one enormous frame.
    expect(draw.mock.calls[count]?.[1].delta).toBe(0);
  });

  it("pauses while off-screen", () => {
    let report: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const draw = vi.fn<DitherDraw>();
    const { unmount } = render(<DitherCanvas draw={draw} />);
    act(() => void mock.flush(1));
    act(
      () =>
        void report(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
    );
    act(() => void mock.flush(3));
    const count = draw.mock.calls.length;
    expect(mock.pending()).toBe(0);
    act(
      () =>
        void report(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
    );
    act(() => void mock.flush(1));
    expect(draw.mock.calls.length).toBe(count + 1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("follows resizes from the ResizeObserver", () => {
    let report: ResizeObserverCallback = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const frames: DitherFrame[] = [];
    const { container } = render(
      <DitherCanvas draw={(_, frame) => void frames.push(frame)} animate={false} />,
    );
    act(() => void mock.flush());
    act(
      () =>
        void report(
          [{ contentRect: { width: 50, height: 40 } } as ResizeObserverEntry],
          {} as ResizeObserver,
        ),
    );
    act(() => void mock.flush());
    expect(frames.at(-1)).toMatchObject({ width: 50, height: 40 });
    expect(container.querySelector("canvas")?.width).toBe(50);
    vi.unstubAllGlobals();
  });

  it("skips drawing when the box has no size", () => {
    mock.restore();
    mock = installCanvasMock({ width: 0, height: 0 });
    const draw = vi.fn<DitherDraw>();
    render(<DitherCanvas draw={draw} />);
    act(() => void mock.flush(3));
    expect(draw).not.toHaveBeenCalled();
  });

  it("caches resolved colours until the theme changes", async () => {
    const tokens: string[] = [];
    const draw = vi.fn<DitherDraw>((_, frame) => {
      tokens.push(frame.color("primary"));
    });
    const spy = vi.spyOn(window, "getComputedStyle");
    render(<DitherCanvas draw={draw} animate={false} />);
    act(() => void mock.flush());
    const lookups = spy.mock.calls.length;
    act(() => void mock.flush());
    document.documentElement.classList.add("dark");
    await act(async () => {
      await Promise.resolve();
    });
    act(() => void mock.flush());
    expect(draw).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.length).toBeGreaterThan(lookups);
    document.documentElement.classList.remove("dark");
  });

  it("cancels its frame and observers on unmount", () => {
    const draw = vi.fn<DitherDraw>();
    const { unmount } = render(<DitherCanvas draw={draw} />);
    expect(mock.pending()).toBe(1);
    unmount();
    expect(mock.pending()).toBe(0);
  });

  it("is decorative by default, exposed when given a role, and forwards ref and className", () => {
    const ref = createRef<HTMLCanvasElement>();
    const { container, rerender } = render(
      <DitherCanvas ref={ref} draw={() => {}} className="block size-4" data-testid="canvas" />,
    );
    const canvas = screen.getByTestId("canvas");
    expect(ref.current).toBe(canvas);
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-slot", "dither-canvas");
    expect(canvas.className).toContain("size-4");
    expect(canvas.className).not.toContain("size-full");
    let called: HTMLCanvasElement | null = null;
    rerender(
      <DitherCanvas
        ref={(node) => {
          called = node;
        }}
        draw={() => {}}
        role="img"
        aria-label="Chart"
      />,
    );
    expect(screen.getByRole("img", { name: "Chart" })).not.toHaveAttribute("aria-hidden");
    expect(called).toBe(container.querySelector("canvas"));
  });
});

describe("DitherTable", () => {
  it("is always in the accessibility tree, and visible on request", async () => {
    const { container, rerender } = render(
      <DitherTable
        caption="Plans"
        columns={["Plan", "Members"]}
        rows={[["Unlimited", "1,240"]]}
      />,
    );
    const table = screen.getByRole("table", { name: "Plans" });
    expect(table).toHaveClass("sr-only");
    expect(screen.getByRole("rowheader", { name: "Unlimited" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1,240" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
    rerender(
      <DitherTable
        caption="Plans"
        columns={["Plan", "Members"]}
        rows={[["Unlimited", "1,240"]]}
        visible
      />,
    );
    expect(table).not.toHaveClass("sr-only");
    expect(table).toHaveAttribute("data-visible", "true");
  });

  it("formats values with locale grouping", () => {
    expect(formatDitherValue(1240)).toBe(new Intl.NumberFormat().format(1240));
    expect(formatDitherValue(1.234)).toBe(new Intl.NumberFormat().format(1.23));
  });
});

describe("scrubber", () => {
  it("maps pointer positions and keys to indices", () => {
    expect(indexFromPointer(50, { left: 0, width: 100 }, 5)).toBe(2);
    expect(indexFromPointer(-10, { left: 0, width: 100 }, 5)).toBe(0);
    expect(indexFromPointer(500, { left: 0, width: 100 }, 5)).toBe(4);
    expect(indexFromPointer(50, { left: 0, width: 0 }, 5)).toBe(0);
    expect(indexFromKey("ArrowRight", 2, 5)).toBe(3);
    expect(indexFromKey("ArrowUp", 4, 5)).toBe(4);
    expect(indexFromKey("ArrowLeft", 0, 5)).toBe(0);
    expect(indexFromKey("ArrowDown", 3, 5)).toBe(2);
    expect(indexFromKey("PageUp", 0, 30)).toBe(3);
    expect(indexFromKey("PageDown", 10, 30)).toBe(7);
    expect(indexFromKey("Home", 3, 5)).toBe(0);
    expect(indexFromKey("End", 0, 5)).toBe(4);
    expect(indexFromKey("a", 0, 5)).toBeNull();
  });

  function Harness(props: {
    index?: number | null;
    onIndexChange?: (index: number | null) => void;
  }) {
    const scrubber = useDitherScrubber({ count: 5, ...props });
    const shown = scrubber.valueIndex;
    return (
      <div style={{ position: "relative" }}>
        <DitherCursor
          scrubber={scrubber}
          label="Members"
          valueText={`Day ${String(shown + 1)}`}
          x={shown / 4}
          y={0.5}
          readout={<span>Day {shown + 1}</span>}
        />
      </div>
    );
  }

  it("is a slider operated by keyboard, with a readout while active", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Members" });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    expect(container.querySelector("[data-slot=dither-cursor-readout]")).toBeNull();
    await user.tab();
    expect(slider).toHaveFocus();
    expect(container.querySelector("[data-slot=dither-cursor-readout]")).toHaveTextContent(
      "Day 5",
    );
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider).toHaveAttribute("aria-valuetext", "Day 1");
    expect(
      container.querySelector<HTMLElement>("[data-slot=dither-cursor-readout]")?.style
        .transform,
    ).toContain("translate(0%");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    await user.keyboard("{End}");
    expect(
      container.querySelector<HTMLElement>("[data-slot=dither-cursor-readout]")?.style
        .transform,
    ).toContain("translate(-100%");
    await user.keyboard("{x}");
    await user.keyboard("{Escape}");
    expect(container.querySelector("[data-slot=dither-cursor-line]")).toBeNull();
    await user.keyboard("{Escape}");
    await expectNoA11yViolations(container);
    await user.tab();
    expect(slider).not.toHaveFocus();
  });

  it("follows the pointer and hides when it leaves", () => {
    const { container } = render(<Harness />);
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 50));
    fireEvent.pointerMove(slider, { clientX: 26 });
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(
      container.querySelector<HTMLElement>("[data-slot=dither-cursor-point]")?.style.left,
    ).toBe("25%");
    fireEvent.pointerMove(slider, { clientX: 27 });
    fireEvent.pointerLeave(slider);
    expect(container.querySelector("[data-slot=dither-cursor-point]")).toBeNull();
  });

  it("keeps the cursor on pointer leave while focused", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider");
    act(() => {
      slider.focus();
    });
    fireEvent.pointerLeave(slider);
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    expect(document.querySelector("[data-slot=dither-cursor-line]")).not.toBeNull();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    function Controlled() {
      const [index, setIndex] = useState<number | null>(1);
      return (
        <Harness
          index={index}
          onIndexChange={(next) => {
            onIndexChange(next);
            setIndex(next);
          }}
        />
      );
    }
    render(<Controlled />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    render(<Harness index={9} />);
    expect(screen.getAllByRole("slider")[1]).toHaveAttribute("aria-valuenow", "4");
  });
});
