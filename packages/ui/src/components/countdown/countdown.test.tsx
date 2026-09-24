import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  autoUnits,
  Countdown,
  countdownParts,
  describeCountdownParts,
  secondsUntil,
} from "./countdown";

const START = new Date("2026-01-01T00:00:00Z").getTime();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

function segment(unit: string) {
  return document.querySelector(`[data-slot="countdown-segment"][data-unit="${unit}"]`);
}

function value(unit: string) {
  return segment(unit)?.getAttribute("data-value");
}

function shownUnits() {
  return [...document.querySelectorAll('[data-slot="countdown-segment"]')].map((node) =>
    node.getAttribute("data-unit"),
  );
}

function sentence() {
  return document.querySelector('[data-slot="countdown-description"]');
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "visibilityState");
});

describe("countdown helpers", () => {
  it("rounds seconds up and never goes negative", () => {
    expect(secondsUntil(5_300, 0)).toBe(6);
    expect(secondsUntil(5_000, 0)).toBe(5);
    expect(secondsUntil(0, 10)).toBe(0);
  });

  it("lets the largest shown unit absorb hidden larger ones", () => {
    const total = 93_784; // 1d 2h 3m 4s
    expect(countdownParts(total, ["days", "hours", "minutes", "seconds"])).toEqual({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
    });
    expect(countdownParts(total, ["hours", "minutes"])).toEqual({ hours: 26, minutes: 3 });
  });

  it("drops leading zero units, down to minutes and seconds", () => {
    expect(autoUnits(93_784)).toEqual(["days", "hours", "minutes", "seconds"]);
    expect(autoUnits(3_600)).toEqual(["hours", "minutes", "seconds"]);
    expect(autoUnits(59)).toEqual(["minutes", "seconds"]);
  });

  it("describes the time left to the minute, in the given locale", () => {
    expect(describeCountdownParts(93_784, "en")).toBe(
      "1 day, 2 hours, and 3 minutes remaining",
    );
    expect(describeCountdownParts(3_660, "en")).toBe("1 hour and 1 minute remaining");
    expect(describeCountdownParts(59, "en")).toBe("Less than a minute remaining");
    expect(describeCountdownParts(0, "en")).toBe("Countdown complete");
    expect(
      describeCountdownParts(120, "de", {
        remaining: (duration) => `Noch ${duration}`,
        underAMinute: "Gleich",
        complete: "Fertig",
      }),
    ).toBe("Noch 2 Minuten");
    expect(describeCountdownParts(0, "de", { complete: "Fertig" })).toBe("Fertig");
  });
});

describe("Countdown", () => {
  it("renders a timer that is not live, with a sentence for assistive technology", () => {
    render(<Countdown date={START + DAY + 2 * HOUR + 3 * MINUTE + 4_000} locales="en" />);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAttribute("aria-live", "off");
    expect(timer).toHaveAttribute("data-state", "running");
    expect(shownUnits()).toEqual(["days", "hours", "minutes", "seconds"]);
    expect([value("days"), value("hours"), value("minutes"), value("seconds")]).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(sentence()).toHaveTextContent("1 day, 2 hours, and 3 minutes remaining");
    expect(sentence()).not.toHaveAttribute("aria-live");
    expect(timer.querySelector('[data-slot="countdown-display"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("separates days with a space and the clock with colons, left to right", () => {
    render(<Countdown date={START + DAY + 5_000} />);
    const display = document.querySelector('[data-slot="countdown-display"]');
    expect(display).toHaveAttribute("dir", "ltr");
    const separators = [...document.querySelectorAll('[data-slot="countdown-separator"]')];
    expect(separators.map((node) => node.textContent)).toEqual([" ", ":", ":"]);
  });

  it("ticks on the target's second boundaries", () => {
    render(<Countdown date={START + 5_300} />);
    expect(shownUnits()).toEqual(["minutes", "seconds"]);
    expect(value("seconds")).toBe("6");
    advance(299);
    expect(value("seconds")).toBe("6");
    advance(10);
    expect(value("seconds")).toBe("5");
    advance(1_000);
    expect(value("seconds")).toBe("4");
  });

  it("drops a leading unit when it reaches zero", () => {
    render(<Countdown date={START + HOUR} />);
    expect(shownUnits()).toEqual(["hours", "minutes", "seconds"]);
    expect(value("hours")).toBe("1");
    advance(1_010);
    expect(shownUnits()).toEqual(["minutes", "seconds"]);
    expect([value("minutes"), value("seconds")]).toEqual(["59", "59"]);
  });

  it("completes once, then stops ticking", () => {
    const onComplete = vi.fn();
    render(<Countdown date={START + 2_000} onComplete={onComplete} locales="en" />);
    advance(2_100);
    expect(screen.getByRole("timer")).toHaveAttribute("data-state", "complete");
    expect(value("seconds")).toBe("0");
    expect(sentence()).toHaveTextContent("Countdown complete");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    advance(5_000);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("completes immediately for a date that has passed", () => {
    const onComplete = vi.fn();
    render(<Countdown date={START - 1} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole("timer")).toHaveAttribute("data-state", "complete");
  });

  it("pauses while the page is hidden and resyncs on return", () => {
    render(<Countdown date={START + 10_000} />);
    expect(value("seconds")).toBe("10");
    setVisibility("hidden");
    expect(vi.getTimerCount()).toBe(0);
    advance(4_000);
    expect(value("seconds")).toBe("10");
    setVisibility("visible");
    expect(value("seconds")).toBe("6");
    advance(1_010);
    expect(value("seconds")).toBe("5");
  });

  it("follows an injected clock and does not tick on its own", () => {
    const { rerender } = render(<Countdown date={START + 90_000} now={START} />);
    expect([value("minutes"), value("seconds")]).toEqual(["1", "30"]);
    advance(5_000);
    expect(value("seconds")).toBe("30");
    rerender(<Countdown date={START + 90_000} now={new Date(START + 45_000)} />);
    expect([value("minutes"), value("seconds")]).toEqual(["0", "45"]);
  });

  it("accepts a date as a Date or an ISO string", () => {
    const { rerender } = render(<Countdown date={new Date(START + 3_000)} />);
    expect(value("seconds")).toBe("3");
    rerender(<Countdown date={new Date(START + 7_000).toISOString()} />);
    expect(value("seconds")).toBe("7");
  });

  it("stays pending for a date it cannot read", () => {
    const onComplete = vi.fn();
    render(<Countdown date="not a date" onComplete={onComplete} />);
    expect(screen.getByRole("timer")).toHaveAttribute("data-state", "pending");
    expect(onComplete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows exactly the units asked for", () => {
    render(
      <Countdown
        date={START + DAY + 2 * HOUR + 3 * MINUTE + 4_000}
        units={["minutes", "hours"]}
      />,
    );
    expect(shownUnits()).toEqual(["hours", "minutes"]);
    expect([value("hours"), value("minutes")]).toEqual(["26", "3"]);
  });

  it("stacks values over localised, pluralised captions in the labelled format", () => {
    const { rerender } = render(
      <Countdown date={START + DAY + 60_000} format="labelled" locales="en" />,
    );
    const captions = () =>
      [...document.querySelectorAll('[data-slot="countdown-label"]')].map(
        (node) => node.textContent,
      );
    expect(captions()).toEqual(["day", "hours", "minute", "seconds"]);
    rerender(
      <Countdown
        date={START + DAY + 60_000}
        format="labelled"
        labels={{ days: "D", hours: "H", minutes: "M", seconds: "S" }}
      />,
    );
    expect(captions()).toEqual(["D", "H", "M", "S"]);
  });

  it("announces politely, at most once a minute, only when live", () => {
    render(<Countdown date={START + 3 * MINUTE} live locales="en" />);
    expect(sentence()).toHaveAttribute("aria-live", "polite");
    expect(sentence()).toHaveAttribute("aria-atomic", "true");
    expect(sentence()).toHaveTextContent("3 minutes remaining");
    advance(30_010);
    expect(sentence()).toHaveTextContent("2 minutes remaining");
    advance(20_000);
    expect(sentence()).toHaveTextContent("2 minutes remaining");
  });

  it("renders a pending placeholder on the server, and a definite value with `now`", () => {
    const pending = renderToString(<Countdown date={START + 10_000} />);
    expect(pending).toContain('data-state="pending"');
    expect(pending).toContain("––");
    expect(pending).not.toContain("remaining");

    const known = renderToString(<Countdown date={START + 10_000} now={START} locales="en" />);
    expect(known).toContain('data-state="running"');
    expect(known).toContain("Less than a minute remaining");
  });

  it("hydrates the server markup without a mismatch", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const element = <Countdown date={START + 10_000} format="labelled" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, element);
      await Promise.resolve();
    });
    expect(error).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="countdown"]')).toHaveAttribute(
      "data-state",
      "running",
    );
    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it("stops its clock on unmount", () => {
    const { unmount } = render(<Countdown date={START + DAY} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Countdown
        ref={ref}
        date={START + 5_000}
        className="inline-grid text-4xl"
        data-testid="countdown"
        aria-label="Sale ends"
      />,
    );
    const root = screen.getByTestId("countdown");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("inline-grid", "text-4xl");
    expect(root).not.toHaveClass("inline-flex");
    expect(screen.getByRole("timer", { name: "Sale ends" })).toBe(root);
  });

  it("has no accessibility violations in either format", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<Countdown date={Date.now() + DAY} />);
    await expectNoA11yViolations(container);
    rerender(<Countdown date={Date.now() + DAY} format="labelled" live />);
    await expectNoA11yViolations(container);
  });
});
