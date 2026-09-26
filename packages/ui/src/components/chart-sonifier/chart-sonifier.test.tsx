import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ChartSonifier, type ChartSonifierSeries } from "./chart-sonifier";

/* A Web Audio stand-in: records what was scheduled, makes no sound. ------- */

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

class FakeOscillator {
  type = "sine";
  frequency = fakeParam();
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = fakeParam();
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  createOscillator = vi.fn(() => {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  });
  createGain = vi.fn(() => {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  });
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

function installAudio() {
  const contexts: FakeAudioContext[] = [];
  const AudioContext = vi.fn(function () {
    const context = new FakeAudioContext();
    contexts.push(context);
    return context;
  });
  vi.stubGlobal("AudioContext", AudioContext);
  return { AudioContext, contexts };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/* Data ------------------------------------------------------------------- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRODUCTION: ChartSonifierSeries = {
  key: "production",
  label: "Production",
  values: [12, 42, 18, null, 25, 3, 17],
};
const STAGING: ChartSonifierSeries = {
  key: "staging",
  label: "Staging",
  values: [30, 28, 35, 40, 38, 20, 22],
};

function renderSonifier(props: Partial<Parameters<typeof ChartSonifier>[0]> = {}) {
  return render(
    <ChartSonifier
      series={[PRODUCTION]}
      categories={DAYS}
      label="Deployments per day"
      unit={{ one: "deployment", other: "deployments" }}
      {...props}
    />,
  );
}

/* Component -------------------------------------------------------------- */

describe("ChartSonifier", () => {
  it("is a group named by its label and described by the series summary", () => {
    renderSonifier();
    const group = screen.getByRole("group", { name: "Deployments per day" });
    expect(group).toHaveAccessibleDescription(
      "Production: 7 points from Mon to Sun, 1 missing, ranging from 3 to 42 deployments, falling overall, highest at Tue, lowest at Sat.",
    );
    expect(group).toHaveAttribute("data-state", "paused");
  });

  it("creates no audio context before a gesture that asks for sound", async () => {
    const { AudioContext } = installAudio();
    const user = userEvent.setup();
    renderSonifier({ series: [PRODUCTION, STAGING] });
    await user.click(screen.getByRole("button", { name: "Mute" }));
    await user.click(screen.getByRole("radio", { name: "Fast" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Series" }), "staging");
    expect(AudioContext).not.toHaveBeenCalled();

    // Scrubbing while muted asks for no sound either.
    await user.click(screen.getByRole("slider"));
    await user.keyboard("{ArrowRight}");
    expect(AudioContext).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mute" }));
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it("scrubs point by point from the keyboard, saying each value", async () => {
    const user = userEvent.setup();
    renderSonifier();
    const slider = screen.getByRole("slider", { name: "Production" });
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "6");
    expect(slider).toHaveAttribute("aria-valuetext", "Mon: 12 deployments");

    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(slider).toHaveAttribute("aria-valuetext", "Tue: 42 deployments");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuetext", "Thu: no value");
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuetext", "Sun: 17 deployments");
    await user.keyboard("{PageDown}");
    expect(slider).toHaveAttribute("aria-valuenow", "5");
    await user.keyboard("{PageUp}{ArrowUp}");
    expect(slider).toHaveAttribute("aria-valuenow", "6");
    await user.keyboard("{Home}{ArrowLeft}{ArrowDown}");
    expect(slider).toHaveAttribute("aria-valuetext", "Mon: 12 deployments");
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
  });

  it("plays each scrubbed point's note, or a click for a missing one", () => {
    const { contexts } = installAudio();
    renderSonifier();
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    const context = contexts[0]!;
    // 42 is the top of the range, so the top note.
    expect(context.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(
      880,
      expect.any(Number),
    );
    expect(context.oscillators[0]?.type).toBe("sine");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(context.oscillators[2]?.type).toBe("triangle");
    // Each new note cuts the one before it off, with a fade rather than a cut.
    expect(context.oscillators[1]?.stop).toHaveBeenLastCalledWith(0.015);
    expect(context.gains[2]?.gain.cancelScheduledValues).toHaveBeenCalled();
  });

  it("plays the series, following the playhead without announcing it, then says where it paused", () => {
    vi.useFakeTimers();
    const { contexts } = installAudio();
    const onIndexChange = vi.fn();
    renderSonifier({ onIndexChange });
    const slider = screen.getByRole("slider");

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveAttribute("data-state", "playing");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // 300 ms a point at normal speed: the fourth point is sounding.
    expect(screen.getByText("Thu: no value")).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
    // The announced value held still while it played.
    expect(slider).toHaveAttribute("aria-valuetext", "Mon: 12 deployments");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(slider).toHaveAttribute("aria-valuetext", "Thu: no value");
    expect(screen.getByRole("status")).toHaveTextContent("Paused at Thu: no value.");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();

    // Stopped means stopped: nothing more is scheduled.
    const scheduled = contexts[0]!.oscillators.length;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(contexts[0]!.oscillators.length).toBe(scheduled);
  });

  it("schedules each note with a ramped envelope, and missing values as clicks", () => {
    vi.useFakeTimers();
    const { contexts } = installAudio();
    renderSonifier();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const context = contexts[0]!;
    expect(context.oscillators.map((oscillator) => oscillator.type)).toEqual([
      "sine",
      "sine",
      "sine",
      "triangle",
      "sine",
      "sine",
      "sine",
    ]);
    // Gain 0 is the master output; each voice has its own envelope after it.
    const envelope = context.gains[1]!.gain;
    expect(envelope.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(envelope.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, expect.any(Number));
    expect(envelope.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, expect.any(Number));
  });

  it("says where it finished, and plays again from the start", () => {
    vi.useFakeTimers();
    installAudio();
    renderSonifier();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Finished at Sun: 17 deployments.");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "6");

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByText("Mon: 12 deployments")).toBeInTheDocument();
  });

  it("stops the sound at once on Escape from anywhere in the group", () => {
    vi.useFakeTimers();
    const { contexts } = installAudio();
    renderSonifier();
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.click(play);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const context = contexts[0]!;
    const escape = fireEvent.keyDown(play, { key: "Escape" });
    expect(escape).toBe(false);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    for (const oscillator of context.oscillators) {
      expect(oscillator.stop).toHaveBeenLastCalledWith(0.015);
    }
    expect(screen.getByRole("status")).toHaveTextContent("Paused at Tue: 42 deployments.");

    // Not playing, Escape is left for whatever else wants it.
    expect(fireEvent.keyDown(play, { key: "Escape" })).toBe(true);
  });

  it("does not announce a pause the focused slider already speaks", () => {
    vi.useFakeTimers();
    installAudio();
    renderSonifier();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const slider = screen.getByRole("slider");
    slider.focus();
    fireEvent.keyDown(slider, { key: "Escape" });
    expect(slider).toHaveAttribute("aria-valuetext", "Tue: 42 deployments");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stops playing when scrubbed, and scrubs on from the playhead", () => {
    vi.useFakeTimers();
    installAudio();
    renderSonifier();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuetext", "Wed: 18 deployments");
  });

  it("mutes without stopping, and is a toggle button", () => {
    vi.useFakeTimers();
    const { contexts } = installAudio();
    renderSonifier();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    // The master output fades to silence.
    expect(contexts[0]!.gains[0]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      0.015,
    );
  });

  it("starts muted when asked, and then scrubs silently", async () => {
    const { AudioContext } = installAudio();
    const user = userEvent.setup();
    renderSonifier({ defaultMuted: true });
    expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    screen.getByRole("slider").focus();
    await user.keyboard("{ArrowRight}");
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it("plays one series at a time, chosen from a select, and describes the new one", async () => {
    const user = userEvent.setup();
    const onSeriesChange = vi.fn();
    renderSonifier({ series: [PRODUCTION, STAGING], onSeriesChange });
    const select = screen.getByRole("combobox", { name: "Series" });
    expect(select).toHaveValue("production");

    await user.selectOptions(select, "staging");
    expect(onSeriesChange).toHaveBeenCalledWith("staging");
    expect(screen.getByRole("slider", { name: "Staging" })).toHaveAttribute(
      "aria-valuetext",
      "Mon: 30 deployments",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^Staging: 7 points from Mon to Sun/);
    expect(screen.getByRole("group")).toHaveAccessibleDescription(/^Staging:/);
  });

  it("shows no series select for a single series, and can start on another", () => {
    const { unmount } = renderSonifier();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    unmount();
    renderSonifier({ series: [PRODUCTION, STAGING], defaultSeries: "staging" });
    expect(screen.getByRole("combobox", { name: "Series" })).toHaveValue("staging");
  });

  it("offers three speeds, and changing speed while playing carries on at the new pace", () => {
    vi.useFakeTimers();
    installAudio();
    renderSonifier({ defaultSpeed: "slow" });
    expect(screen.getByRole("radiogroup", { name: "Speed" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Slow" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("Tue: 42 deployments")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Fast" }));
    expect(screen.getByRole("radio", { name: "Fast" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    act(() => {
      // The next tick after the third fast note starts.
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByText("Thu: no value")).toBeInTheDocument();
  });

  it("stops and closes the audio on unmount", () => {
    vi.useFakeTimers();
    const { contexts } = installAudio();
    const onIndexChange = vi.fn();
    const { unmount } = renderSonifier({ onIndexChange });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const context = contexts[0]!;
    const calls = onIndexChange.mock.calls.length;
    unmount();
    expect(context.close).toHaveBeenCalledTimes(1);
    for (const oscillator of context.oscillators) {
      expect(oscillator.stop).toHaveBeenLastCalledWith(0.015);
    }
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onIndexChange.mock.calls.length).toBe(calls);
  });

  it("explains when sound is unavailable, and still reads every value", async () => {
    const user = userEvent.setup();
    renderSonifier();
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    expect(play).toHaveAccessibleDescription(
      "Sound is not available in this browser. The slider still reads out each value.",
    );
    expect(screen.getByRole("button", { name: "Mute" })).toBeDisabled();

    screen.getByRole("slider").focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "Tue: 42 deployments");
  });

  it("seeks where the track is pressed", () => {
    installAudio();
    renderSonifier();
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 600, height: 24 }),
    );
    fireEvent.pointerDown(slider, { button: 0, clientX: 400, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
    fireEvent.pointerDown(slider, { button: 2, clientX: 0, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "4");
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    renderSonifier({ index: 2, onIndexChange });
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "Wed: 18 deployments");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(onIndexChange).toHaveBeenCalledWith(3);
    expect(slider).toHaveAttribute("aria-valuenow", "2");
  });

  it("numbers points without categories, and handles no data", () => {
    const { unmount } = render(
      <ChartSonifier series={[{ key: "a", label: "Load", values: [1, 5] }]} label="Load" />,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "Point 1: 1");
    unmount();
    render(<ChartSonifier series={[]} label="Nothing yet" />);
    expect(screen.getByText("Nothing yet: no data.")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("renders each size and variant", () => {
    const { rerender } = renderSonifier({ size: "sm", variant: "plain" });
    const group = screen.getByRole("group");
    expect(group).toHaveClass("gap-2");
    expect(group).not.toHaveClass("border");
    expect(screen.getByRole("button", { name: "Play" })).toHaveClass("h-7");
    rerender(
      <ChartSonifier
        series={[PRODUCTION]}
        label="Deployments per day"
        size="md"
        variant="outline"
      />,
    );
    expect(group).toHaveClass("gap-3", "border", "p-3.5");
    expect(screen.getByRole("button", { name: "Play" })).toHaveClass("h-8");
  });

  it("lets className override its own utilities", () => {
    renderSonifier({ className: "p-6" });
    expect(screen.getByRole("group")).toHaveClass("p-6");
    expect(screen.getByRole("group")).not.toHaveClass("p-3.5");
  });

  it("forwards ref and native props, and still calls its own onKeyDown", () => {
    const ref = createRef<HTMLDivElement>();
    const onKeyDown = vi.fn();
    render(
      <ChartSonifier
        ref={ref}
        series={[PRODUCTION]}
        label="Deployments per day"
        data-testid="sonifier"
        onKeyDown={onKeyDown}
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("sonifier"));
    fireEvent.keyDown(screen.getByRole("slider"), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it("has no detectable accessibility violations", async () => {
    installAudio();
    const { container } = renderSonifier({ series: [PRODUCTION, STAGING] });
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations without sound", async () => {
    const { container } = renderSonifier();
    await expectNoA11yViolations(container);
  });
});
