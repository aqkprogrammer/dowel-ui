import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { StoryViewer, type StorySlide } from "./story-viewer";

const SLIDES: StorySlide[] = [{ label: "One" }, { label: "Two" }, { label: "Three" }];

function activeSlide() {
  return screen.getByRole("group", { name: /of 3/ });
}

describe("StoryViewer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a named carousel showing the first slide", () => {
    render(<StoryViewer slides={SLIDES} paused />);
    expect(screen.getByRole("region", { name: "Stories" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
    expect(activeSlide()).toHaveAccessibleName("1 of 3: One");
  });

  it("steps with the tap zones", async () => {
    const user = userEvent.setup();
    render(<StoryViewer slides={SLIDES} paused />);
    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(activeSlide()).toHaveAccessibleName("2 of 3: Two");
    await user.click(screen.getByRole("button", { name: "Previous story" }));
    await user.click(screen.getByRole("button", { name: "Previous story" }));
    expect(activeSlide()).toHaveAccessibleName("3 of 3: Three");
  });

  it("steps with the arrow keys and pauses while focused", async () => {
    const user = userEvent.setup();
    render(<StoryViewer slides={SLIDES} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Previous story" })).toHaveFocus();
    const live = activeSlide().parentElement;
    expect(live).toHaveAttribute("aria-live", "polite");
    await user.keyboard("{ArrowRight}");
    expect(activeSlide()).toHaveAccessibleName("2 of 3: Two");
    await user.keyboard("{ArrowLeft}");
    expect(activeSlide()).toHaveAccessibleName("1 of 3: One");
  });

  it("advances on its own after the interval", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    render(<StoryViewer slides={SLIDES} interval={1000} onIndexChange={onIndexChange} />);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(activeSlide()).toHaveAccessibleName("2 of 3: Two");
  });

  it("holds while hovered or paused", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    render(<StoryViewer slides={SLIDES} interval={1000} onIndexChange={onIndexChange} />);
    fireEvent.pointerEnter(screen.getByRole("region"), { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("stops at the end without loop", () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    render(
      <StoryViewer
        slides={SLIDES}
        defaultIndex={2}
        loop={false}
        interval={500}
        onEnd={onEnd}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(activeSlide()).toHaveAccessibleName("3 of 3: Three");
  });

  it("follows a controlled index", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState(1);
      return <StoryViewer slides={SLIDES} paused index={index} onIndexChange={setIndex} />;
    }
    render(<Controlled />);
    expect(activeSlide()).toHaveAccessibleName("2 of 3: Two");
    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(activeSlide()).toHaveAccessibleName("3 of 3: Three");
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLElement>();
    render(<StoryViewer ref={ref} slides={SLIDES} paused className="custom" />);
    expect(ref.current).toBe(screen.getByRole("region"));
    expect(ref.current).toHaveClass("custom", "rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StoryViewer slides={SLIDES} paused caption="Lumen" />);
    await expectNoA11yViolations(container);
  });
});
