import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StepPlayer } from "./step-player";

/* Fake timers drive requestAnimationFrame and performance.now together. */

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function steps(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-slot="step-player-step"]'));
}

function states(container: HTMLElement) {
  return steps(container).map((step) => step.dataset.state);
}

function progress(container: HTMLElement, index: number) {
  return Number(steps(container)[index]?.style.getPropertyValue("--sp-p"));
}

function control() {
  return screen.getByRole("button", { name: /^(Play|Pause|Replay)$/ });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("StepPlayer", () => {
  it("renders a paused track of five steps with a Play button", () => {
    const { container } = render(<StepPlayer />);
    expect(control()).toHaveAccessibleName("Play");
    expect(control()).toHaveAttribute("data-icon", "play");
    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemin", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
    expect(bar).toHaveAttribute("aria-valuetext", "Step 1 of 5");
    expect(states(container)).toEqual([
      "active",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(progress(container, 0)).toBe(0);
  });

  it("places steps after the bar one bar further along", () => {
    const { container } = render(<StepPlayer steps={3} defaultValue={1} />);
    const [first, second, third] = steps(container);
    expect(first?.style.getPropertyValue("--sp-x")).toBe("calc(0 * var(--sp-slot))");
    expect(second?.style.getPropertyValue("--sp-x")).toBe("calc(1 * var(--sp-slot))");
    expect(third?.style.getPropertyValue("--sp-x")).toBe(
      "calc(2 * var(--sp-slot) + var(--sp-bar) - var(--sp-dot))",
    );
    expect(states(container)).toEqual(["complete", "active", "upcoming"]);
  });

  it("fills the active step over its duration, then hands off to the next", () => {
    const onValueChange = vi.fn();
    const { container } = render(<StepPlayer duration={1000} onValueChange={onValueChange} />);
    fireEvent.click(control());
    expect(control()).toHaveAccessibleName("Pause");
    expect(control()).toHaveAttribute("data-icon", "pause");

    advance(500);
    expect(progress(container, 0)).toBeCloseTo(0.5, 1);
    advance(520);
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(states(container).slice(0, 2)).toEqual(["complete", "active"]);
    expect(progress(container, 0)).toBe(1);
    expect(progress(container, 1)).toBeLessThan(0.1);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Step 2 of 5");
  });

  it("carries overrun into the next step, so time is exact", () => {
    const { container } = render(<StepPlayer duration={1000} defaultPlaying />);
    advance(2500);
    expect(states(container).slice(0, 3)).toEqual(["complete", "complete", "active"]);
    expect(progress(container, 2)).toBeGreaterThan(0.45);
    expect(progress(container, 2)).toBeLessThan(0.55);
  });

  it("freezes mid-fill on pause and resumes from there", () => {
    const { container } = render(<StepPlayer duration={1000} />);
    fireEvent.click(control());
    advance(600);
    fireEvent.click(control());
    expect(control()).toHaveAccessibleName("Play");
    const held = progress(container, 0);
    expect(held).toBeGreaterThan(0.55);
    advance(5000);
    expect(progress(container, 0)).toBe(held);
    expect(states(container)[0]).toBe("active");

    fireEvent.click(control());
    advance(300);
    expect(states(container)[0]).toBe("active");
    advance(150);
    expect(states(container)[0]).toBe("complete");
  });

  it("ends on the last step with a Replay button, and replays from the start", () => {
    const onComplete = vi.fn();
    const onPlayingChange = vi.fn();
    const onValueChange = vi.fn();
    const { container } = render(
      <StepPlayer
        steps={2}
        duration={500}
        onComplete={onComplete}
        onPlayingChange={onPlayingChange}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(control());
    advance(1100);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    expect(control()).toHaveAccessibleName("Replay");
    expect(control()).toHaveAttribute("data-icon", "replay");
    expect(container.firstElementChild).toHaveAttribute("data-state", "ended");
    expect(progress(container, 1)).toBe(1);

    fireEvent.click(control());
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    expect(control()).toHaveAccessibleName("Pause");
    expect(states(container)).toEqual(["active", "upcoming"]);
    advance(250);
    expect(progress(container, 0)).toBeCloseTo(0.5, 1);
  });

  it("wraps when looping, completing on every pass, never showing Replay", () => {
    const onComplete = vi.fn();
    const onValueChange = vi.fn();
    const { container } = render(
      <StepPlayer
        steps={2}
        duration={500}
        loop
        defaultPlaying
        onComplete={onComplete}
        onValueChange={onValueChange}
      />,
    );
    advance(1050);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(states(container)).toEqual(["active", "upcoming"]);
    expect(control()).toHaveAccessibleName("Pause");
    advance(1000);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it("gives each step its own duration and label", () => {
    const { container } = render(
      <StepPlayer
        steps={[{ duration: 200, label: "Intro" }, { duration: 2000 }]}
        defaultPlaying
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Step 1 of 2: Intro",
    );
    advance(250);
    expect(states(container)).toEqual(["complete", "active"]);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Step 2 of 2");
  });

  it("runs no timer with a duration of 0, showing the active step full", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <StepPlayer duration={0} defaultPlaying onValueChange={onValueChange} />,
    );
    advance(10_000);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(progress(container, 0)).toBe(1);
  });

  it("waits at a timerless step it reaches, until moved on", () => {
    const onValueChange = vi.fn();
    function Driven() {
      const [value, setValue] = useState(0);
      return (
        <>
          <StepPlayer
            steps={[{ duration: 300 }, { duration: 0 }, { duration: 300 }]}
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              setValue(next);
            }}
            defaultPlaying
          />
          <button type="button" onClick={() => setValue(2)}>
            Next
          </button>
        </>
      );
    }
    const { container } = render(<Driven />);
    advance(400);
    expect(states(container)[1]).toBe("active");
    advance(3000);
    expect(states(container)[1]).toBe("active");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(states(container)[2]).toBe("active");
    advance(350);
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(control()).toHaveAccessibleName("Replay");
  });

  it("restarts a step whose value is set from outside", () => {
    function Controlled() {
      const [value, setValue] = useState(0);
      return (
        <>
          <StepPlayer duration={1000} value={value} onValueChange={setValue} defaultPlaying />
          <button type="button" onClick={() => setValue(3)}>
            Jump
          </button>
        </>
      );
    }
    const { container } = render(<Controlled />);
    advance(700);
    fireEvent.click(screen.getByRole("button", { name: "Jump" }));
    expect(states(container)[3]).toBe("active");
    expect(progress(container, 3)).toBe(0);
    advance(700);
    expect(states(container)[3]).toBe("active");
    advance(350);
    expect(states(container)[4]).toBe("active");
  });

  it("follows a controlled play state, and restarts when played from the end", () => {
    const onPlayingChange = vi.fn();
    const onValueChange = vi.fn();
    const { container, rerender } = render(
      <StepPlayer
        steps={2}
        duration={400}
        playing
        onPlayingChange={onPlayingChange}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(control());
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    expect(control()).toHaveAccessibleName("Pause");
    advance(900);
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    rerender(
      <StepPlayer steps={2} duration={400} playing={false} onValueChange={onValueChange} />,
    );
    expect(control()).toHaveAccessibleName("Replay");
    rerender(<StepPlayer steps={2} duration={400} playing onValueChange={onValueChange} />);
    advance(50);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(states(container)).toEqual(["active", "upcoming"]);
  });

  it("clamps the starting step and the step count", () => {
    const { container } = render(<StepPlayer steps={3} defaultValue={9} />);
    expect(states(container)).toEqual(["complete", "complete", "active"]);
    const { container: single } = render(<StepPlayer steps={0} />);
    expect(steps(single)).toHaveLength(1);
  });

  it("does not count time while the page is hidden", () => {
    const { container } = render(<StepPlayer duration={1000} defaultPlaying />);
    advance(400);
    const now = performance.now();
    vi.spyOn(performance, "now").mockReturnValue(now + 5000);
    fireEvent(document, new Event("visibilitychange"));
    vi.restoreAllMocks();
    advance(100);
    expect(states(container)[0]).toBe("active");
  });

  describe("seekable", () => {
    it("is a list of step buttons with the current one marked and the only tab stop", () => {
      render(<StepPlayer seekable steps={[{ label: "Intro" }, {}, {}]} />);
      const list = screen.getByRole("list", { name: "Progress" });
      expect(list.tagName).toBe("OL");
      const buttons = screen.getAllByRole("button", { name: /^Step/ });
      expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
        "Step 1 of 3: Intro",
        "Step 2 of 3",
        "Step 3 of 3",
      ]);
      expect(buttons[0]).toHaveAttribute("aria-current", "step");
      expect(buttons[1]).not.toHaveAttribute("aria-current");
      expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
      expect(screen.queryByRole("progressbar")).toBeNull();
    });

    it("jumps to a clicked step and restarts its timer", () => {
      const onValueChange = vi.fn();
      const { container } = render(
        <StepPlayer seekable duration={1000} defaultPlaying onValueChange={onValueChange} />,
      );
      advance(600);
      fireEvent.click(screen.getByRole("button", { name: "Step 3 of 5" }));
      expect(onValueChange).toHaveBeenLastCalledWith(2);
      expect(states(container)[2]).toBe("active");
      expect(progress(container, 2)).toBe(0);
      fireEvent.click(screen.getByRole("button", { name: "Step 3 of 5" }));
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("moves and seeks with arrow keys, Home and End", () => {
      const { container } = render(<StepPlayer seekable />);
      const first = screen.getByRole("button", { name: "Step 1 of 5" });
      first.focus();
      fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(screen.getByRole("button", { name: "Step 2 of 5" })).toHaveFocus();
      expect(states(container)[1]).toBe("active");
      fireEvent.keyDown(document.activeElement!, { key: "End" });
      expect(screen.getByRole("button", { name: "Step 5 of 5" })).toHaveFocus();
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
      expect(states(container)[4]).toBe("active");
      fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
      fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
      expect(states(container)[2]).toBe("active");
      fireEvent.keyDown(document.activeElement!, { key: "Home" });
      expect(screen.getByRole("button", { name: "Step 1 of 5" })).toHaveFocus();
      fireEvent.keyDown(document.activeElement!, { key: "a" });
      expect(states(container)[0]).toBe("active");
    });

    it("mirrors the arrow keys right to left", () => {
      const { container } = render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <StepPlayer seekable />
        </div>,
      );
      const first = screen.getByRole("button", { name: "Step 1 of 5" });
      fireEvent.keyDown(first, { key: "ArrowLeft" });
      expect(states(container)[1]).toBe("active");
    });

    it("clears the ended state when a step is chosen", () => {
      render(<StepPlayer seekable steps={2} duration={300} defaultPlaying />);
      advance(700);
      expect(control()).toHaveAccessibleName("Replay");
      fireEvent.click(screen.getByRole("button", { name: "Step 1 of 2" }));
      expect(control()).toHaveAccessibleName("Play");
    });
  });

  it("can hide the control or put it at the end", () => {
    const { container, rerender } = render(<StepPlayer showControl={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<StepPlayer controlPosition="end" />);
    const root = container.firstElementChild!;
    expect(root.lastElementChild).toHaveAttribute("data-slot", "step-player-control");
    rerender(<StepPlayer />);
    expect(root.firstElementChild).toHaveAttribute("data-slot", "step-player-control");
  });

  it("names the control in another language", () => {
    render(<StepPlayer controlLabels={{ play: "Lire", pause: "Pause" }} />);
    expect(screen.getByRole("button", { name: "Lire" })).toBeInTheDocument();
  });

  it("scales from its size, with a floor, and takes the plain track", () => {
    const { container, rerender } = render(<StepPlayer size={48} track="plain" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--sp-size")).toBe("48px");
    expect(root.style.getPropertyValue("--sp-count")).toBe("5");
    expect(root).toHaveClass("[--sp-track:transparent]");
    rerender(<StepPlayer size={4} />);
    expect(root.style.getPropertyValue("--sp-size")).toBe("12px");
    expect(root).toHaveClass("[--sp-track:var(--color-muted)]");
  });

  it("lets a consumer className and style win, and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <StepPlayer
        ref={ref}
        className="gap-6"
        style={{ "--sp-size": "40px" } as React.CSSProperties}
        data-testid="player"
        aria-describedby="hint"
      />,
    );
    const root = screen.getByTestId("player");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("gap-6");
    expect(root).not.toHaveClass("gap-[calc(var(--sp-size)*0.25)]");
    expect(root.style.getPropertyValue("--sp-size")).toBe("40px");
    expect(root).toHaveAttribute("aria-describedby", "hint");
  });

  it("stops its clock on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = render(<StepPlayer defaultPlaying />);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("has no accessibility violations, as a progressbar or a list", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<StepPlayer steps={[{ label: "Intro" }, {}, {}]} />);
    await expectNoA11yViolations(container);
    rerender(<StepPlayer seekable steps={[{ label: "Intro" }, {}, {}]} />);
    await expectNoA11yViolations(container);
  });
});
