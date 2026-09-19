import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PullToRefresh, rubberBand, spinPeriod } from "./pull-to-refresh";

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
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

/** A promise the test resolves or rejects by hand. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const sheet = () => screen.getByRole("group", { name: "Refreshable content" });
const root = () => document.querySelector<HTMLElement>('[data-slot="pull-to-refresh"]')!;
const offset = () => root().style.getPropertyValue("--ptr-at") || "0px";
/** Lets promises and motion's frames run. */
const settle = (ms = 60) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const pointer = { button: 0, pointerId: 1 };

function pull(distance: number, element: HTMLElement = sheet()) {
  fireEvent.pointerDown(element, { ...pointer, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(element, { ...pointer, clientX: 0, clientY: 10 });
  fireEvent.pointerMove(element, { ...pointer, clientX: 0, clientY: 10 + distance });
}

describe("PullToRefresh", () => {
  it("wraps content in a named, described, focusable sheet with a refresh button", () => {
    render(
      <PullToRefresh>
        <p>Balance</p>
      </PullToRefresh>,
    );
    expect(sheet()).toHaveAttribute("tabindex", "0");
    expect(sheet()).toHaveAccessibleDescription("Pull down, or press Enter, to refresh.");
    expect(sheet()).toHaveTextContent("Balance");
    expect(sheet()).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(root()).toHaveAttribute("data-phase", "idle");
    expect(document.querySelectorAll('[data-slot="pull-to-refresh-dot"]')).toHaveLength(6);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("refreshes on Enter: busy and announced while the promise runs, then refreshed", async () => {
    const work = deferred();
    const onRefresh = vi.fn(() => work.promise);
    render(<PullToRefresh onRefresh={onRefresh} minDuration={0} />);
    sheet().focus();
    fireEvent.keyDown(sheet(), { key: "Enter" });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(sheet()).toHaveAttribute("aria-busy", "true");
    expect(root()).toHaveAttribute("data-phase", "refreshing");
    expect(screen.getByRole("status")).toHaveTextContent("Refreshing…");
    // Busy: further requests are ignored.
    fireEvent.keyDown(sheet(), { key: "Enter" });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await settle();
    expect(offset()).toBe("58px");
    await act(async () => {
      work.resolve();
      await work.promise;
    });
    await settle();
    expect(sheet()).not.toHaveAttribute("aria-busy");
    expect(root()).toHaveAttribute("data-phase", "idle");
    expect(screen.getByRole("status")).toHaveTextContent("Refreshed");
    expect(offset()).toBe("0px");
  });

  it("holds the refreshing state for minDuration even when the refresh is instant", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    render(
      <PullToRefresh
        minDuration={600}
        refreshingLabel="Updating"
        refreshedLabel="Up to date"
      />,
    );
    fireEvent.keyDown(sheet(), { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent("Updating");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(599);
    });
    expect(sheet()).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(sheet()).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
  });

  it("ignores Enter from inside the content and repeated keys", () => {
    const onRefresh = vi.fn();
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <button type="button">Inner</button>
      </PullToRefresh>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Inner" }), { key: "Enter" });
    fireEvent.keyDown(sheet(), { key: "Enter", repeat: true });
    fireEvent.keyDown(sheet(), { key: "a" });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("refreshes from the visible button, which reports busy", async () => {
    const user = userEvent.setup();
    const work = deferred();
    const onRefresh = vi.fn(() => work.promise);
    render(<PullToRefresh onRefresh={onRefresh} minDuration={0} refreshButtonLabel="Reload" />);
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reload" })).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      work.resolve();
      await work.promise;
    });
    await settle();
    expect(screen.getByRole("button", { name: "Reload" })).not.toHaveAttribute("aria-busy");
  });

  it("can hide the button", () => {
    render(<PullToRefresh showRefreshButton={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("follows a pull with rubber-band resistance and refreshes when released armed", async () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} minDuration={0} />);
    pull(40);
    expect(root()).toHaveAttribute("data-phase", "pulling");
    expect(root()).not.toHaveAttribute("data-armed");
    expect(offset()).toBe(`${String(rubberBand(40))}px`);
    fireEvent.pointerMove(sheet(), { ...pointer, clientX: 0, clientY: 190 });
    expect(root()).toHaveAttribute("data-armed");
    expect(Number(root().style.getPropertyValue("--ptr-p"))).toBe(1);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 190 });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(root()).toHaveAttribute("data-phase", "refreshing");
    await settle();
    expect(root()).toHaveAttribute("data-phase", "idle");
    await settle();
    expect(offset()).toBe("0px");
  });

  it("springs back without refreshing when released early or cancelled", async () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    pull(30);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 40 });
    expect(root()).toHaveAttribute("data-phase", "idle");
    await settle();
    expect(offset()).toBe("0px");
    pull(200);
    fireEvent.pointerCancel(sheet(), { ...pointer, clientX: 0, clientY: 210 });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("only pulls downward, from the top, with the primary button", () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    // Sideways and upward presses are not pulls.
    fireEvent.pointerDown(sheet(), { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(sheet(), { ...pointer, clientX: 20, clientY: 2 });
    fireEvent.pointerMove(sheet(), { ...pointer, clientX: 20, clientY: 120 });
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 20, clientY: 120 });
    fireEvent.pointerDown(sheet(), { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(sheet(), { ...pointer, clientX: 0, clientY: -20 });
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: -20 });
    // A small wobble and a plain click do nothing.
    fireEvent.pointerDown(sheet(), { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(sheet(), { ...pointer, clientX: 1, clientY: 2 });
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 1, clientY: 2 });
    // Secondary button and a stray pointer are ignored.
    fireEvent.pointerDown(sheet(), { button: 2, pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(sheet(), { pointerId: 3, clientX: 0, clientY: 200 });
    fireEvent.pointerUp(sheet(), { pointerId: 3, clientX: 0, clientY: 200 });
    expect(root()).toHaveAttribute("data-phase", "idle");
    // Scrolled content scrolls rather than pulls.
    sheet().scrollTop = 40;
    fireEvent.scroll(sheet());
    expect(sheet().style.touchAction).toBe("pan-x pan-y");
    pull(200);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 210 });
    expect(onRefresh).not.toHaveBeenCalled();
    sheet().scrollTop = 0;
    fireEvent.scroll(sheet());
    expect(sheet().style.touchAction).toBe("pan-x pan-down");
  });

  it("swallows the click a pull leaves behind, but not a plain click", () => {
    const onClick = vi.fn();
    render(
      <PullToRefresh minDuration={0}>
        <button type="button" onClick={onClick}>
          1H
        </button>
      </PullToRefresh>,
    );
    const inner = screen.getByRole("button", { name: "1H" });
    pull(20, inner);
    fireEvent.pointerUp(inner, { ...pointer, clientX: 0, clientY: 30 });
    fireEvent.click(inner);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(inner, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(inner, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.click(inner);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("follows a controlled refreshing prop", async () => {
    function Controlled() {
      const [refreshing, setRefreshing] = useState(false);
      return (
        <>
          <PullToRefresh refreshing={refreshing} onRefresh={() => setRefreshing(true)} />
          <button type="button" onClick={() => setRefreshing(false)}>
            Done
          </button>
        </>
      );
    }
    render(<Controlled />);
    fireEvent.keyDown(sheet(), { key: "Enter" });
    await settle();
    expect(sheet()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Refreshing…");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(sheet()).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("status")).toHaveTextContent("Refreshed");
  });

  it("starts busy when mounted refreshing, and settles back if control never turns on", async () => {
    const { unmount } = render(<PullToRefresh refreshing />);
    expect(sheet()).toHaveAttribute("aria-busy", "true");
    expect(offset()).toBe("58px");
    unmount();

    const onRefresh = vi.fn();
    render(<PullToRefresh refreshing={false} onRefresh={onRefresh} />);
    pull(200);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 210 });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await settle();
    expect(offset()).toBe("0px");
    expect(sheet()).not.toHaveAttribute("aria-busy");
  });

  it("ends a refresh that fails", async () => {
    const onRefresh = vi.fn(() => Promise.reject(new Error("offline")));
    render(<PullToRefresh onRefresh={onRefresh} minDuration={0} />);
    fireEvent.keyDown(sheet(), { key: "Enter" });
    await settle();
    expect(sheet()).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("status")).toHaveTextContent("Refreshed");
  });

  it("does nothing while disabled", () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh disabled onRefresh={onRefresh} />);
    expect(sheet()).toHaveAttribute("aria-disabled", "true");
    expect(sheet()).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    fireEvent.keyDown(sheet(), { key: "Enter" });
    pull(200);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 210 });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("settles instantly under reduced motion, and still refreshes", async () => {
    mockReducedMotion();
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} minDuration={0} />);
    pull(30);
    fireEvent.pointerUp(sheet(), { ...pointer, clientX: 0, clientY: 40 });
    expect(offset()).toBe("0px");
    fireEvent.keyDown(sheet(), { key: "Enter" });
    expect(offset()).toBe("58px");
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await settle();
    expect(offset()).toBe("0px");
  });

  it("applies the feel props and a consumer className, and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PullToRefresh
        ref={ref}
        fill="dark"
        stroke
        corner={12}
        dots={20}
        spin={100}
        threshold={80}
        label="Portfolio"
        className="isolation-auto w-80"
      />,
    );
    expect(ref.current).toBe(root());
    expect(root()).toHaveClass("dark", "w-80", "isolation-auto");
    expect(root()).not.toHaveClass("isolate");
    expect(root().style.getPropertyValue("--ptr-period")).toBe("1200ms");
    const group = screen.getByRole("group", { name: "Portfolio" });
    expect(group).toHaveClass("ring-1");
    expect(group.style.borderRadius).toBe("12px");
    expect(document.querySelectorAll('[data-slot="pull-to-refresh-dot"]')).toHaveLength(10);
    expect(
      document.querySelector<HTMLElement>('[data-slot="pull-to-refresh-spinner"]')!.style.top,
    ).toBe("10px");
  });

  it("maps pull distance and spin", () => {
    expect(rubberBand(-10)).toBe(0);
    expect(rubberBand(180)).toBeGreaterThan(150);
    expect(rubberBand(180)).toBeLessThan(160);
    expect(spinPeriod(50)).toBe(2400);
    expect(spinPeriod(0)).toBe(4800);
    expect(spinPeriod(-5)).toBe(4800);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <PullToRefresh>
        <p>Balance</p>
      </PullToRefresh>,
    );
    await expectNoA11yViolations(container);
  });
});
