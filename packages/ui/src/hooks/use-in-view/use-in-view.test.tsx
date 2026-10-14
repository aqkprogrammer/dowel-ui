import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInView, type UseInViewOptions } from "./use-in-view";

interface Observed {
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  targets: Element[];
  disconnected: boolean;
}

function stubIntersectionObserver() {
  const observers: Observed[] = [];
  class Observer {
    record: Observed;
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.record = { callback, options, targets: [], disconnected: false };
      observers.push(this.record);
    }
    observe(target: Element) {
      this.record.targets.push(target);
    }
    unobserve() {}
    disconnect() {
      this.record.disconnected = true;
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  return {
    observers,
    fire(visible: boolean) {
      act(() => {
        for (const observer of observers.filter((entry) => !entry.disconnected)) {
          observer.callback(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
        }
      });
    },
  };
}

function Probe(options: UseInViewOptions) {
  const { ref, inView } = useInView<HTMLDivElement>(options);
  return (
    <div ref={ref} data-testid="probe">
      {inView ? "visible" : "hidden"}
    </div>
  );
}

describe("useInView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the element coming into and leaving view", () => {
    const io = stubIntersectionObserver();
    render(<Probe initial={false} rootMargin="100px" threshold={0.5} />);
    const probe = screen.getByTestId("probe");
    expect(probe).toHaveTextContent("hidden");
    expect(io.observers[0]?.targets).toEqual([probe]);
    expect(io.observers[0]?.options).toEqual({ rootMargin: "100px", threshold: 0.5 });
    io.fire(true);
    expect(probe).toHaveTextContent("visible");
    io.fire(false);
    expect(probe).toHaveTextContent("hidden");
  });

  it("starts visible by default, so nothing gated on it is stranded", () => {
    stubIntersectionObserver();
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("visible");
  });

  it("stops watching after the first sighting with once", () => {
    const io = stubIntersectionObserver();
    render(<Probe initial={false} once />);
    io.fire(true);
    expect(io.observers[0]?.disconnected).toBe(true);
    io.fire(false);
    expect(screen.getByTestId("probe")).toHaveTextContent("visible");
  });

  it("disconnects when the element unmounts", () => {
    const io = stubIntersectionObserver();
    const { unmount } = render(<Probe />);
    unmount();
    expect(io.observers[0]?.disconnected).toBe(true);
  });

  it("reports initial without an IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { rerender } = render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("visible");
    rerender(<Probe initial={false} />);
    // `initial` only seeds the first render; it does not reset an observation.
    expect(screen.getByTestId("probe")).toHaveTextContent("visible");
  });
});
