import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Island, islandEasing } from "./island";

const VIEWS = {
  idle: <span>Idle</span>,
  ring: (
    <span>
      Incoming call <button type="button">Answer</button>
    </span>
  ),
};

function pill() {
  return document.querySelector<HTMLElement>('[data-slot="island"]')!;
}

/** jsdom has no layout: give every element a size and capture the observer. */
function stubLayout(width: number, height: number) {
  const size = { width, height };
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => size.width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => size.height);
  const callbacks: (() => void)[] = [];
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  return {
    size,
    disconnect,
    resize(nextWidth: number, nextHeight: number) {
      size.width = nextWidth;
      size.height = nextHeight;
      act(() => {
        for (const callback of callbacks) callback();
      });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Island", () => {
  it("renders the current view", () => {
    render(<Island view="idle" views={VIEWS} />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.queryByText("Incoming call")).not.toBeInTheDocument();
    expect(pill()).toHaveAttribute("data-view", "idle");
  });

  it("swaps content when the view changes, remounting it so it animates in", () => {
    const { rerender } = render(<Island view="idle" views={VIEWS} />);
    const before = document.querySelector('[data-slot="island-content"]');
    rerender(<Island view="ring" views={VIEWS} />);
    expect(screen.getByRole("button", { name: "Answer" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="island-content"]')).not.toBe(before);
  });

  it("hoists its keyframes once", () => {
    render(
      <>
        <Island view="idle" views={VIEWS} />
        <Island view="ring" views={VIEWS} />
      </>,
    );
    expect(document.querySelectorAll('style[data-href="dowel-island"]')).toHaveLength(1);
  });

  it("stays auto-sized until the content has been measured", () => {
    render(<Island view="idle" views={VIEWS} />);
    expect(pill().style.width).toBe("");
  });

  it("sizes itself to the measured content and follows it", () => {
    const layout = stubLayout(120, 40);
    const { unmount } = render(<Island view="idle" views={VIEWS} />);
    expect(pill()).toHaveStyle({ width: "120px", height: "40px" });

    layout.resize(256, 56);
    expect(pill()).toHaveStyle({ width: "256px", height: "56px" });

    // An unchanged measurement does not re-render.
    layout.resize(256, 56);
    expect(pill()).toHaveStyle({ width: "256px" });

    unmount();
    expect(layout.disconnect).toHaveBeenCalled();
  });

  it("maps bounce onto the transition curve, clamped", () => {
    expect(islandEasing(0)).toBe("cubic-bezier(0.34, 1.00, 0.64, 1)");
    expect(islandEasing(0.5)).toBe("cubic-bezier(0.34, 1.40, 0.64, 1)");
    expect(islandEasing(4)).toBe("cubic-bezier(0.34, 1.80, 0.64, 1)");
    render(<Island view="idle" views={VIEWS} bounce={0} />);
    expect(pill().style.transitionTimingFunction).toBe(islandEasing(0));
  });

  it("passes the previous and next view to a bounce function", () => {
    const bounce = vi.fn(() => 0.3);
    const { rerender } = render(<Island view="idle" views={VIEWS} bounce={bounce} />);
    expect(bounce).toHaveBeenLastCalledWith("idle", "idle");
    rerender(<Island view="ring" views={VIEWS} bounce={bounce} />);
    expect(bounce).toHaveBeenLastCalledWith("idle", "ring");
    expect(pill().style.transitionTimingFunction).toBe(islandEasing(0.3));
  });

  it("is silent by default and announces views when live", () => {
    const { rerender } = render(<Island view="idle" views={VIEWS} />);
    expect(pill()).not.toHaveAttribute("aria-live");
    rerender(<Island view="idle" views={VIEWS} live="polite" />);
    expect(pill()).toHaveAttribute("aria-live", "polite");
    expect(pill()).toHaveAttribute("aria-atomic", "true");
  });

  it("applies tone variants and lets a consumer className win", () => {
    const { rerender } = render(<Island view="idle" views={VIEWS} />);
    expect(pill()).toHaveClass("bg-foreground");
    rerender(<Island view="idle" views={VIEWS} tone="card" className="rounded-lg bg-muted" />);
    expect(pill()).toHaveClass("rounded-lg", "bg-muted", "border-border");
    expect(pill()).not.toHaveClass("rounded-[2rem]", "bg-card");
  });

  it("forwards its ref and native props, merging a consumer style", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Island
        ref={ref}
        view="idle"
        views={VIEWS}
        id="island"
        aria-label="Now playing"
        style={{ marginBlock: "4px" }}
      />,
    );
    expect(ref.current).toBe(pill());
    expect(pill()).toHaveAttribute("id", "island");
    expect(pill()).toHaveStyle({ marginBlock: "4px" });
  });

  it("keeps the controls inside a view operable from the keyboard", async () => {
    const user = userEvent.setup();
    function Player() {
      const [playing, setPlaying] = useState(false);
      return (
        <Island
          view="player"
          views={{
            player: (
              <button type="button" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
                Play
              </button>
            ),
          }}
        />
      );
    }
    render(<Player />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Island view="ring" views={VIEWS} live="polite" />);
    await expectNoA11yViolations(container);
  });
});
