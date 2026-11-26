import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MiniPlayer } from "./mini-player";

const TRACKS = [
  { title: "Golden Hour", artist: "Lumen", duration: 2 },
  { title: "Night Swim", artist: "Halcyon", duration: 3 },
];

afterEach(() => {
  vi.useRealTimers();
});

describe("MiniPlayer", () => {
  it("is a named group with transport buttons and a progressbar", () => {
    render(<MiniPlayer tracks={TRACKS} />);
    expect(screen.getByRole("group", { name: "Music player" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous track" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next track" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Playback position" })).toHaveAttribute(
      "aria-valuetext",
      "0:00 of 0:02",
    );
    expect(screen.getByText("Golden Hour")).toBeInTheDocument();
  });

  it("plays and pauses from the keyboard", async () => {
    const user = userEvent.setup();
    const onPlayingChange = vi.fn();
    render(<MiniPlayer tracks={TRACKS} onPlayingChange={onPlayingChange} />);

    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Play" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: "Pause" })).toHaveFocus();
  });

  it("changes track, wraps, and announces the change", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<MiniPlayer tracks={TRACKS} onIndexChange={onIndexChange} />);

    await user.click(screen.getByRole("button", { name: "Next track" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText("Night Swim")).toBeInTheDocument();
    expect(screen.getByText("Now playing: Night Swim by Halcyon")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next track" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(screen.getByText("Golden Hour")).toBeInTheDocument();
  });

  it("disables the ends when not looping", () => {
    render(<MiniPlayer tracks={TRACKS} loop={false} />);
    expect(screen.getByRole("button", { name: "Previous track" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next track" })).toBeEnabled();
  });

  it("runs its own clock while playing and moves on at the end of a track", () => {
    vi.useFakeTimers();
    render(<MiniPlayer tracks={TRACKS} defaultPlaying />);
    const bar = screen.getByRole("progressbar");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(bar).toHaveAttribute("aria-valuenow", "50");

    act(() => {
      vi.advanceTimersByTime(1250);
    });
    expect(screen.getByText("Night Swim")).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("follows controlled index, playing and progress", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [index, setIndex] = useState(1);
      return (
        <MiniPlayer
          tracks={TRACKS}
          index={index}
          onIndexChange={setIndex}
          playing
          progress={0.25}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByText("Night Swim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");

    await user.click(screen.getByRole("button", { name: "Previous track" }));
    expect(screen.getByText("Golden Hour")).toBeInTheDocument();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    render(<MiniPlayer ref={ref} tracks={TRACKS} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("group"));
    expect(ref.current).toHaveClass("custom", "rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<MiniPlayer tracks={TRACKS} />);
    await expectNoA11yViolations(container);
  });
});
