import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  StreamAnnouncer,
  StreamAnnouncerPause,
  StreamAnnouncerToggle,
  useStreamAnnouncer,
  type StreamAnnouncerProps,
} from "./stream-announcer";

// Sentences long enough to be announced on their own; shorter ones are joined
// to whatever is waiting behind them.
const A = "The first sentence is long enough to stand alone.";
const B = "The second sentence is also long enough on its own.";
const C = "A third sentence arrives while the first is spoken.";
const D = "And a fourth one, which is still being written";

function region(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>("[data-slot='stream-announcer-region']");
  if (!found) throw new Error("no region");
  return found;
}

/** What has been sent to the screen reader, oldest first. */
function announced(container: HTMLElement): string[] {
  return Array.from(region(container).children, (child) => child.textContent);
}

function setup(props: Partial<StreamAnnouncerProps> = {}) {
  const utils = render(<StreamAnnouncer text="" streaming defaultEnabled {...props} />);
  const update = (next: Partial<StreamAnnouncerProps>) => {
    utils.rerender(<StreamAnnouncer text="" streaming defaultEnabled {...props} {...next} />);
  };
  return { ...utils, update };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StreamAnnouncer", () => {
  it("is off by default and announces nothing as text streams", () => {
    const { container, rerender } = render(<StreamAnnouncer text="" streaming />);
    expect(
      screen.getByRole("button", { name: "Read responses as they stream" }),
    ).toHaveAttribute("aria-pressed", "false");
    rerender(<StreamAnnouncer text="Hello there. How are you? " streaming />);
    rerender(<StreamAnnouncer text="Hello there. How are you? Fine." streaming={false} />);
    expect(announced(container)).toEqual([]);
  });

  it("hides pause, skip and repeat while off", () => {
    render(<StreamAnnouncer text="" streaming />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps a polite region from first paint that is neither status nor log", () => {
    const { container } = render(<StreamAnnouncer text="" streaming />);
    const live = region(container);
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).not.toHaveAttribute("role");
    expect(live).not.toHaveAttribute("aria-atomic", "true");
    expect(live).toHaveClass("sr-only");
  });

  it("announces a sentence only once the next one has begun", () => {
    const { container, update } = setup();
    update({ text: "Hello there." });
    expect(announced(container)).toEqual([]);

    update({ text: "Hello there. How" });
    expect(announced(container)).toEqual(["Hello there."]);
  });

  it("never announces a half-formed number", () => {
    const { container, update } = setup();
    update({ text: "The total is 3." });
    expect(announced(container)).toEqual([]);
    update({ text: "The total is 3.5 million. And" });
    expect(announced(container)).toEqual(["The total is 3.5 million."]);
  });

  it("releases the last sentence when the stream ends", () => {
    const { container, update } = setup();
    update({ text: "One. Two" });
    update({ text: "One. Two", streaming: false });
    act(() => {
      vi.runAllTimers();
    });
    expect(announced(container)).toEqual(["One.", "Two"]);
  });

  it("holds what arrives while speaking and sends it as one chunk", () => {
    const { container, update } = setup();
    update({ text: "First sentence here. Second" });
    expect(announced(container)).toEqual(["First sentence here."]);

    update({ text: "First sentence here. Second. Third. Fourth" });
    // Still speaking the first chunk: nothing else goes out yet.
    expect(announced(container)).toEqual(["First sentence here."]);

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(announced(container)).toEqual(["First sentence here.", "Second. Third."]);
  });

  it("paces by the listener's speech rate", () => {
    const { container, update } = setup({ wordsPerMinute: 60 });
    update({ text: `${A} ${B} ${D}` });
    expect(announced(container)).toEqual([A]);

    // Nine words at 60 wpm is nine seconds.
    act(() => {
      vi.advanceTimersByTime(8_900);
    });
    expect(announced(container)).toEqual([A]);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(announced(container)).toEqual([A, B]);
  });

  it("joins short sentences to what is waiting behind them", () => {
    const { container, update } = setup();
    update({ text: "1. Install it. 2. Run it. Then" });
    expect(announced(container)).toEqual(["1. Install it. 2. Run it."]);
  });

  it("adds a pause after a heading it joins to the next sentence", () => {
    const { container, update } = setup();
    update({ text: "## Which to use\n- Use a **Sheet** for panels.\n- Then" });
    expect(announced(container)).toEqual(["Which to use. Use a Sheet for panels."]);
  });

  it("summarises code rather than reading it", () => {
    const { container, update } = setup();
    update({ text: "Run this:\n```sh\nnpm i\n```\nDone", streaming: false });
    act(() => {
      vi.runAllTimers();
    });
    expect(announced(container).join(" ")).toBe("Run this: Code block, sh, 1 line. Done");
  });

  it("never trims the region from the front: it starts over when full", () => {
    // Dropping the first node while adding a last one makes Chrome report every
    // node as new, and NVDA reads the earlier sentences again.
    const { container, update } = setup();
    const seen: (string | null)[][] = [];
    let text = "";
    for (let i = 1; i <= 5; i += 1) {
      text += `Sentence ${String(i)}. `;
      update({ text: `${text}Next` });
      act(() => {
        vi.runOnlyPendingTimers();
      });
      seen.push(announced(container));
    }
    expect(seen).toEqual([
      ["Sentence 1."],
      ["Sentence 1.", "Sentence 2."],
      ["Sentence 1.", "Sentence 2.", "Sentence 3."],
      ["Sentence 4."],
      ["Sentence 4.", "Sentence 5."],
    ]);
  });

  it("treats a text that stops beginning with what was said as a new response", () => {
    const { container, update } = setup();
    update({ text: `${A} ${D}` });
    update({ text: `${B} ${D}` });
    expect(announced(container)).toEqual([A, B]);
  });

  it("starts over for a new response", () => {
    const { container, update } = setup();
    update({ text: "Old answer. Next" });
    update({ text: "Old answer. Next", streaming: false });
    act(() => {
      vi.runAllTimers();
    });

    update({ text: "", streaming: true });
    update({ text: "New answer. More" });
    expect(announced(container).at(-1)).toBe("New answer.");
  });

  describe("controls", () => {
    it("pauses and resumes", () => {
      const { container, update } = setup();
      update({ text: `${A} ${B} ${D}` });
      expect(announced(container)).toEqual([A]);

      const pause = screen.getByRole("button", { name: "Pause reading" });
      fireEvent.click(pause);
      expect(pause).toHaveAttribute("aria-pressed", "true");
      expect(pause).toHaveAccessibleName("Resume reading");

      act(() => {
        vi.runAllTimers();
      });
      expect(announced(container)).toEqual([A]);

      fireEvent.click(pause);
      expect(announced(container)).toEqual([A, B]);
    });

    it("says how many it will skip, then how many it skipped", () => {
      const { container, update } = setup();
      update({ text: `${A} ${B} ${C} ${D}` });
      const skip = screen.getByRole("button", { name: "Skip 2 queued" });

      fireEvent.click(skip);
      expect(announced(container).at(-1)).toBe("Skipped 2 sentences.");
      expect(skip).toHaveAccessibleName("Skip to latest");

      // Carries on from whatever arrives next.
      update({ text: `${A} ${B} ${C} ${D}. More` });
      act(() => {
        vi.runAllTimers();
      });
      expect(announced(container).at(-1)).toBe(`${D}.`);
    });

    it("says nothing when there was nothing to skip", () => {
      const { container, update } = setup();
      update({ text: `${A} ${D}` });
      fireEvent.click(screen.getByRole("button", { name: "Skip to latest" }));
      expect(announced(container)).toEqual([A]);
    });

    it("uses the singular for one skipped sentence", () => {
      const { container, update } = setup();
      update({ text: `${A} ${B} ${D}` });
      fireEvent.click(screen.getByRole("button", { name: "Skip 1 queued" }));
      expect(announced(container).at(-1)).toBe("Skipped 1 sentence.");
    });

    it("repeats the last sentence of the response, never its own notices", () => {
      const { container, update } = setup();
      const repeat = screen.getByRole("button", { name: "Repeat last" });
      expect(repeat).toBeDisabled();

      update({ text: `${A} ${B} ${C} ${D}` });
      fireEvent.click(screen.getByRole("button", { name: "Skip 2 queued" }));
      fireEvent.click(repeat);
      expect(announced(container).at(-1)).toBe(A);
    });

    it("reads the current response from its start when switched on mid-stream", () => {
      const { container, rerender } = render(
        <StreamAnnouncer text="One. Two. Three" streaming />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Read responses as they stream" }));
      rerender(<StreamAnnouncer text="One. Two. Three. Four" streaming />);
      act(() => {
        vi.runAllTimers();
      });
      expect(announced(container).join(" ")).toBe("One. Two. Three.");
    });

    it("does not read an old answer when switched on after it finished", () => {
      const { container, rerender } = render(
        <StreamAnnouncer text="Finished. Answer." streaming={false} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Read responses as they stream" }));
      rerender(<StreamAnnouncer text="Finished. Answer." streaming={false} />);
      act(() => {
        vi.runAllTimers();
      });
      expect(announced(container)).toEqual([]);
    });

    it("clears the queue and the region when switched off", () => {
      const onEnabledChange = vi.fn();
      const { container, update } = setup({ onEnabledChange });
      update({ text: "One. Two. Three" });
      fireEvent.click(
        screen.getByRole("button", { name: "Stop reading responses as they stream" }),
      );
      expect(onEnabledChange).toHaveBeenCalledWith(false);
      act(() => {
        vi.runAllTimers();
      });
      expect(announced(container)).toEqual([]);
    });

    it("can be controlled", () => {
      const onEnabledChange = vi.fn();
      render(
        <StreamAnnouncer
          text=""
          streaming={false}
          enabled={false}
          onEnabledChange={onEnabledChange}
        />,
      );
      const toggle = screen.getByRole("button", { name: "Read responses as they stream" });
      fireEvent.click(toggle);
      expect(onEnabledChange).toHaveBeenCalledWith(true);
      // Controlled: nothing changes until the parent says so.
      expect(toggle).toHaveAttribute("aria-pressed", "false");
    });

    it("lets a click handler cancel the default action", () => {
      render(
        <StreamAnnouncer text="" streaming>
          <StreamAnnouncerToggle
            onClick={(event) => {
              event.preventDefault();
            }}
          />
        </StreamAnnouncer>,
      );
      const toggle = screen.getByRole("button");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
    });

    it("renders custom controls in place of the defaults", () => {
      render(
        <StreamAnnouncer text="" streaming defaultEnabled>
          <StreamAnnouncerPause>Hold</StreamAnnouncerPause>
        </StreamAnnouncer>,
      );
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByRole("button")).toHaveAccessibleName("Hold");
    });

    it("takes custom labels", () => {
      render(
        <StreamAnnouncer
          text=""
          streaming
          labels={{ toggleOff: "Lire les réponses", group: "Lecture" }}
        />,
      );
      expect(screen.getByRole("group", { name: "Lecture" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Lire les réponses" })).toBeInTheDocument();
    });
  });

  it("reports every announcement as it is made", () => {
    const onAnnounce = vi.fn();
    const { update } = setup({ onAnnounce });
    update({ text: `${A} ${B} ${D}` });
    fireEvent.click(screen.getByRole("button", { name: "Skip 1 queued" }));
    expect(onAnnounce.mock.calls).toEqual([[A], ["Skipped 1 sentence."]]);
  });

  it("exposes its state to custom controls", () => {
    function Queued() {
      const { queued } = useStreamAnnouncer();
      return <span data-testid="queued">{queued}</span>;
    }
    const { rerender } = render(
      <StreamAnnouncer text="" streaming defaultEnabled>
        <Queued />
      </StreamAnnouncer>,
    );
    rerender(
      <StreamAnnouncer text={`${A} ${B} ${C} ${D}`} streaming defaultEnabled>
        <Queued />
      </StreamAnnouncer>,
    );
    expect(screen.getByTestId("queued")).toHaveTextContent("2");
  });

  it("throws a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<StreamAnnouncerPause />)).toThrow(/inside <StreamAnnouncer>/);
  });

  it("lets className override its own utilities", () => {
    render(<StreamAnnouncer text="" streaming className="gap-8" />);
    const root = screen.getByRole("group");
    expect(root).toHaveClass("gap-8");
    expect(root).not.toHaveClass("gap-2");
  });

  it("forwards ref and native props to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<StreamAnnouncer ref={ref} text="" streaming data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId("root"));
  });

  it("stops its timer on unmount", () => {
    const { update, unmount } = setup();
    update({ text: "One. Two. Three" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("has no detectable accessibility violations, off or on", async () => {
    vi.useRealTimers();
    const { container, rerender } = render(<StreamAnnouncer text="One. Two" streaming />);
    await expectNoA11yViolations(container);
    rerender(<StreamAnnouncer text="One. Two" streaming defaultEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Read responses as they stream" }));
    await expectNoA11yViolations(container);
  });
});
