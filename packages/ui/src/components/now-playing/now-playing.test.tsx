import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { NowPlaying } from "./now-playing";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function measure(slider: HTMLElement) {
  vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 10, y: 0, width: 240, height: 19 }),
  );
}

describe("NowPlaying", () => {
  it("renders collapsed, with the track as the expand control", () => {
    render(<NowPlaying track="Cabra Field" artist="Side B" />);
    const toggle = screen.getByRole("button", { name: "Cabra Field, Side B" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    // Collapsed: Like and the seek slider are out of reach.
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Like" })).not.toBeInTheDocument();
  });

  it("expands and collapses, exposing the slider and Like", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(<NowPlaying track="Cabra Field" onExpandedChange={onExpandedChange} />);
    const toggle = screen.getByRole("button", { name: "Cabra Field" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("slider", { name: "Seek" })).toHaveAttribute(
      "aria-valuetext",
      "0:00 of 3:34",
    );
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("plays and keeps time while uncontrolled, stopping at the end", () => {
    vi.useFakeTimers();
    render(<NowPlaying track="Song" duration={3} defaultPosition={0} defaultExpanded />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "2");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("−0:00")).toBeInTheDocument();
  });

  it("seeks with the keyboard and toggles play with Space", async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    render(
      <NowPlaying
        track="Song"
        defaultExpanded
        defaultPosition={52}
        onPositionChange={onPositionChange}
      />,
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "57");
    await user.keyboard("{ArrowLeft}{ArrowDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "47");
    await user.keyboard("{PageUp}{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "82");
    await user.keyboard("{PageDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "52");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "214");
    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(onPositionChange).toHaveBeenLastCalledWith(0);
    await user.keyboard("q");
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await user.keyboard("k");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("mirrors arrow keys and the pointer in right-to-left layouts", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <NowPlaying track="Song" defaultExpanded defaultPosition={100} duration={200} />
      </div>,
    );
    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "105");
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    measure(slider);
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 190 });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("seeks with the pointer and follows a drag", () => {
    render(<NowPlaying track="Song" defaultExpanded duration={240} />);
    const slider = screen.getByRole("slider");
    measure(slider);
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 70 });
    expect(slider).toHaveAttribute("aria-valuenow", "60");
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 400 });
    expect(slider).toHaveAttribute("aria-valuenow", "240");
    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 10 });
    expect(slider).toHaveAttribute("aria-valuenow", "240");
  });

  it("ignores the pointer on an unmeasured rail", () => {
    render(<NowPlaying track="Song" defaultExpanded defaultPosition={10} />);
    const slider = screen.getByRole("slider");
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 70 });
    expect(slider).toHaveAttribute("aria-valuenow", "10");
  });

  it("restarts, skips and likes", async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const onLikedChange = vi.fn();
    render(
      <NowPlaying
        track="Song"
        defaultExpanded
        defaultPosition={52}
        onPrevious={onPrevious}
        onNext={onNext}
        onLikedChange={onLikedChange}
      />,
    );
    const slider = screen.getByRole("slider");
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(onPrevious).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledOnce();
    const like = screen.getByRole("button", { name: "Like" });
    await user.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(onLikedChange).toHaveBeenCalledWith(true);
  });

  it("follows controlled state without keeping its own time", () => {
    vi.useFakeTimers();
    function Controlled() {
      const [playing, setPlaying] = useState(true);
      return (
        <NowPlaying
          track="Song"
          expanded
          playing={playing}
          onPlayingChange={setPlaying}
          position={30}
          liked
        />
      );
    }
    render(<Controlled />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("renders artwork from a URL or a node, with optional alt text, and custom labels", () => {
    const { container, rerender } = render(
      <NowPlaying
        track="Song"
        artwork="https://example.com/cover.jpg"
        artworkAlt="Blue cover"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/cover.jpg",
    );
    expect(screen.getByText("Blue cover")).toBeInTheDocument();
    rerender(
      <NowPlaying
        track="Song"
        artwork={<span data-testid="art" />}
        labels={{
          play: "Lecture",
          next: "Suivant",
          previous: "Début",
          like: "J’aime",
          seek: "Position",
        }}
        expanded
      />,
    );
    expect(screen.getByTestId("art")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lecture" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Position" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <NowPlaying
        ref={ref}
        track="Song"
        className="w-full bg-muted"
        data-testid="player"
        stroke={false}
      />,
    );
    const player = screen.getByTestId("player");
    expect(ref.current).toBe(player);
    expect(player).toHaveClass("w-full", "bg-muted");
    expect(player).not.toHaveClass("w-[16.25rem]");
    expect(player).toHaveStyle({ height: "78px" });
  });

  it("has no accessibility violations collapsed or expanded", async () => {
    const user = userEvent.setup();
    const { container } = render(<NowPlaying track="Cabra Field" artist="Side B" />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Cabra Field, Side B" }));
    await expectNoA11yViolations(container);
  });
});
