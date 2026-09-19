import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  useElapsedSeconds,
  type ReasoningProps,
} from "./ai-reasoning";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function Trace(props: ReasoningProps & { shimmer?: boolean }) {
  const { shimmer, ...rest } = props;
  return (
    <Reasoning {...rest}>
      <ReasoningTrigger shimmer={shimmer} />
      <ReasoningContent>
        Step one.
        <button type="button">Inside</button>
      </ReasoningContent>
    </Reasoning>
  );
}

function trigger() {
  return screen.getByRole("button", { name: /Thinking…|Reasoning|Thought/ });
}

describe("Reasoning defaults (ADR 0009)", () => {
  it("does not open when streaming starts without autoOpen", () => {
    const { rerender } = render(<Trace streaming={false} />);
    rerender(<Trace streaming />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("feeds the root's streaming to the trigger label, and the trigger prop wins", () => {
    const { rerender } = render(<Trace streaming />);
    expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();

    rerender(
      <Reasoning streaming>
        <ReasoningTrigger streaming={false} />
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "Reasoning" })).toBeInTheDocument();
  });
});

describe("Reasoning autoOpen", () => {
  it("opens when streaming turns true", () => {
    const { rerender } = render(<Trace autoOpen streaming={false} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    rerender(<Trace autoOpen streaming />);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("stops deciding once the reader has toggled", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Trace autoOpen streaming onOpenChange={onOpenChange} />);
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(<Trace autoOpen streaming={false} onOpenChange={onOpenChange} />);
    rerender(<Trace autoOpen streaming onOpenChange={onOpenChange} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Reasoning autoCollapse", () => {
  it("closes 600ms after streaming ends, not before", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Trace autoOpen autoCollapse streaming />);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    rerender(<Trace autoOpen autoCollapse streaming={false} />);
    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("respects a custom delay", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Trace autoOpen autoCollapse={1500} streaming />);
    rerender(<Trace autoOpen autoCollapse={1500} streaming={false} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("does not close while focus is inside the trace", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Trace autoOpen autoCollapse streaming />);
    screen.getByRole("button", { name: "Inside" }).focus();

    rerender(<Trace autoOpen autoCollapse streaming={false} />);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  });

  it("cancels a pending collapse when a new stream starts", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Trace autoOpen autoCollapse streaming />);
    rerender(<Trace autoOpen autoCollapse streaming={false} />);
    rerender(<Trace autoOpen autoCollapse streaming />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses a trace the reader opened by default, if they never toggled it", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Trace defaultOpen autoCollapse streaming />);
    rerender(<Trace defaultOpen autoCollapse streaming={false} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Reasoning with controlled open", () => {
  it("ignores the auto props and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { rerender } = render(<Trace open={false} autoOpen streaming={false} />);
    rerender(<Trace open={false} autoOpen streaming />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("ignored when `open` is controlled"),
    );
  });

  it("forwards its ref", () => {
    const ref = vi.fn();
    render(<Reasoning ref={ref} autoOpen />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });
});

describe("ReasoningTrigger duration", () => {
  it("labels a finished trace with the time spent", () => {
    render(
      <Reasoning>
        <ReasoningTrigger duration={4.2} />
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "Thought for 4.2s" })).toBeInTheDocument();
  });

  it("still says Thinking while streaming, and durationLabel sets the words", () => {
    const { rerender } = render(
      <Reasoning streaming>
        <ReasoningTrigger duration={4.2} />
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();

    rerender(
      <Reasoning>
        <ReasoningTrigger
          duration={3}
          durationLabel={(seconds) => `${String(seconds)} s of thought`}
        />
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "3 s of thought" })).toBeInTheDocument();
  });
});

describe("useElapsedSeconds", () => {
  it("is null until the first run ends, then the measured seconds", () => {
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    const { result, rerender } = renderHook(({ active }) => useElapsedSeconds(active), {
      initialProps: { active: false },
    });
    expect(result.current).toBeNull();

    rerender({ active: true });
    expect(result.current).toBeNull();

    now.mockReturnValue(5200);
    rerender({ active: false });
    expect(result.current).toBeCloseTo(4.2);

    // A new run keeps the last value until it ends.
    now.mockReturnValue(6000);
    rerender({ active: true });
    expect(result.current).toBeCloseTo(4.2);
    now.mockReturnValue(7500);
    rerender({ active: false });
    expect(result.current).toBeCloseTo(1.5);
  });
});

describe("ReasoningTrigger shimmer", () => {
  it("shimmers the label only while streaming", () => {
    const { container, rerender } = render(<Trace shimmer streaming />);
    expect(container.querySelector("[data-slot='shimmer-text']")).toHaveTextContent(
      "Thinking…",
    );
    expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();

    rerender(<Trace shimmer streaming={false} />);
    expect(container.querySelector("[data-slot='shimmer-text']")).toBeNull();
  });

  it("does not shimmer by default", () => {
    const { container } = render(<Trace streaming />);
    expect(container.querySelector("[data-slot='shimmer-text']")).toBeNull();
  });

  it("has no accessibility violations while shimmering", async () => {
    const { container } = render(<Trace shimmer streaming autoOpen />);
    await expectNoA11yViolations(container);
  });
});
