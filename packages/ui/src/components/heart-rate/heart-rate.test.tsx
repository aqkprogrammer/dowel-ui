import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { HeartRate } from "./heart-rate";

afterEach(() => {
  vi.useRealTimers();
});

describe("HeartRate", () => {
  it("is a labelled group with the rate as text", () => {
    render(<HeartRate bpm={72} />);
    const group = screen.getByRole("group", { name: "Heart rate" });
    expect(group).toHaveTextContent("72");
    expect(group).toHaveTextContent("bpm");
  });

  it("rounds the rate it shows", () => {
    render(<HeartRate bpm={71.6} />);
    expect(screen.getByRole("group")).toHaveTextContent("72");
  });

  it("does not rely on colour alone for status", () => {
    const { rerender } = render(<HeartRate bpm={72} />);
    expect(screen.getByRole("group")).not.toHaveTextContent("Elevated");
    rerender(<HeartRate bpm={120} status="warning" />);
    expect(screen.getByRole("group")).toHaveTextContent("Elevated");
    rerender(<HeartRate bpm={170} status="critical" statusLabel="Too high" />);
    expect(screen.getByRole("group")).toHaveTextContent("Too high");
    expect(screen.getByRole("group")).toHaveAttribute("data-status", "critical");
  });

  it("announces a changed rate, at most once per interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const { rerender } = render(<HeartRate bpm={72} announceEvery={5000} />);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    rerender(<HeartRate bpm={80} announceEvery={5000} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(status).toHaveTextContent("Heart rate 80 beats per minute");

    rerender(<HeartRate bpm={84} announceEvery={5000} />);
    rerender(<HeartRate bpm={88} announceEvery={5000} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(status).toHaveTextContent("80 beats per minute");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(status).toHaveTextContent("Heart rate 88 beats per minute");
  });

  it("keeps the trace and heart decorative", () => {
    render(<HeartRate bpm={72} />);
    expect(document.querySelector('[data-slot="heart-rate-trace"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(document.querySelector('[data-slot="heart-rate-heart"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("takes its own label and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<HeartRate ref={ref} bpm={60} label="Resting pulse" />);
    expect(screen.getByRole("group", { name: "Resting pulse" })).toBe(ref.current);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<HeartRate bpm={72} status="warning" />);
    await expectNoA11yViolations(container);
  });
});
