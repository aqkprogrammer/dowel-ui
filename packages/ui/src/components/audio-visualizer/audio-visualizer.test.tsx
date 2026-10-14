import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { audioBands, AudioVisualizer } from "./audio-visualizer";

/** A fake Web Audio graph whose analyser reports `loudness` (0–255) in every bin. */
function stubAudio(loudness: number) {
  const close = vi.fn(() => Promise.resolve());
  const disconnect = vi.fn();
  class FakeContext {
    createAnalyser() {
      return {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 128,
        getByteFrequencyData(data: Uint8Array) {
          data.fill(loudness);
        },
      };
    }
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect };
    }
    close = close;
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return { close, disconnect };
}

/** Heights of the last `count` bars drawn — the most recent frame. */
function barHeights(mock: CanvasMock, count: number) {
  return mock.calls
    .filter((call) => call.method === "roundRect")
    .slice(-count)
    .map((call) => call.args[3] as number);
}

describe("AudioVisualizer", () => {
  let mock: CanvasMock;
  beforeEach(() => {
    mock = installCanvasMock({ width: 160, height: 40 });
  });
  afterEach(() => {
    mock.restore();
    vi.unstubAllGlobals();
  });

  it("is decoration until it is given a label", async () => {
    const { container, rerender } = render(<AudioVisualizer data-testid="viz" />);
    expect(screen.getByTestId("viz")).toHaveAttribute("aria-hidden", "true");
    rerender(<AudioVisualizer data-testid="viz" label="Microphone level" />);
    expect(screen.getByRole("img", { name: "Microphone level" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("draws a bar per band, taller for a higher level", () => {
    const { rerender } = render(<AudioVisualizer bands={8} level={0} />);
    act(() => void mock.flush(2));
    const quiet = barHeights(mock, 8);
    expect(quiet).toHaveLength(8);
    rerender(<AudioVisualizer bands={8} level={1} />);
    act(() => void mock.flush(30));
    const loud = barHeights(mock, 8);
    expect(Math.max(...loud)).toBeGreaterThan(Math.max(...quiet) * 3);
  });

  it("listens to a stream through an analyser, and closes it when done", () => {
    const audio = stubAudio(200);
    const stream = {} as MediaStream;
    const { container, unmount } = render(<AudioVisualizer bands={6} stream={stream} />);
    expect(container.firstElementChild).toHaveAttribute("data-live", "true");
    act(() => void mock.flush(20));
    expect(Math.max(...barHeights(mock, 6))).toBeGreaterThan(20);
    // Live input keeps frames coming.
    expect(mock.pending()).toBe(1);
    unmount();
    expect(audio.disconnect).toHaveBeenCalled();
    expect(audio.close).toHaveBeenCalled();
  });

  it("draws a wave or an orb when asked", () => {
    const { rerender } = render(<AudioVisualizer variant="wave" level={0.5} />);
    act(() => void mock.flush(2));
    expect(mock.count("stroke")).toBeGreaterThan(0);
    mock.reset();
    rerender(<AudioVisualizer variant="orb" level={0.5} />);
    act(() => void mock.flush(2));
    expect(mock.count("arc")).toBeGreaterThan(0);
  });

  it("lets className win and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AudioVisualizer ref={ref} className="h-6" />);
    expect(ref.current).toHaveClass("h-6");
    expect(ref.current).not.toHaveClass("h-10");
  });
});

describe("audioBands", () => {
  it("averages bins into bands from 0 to 1", () => {
    const bins = new Uint8Array(128).fill(255);
    const out = audioBands(bins, 8, new Float32Array(8));
    expect([...out].every((value) => value === 1)).toBe(true);
    const silent = audioBands(new Uint8Array(128), 4, new Float32Array(4));
    expect([...silent].every((value) => value === 0)).toBe(true);
  });
});
