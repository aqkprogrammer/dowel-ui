import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { installCanvasMock, type CanvasMock } from "../dither-canvas/canvas-mock";
import { formatDuration, VoiceInput } from "./voice-input";

function fakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

class FakeRecorder {
  static last: FakeRecorder | null = null;
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    FakeRecorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

function grant() {
  const { stream, track } = fakeStream();
  const getUserMedia = vi.fn(() => Promise.resolve(stream));
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
  return { getUserMedia, track };
}

function refuse(name: string) {
  const getUserMedia = vi.fn(() => Promise.reject(new DOMException("no", name)));
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia } });
}

const button = () => screen.getByRole("button", { name: "Voice input" });

/** Clicks the button and lets the microphone request settle inside act. */
async function press() {
  await act(async () => {
    fireEvent.click(button());
    await Promise.resolve();
  });
}

describe("VoiceInput", () => {
  let canvas: CanvasMock;
  beforeEach(() => {
    canvas = installCanvasMock();
    vi.useFakeTimers();
    vi.stubGlobal("MediaRecorder", FakeRecorder);
  });
  afterEach(() => {
    canvas.restore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is a toggle with one name that stays put", async () => {
    vi.useRealTimers();
    grant();
    const { container } = render(<VoiceInput />);
    expect(button()).toHaveAttribute("aria-pressed", "false");
    await expectNoA11yViolations(container);
  });

  it("records, says so in words, counts up, and hands back the audio", async () => {
    const { getUserMedia, track } = grant();
    const onRecordingComplete = vi.fn();
    const onRecordingChange = vi.fn();
    render(
      <VoiceInput
        onRecordingComplete={onRecordingComplete}
        onRecordingChange={onRecordingChange}
      />,
    );
    await press();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Recording")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Recording started");
    expect(onRecordingChange).toHaveBeenLastCalledWith(true);

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText("0:03")).toBeInTheDocument();

    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "false");
    expect(track.stop).toHaveBeenCalled();
    expect(onRecordingComplete).toHaveBeenCalledTimes(1);
    const [audio, duration] = onRecordingComplete.mock.calls[0] as [Blob, number];
    expect(audio.type).toBe("audio/webm");
    expect(duration).toBeGreaterThanOrEqual(3000);
    expect(screen.getByRole("status")).toHaveTextContent("Recording stopped, 3 seconds");
    expect(onRecordingChange).toHaveBeenLastCalledWith(false);
  });

  it("cancels on Escape without keeping the audio", async () => {
    const { track } = grant();
    const onRecordingComplete = vi.fn();
    render(<VoiceInput onRecordingComplete={onRecordingComplete} />);
    await press();
    fireEvent.keyDown(button(), { key: "Escape" });
    expect(track.stop).toHaveBeenCalled();
    expect(onRecordingComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Recording cancelled");
  });

  it("stops on its own at maxDuration", async () => {
    grant();
    const onRecordingComplete = vi.fn();
    render(<VoiceInput maxDuration={5} onRecordingComplete={onRecordingComplete} />);
    await press();
    act(() => {
      vi.advanceTimersByTime(5300);
    });
    expect(onRecordingComplete).toHaveBeenCalledTimes(1);
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("explains a blocked microphone, a missing one, and a browser without the API", async () => {
    const onError = vi.fn();
    refuse("NotAllowedError");
    const { unmount } = render(<VoiceInput onError={onError} />);
    await press();
    expect(
      screen.getByText(/Microphone access is blocked/, { selector: "p" }),
    ).toBeInTheDocument();
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "denied" }));
    expect(button()).toHaveAttribute("aria-pressed", "false");
    unmount();

    refuse("NotFoundError");
    const second = render(<VoiceInput onError={onError} />);
    await press();
    expect(screen.getByText("No microphone was found.", { selector: "p" })).toBeInTheDocument();
    second.unmount();

    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
    render(<VoiceInput onError={onError} />);
    await press();
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "unsupported" }));
  });

  it("streams a transcript where the browser can recognise speech", async () => {
    grant();
    class FakeRecognition {
      static last: FakeRecognition | null = null;
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: unknown) => void) | null = null;
      onerror = null;
      constructor() {
        FakeRecognition.last = this;
      }
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    const onTranscript = vi.fn();
    render(<VoiceInput transcribe onTranscript={onTranscript} lang="en-GB" />);
    await press();
    const result = (text: string, isFinal: boolean) =>
      Object.assign([{ transcript: text }], { isFinal });
    act(() => {
      FakeRecognition.last?.onresult?.({
        resultIndex: 0,
        results: [result("Summarise the ", false)],
      });
    });
    expect(onTranscript).toHaveBeenLastCalledWith("Summarise the", false);
    act(() => {
      FakeRecognition.last?.onresult?.({
        resultIndex: 0,
        results: [result("Summarise the report", true)],
      });
    });
    expect(onTranscript).toHaveBeenLastCalledWith("Summarise the report", true);
  });

  it("reports a recogniser failure as lost transcription, not a blocked microphone", async () => {
    grant();
    class RefusingRecognition {
      static last: RefusingRecognition | null = null;
      continuous = false;
      interimResults = false;
      lang = "";
      onresult = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor() {
        RefusingRecognition.last = this;
      }
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }
    vi.stubGlobal("SpeechRecognition", RefusingRecognition);
    const onError = vi.fn();
    render(<VoiceInput transcribe onError={onError} />);
    await press();
    act(() => {
      RefusingRecognition.last?.onerror?.({ error: "no-speech" });
    });
    expect(onError).not.toHaveBeenCalled();
    act(() => {
      RefusingRecognition.last?.onerror?.({ error: "not-allowed" });
    });
    expect(onError).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "transcription-unavailable" }),
    );
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });

  it("says when transcription isn't available, and records anyway", async () => {
    grant();
    const onError = vi.fn();
    render(<VoiceInput transcribe onError={onError} />);
    await press();
    expect(onError).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "transcription-unavailable" }),
    );
    expect(button()).toHaveAttribute("aria-pressed", "true");
  });

  it("releases the microphone when it unmounts mid-recording", async () => {
    const { track } = grant();
    const { unmount } = render(<VoiceInput />);
    await press();
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });
});

describe("formatDuration", () => {
  it("reads as minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(67_400)).toBe("1:07");
  });
});
