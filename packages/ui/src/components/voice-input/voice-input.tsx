"use client";

// Original design.
import { useCallback, useEffect, useRef, useState, type ComponentPropsWithRef } from "react";

import { AudioVisualizer } from "@/components/audio-visualizer";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A microphone button for talking to an assistant: press to record, press
 * again to stop.
 *
 * The button is a toggle (aria-pressed) with one name throughout, so a screen
 * reader hears "Voice input, pressed" rather than a label that changes under
 * it. While recording it shows what the mic hears (AudioVisualizer), how long
 * it has been going, and says "Recording" in words — the visualizer is never
 * the only sign. A status region announces start, stop and errors.
 *
 * It records with MediaRecorder and hands back the audio when it stops; set
 * `transcribe` and, where the browser has speech recognition, it also streams
 * a transcript as the user speaks. Permission denied, no microphone, and a
 * browser without the APIs each get a plain message rather than a dead
 * button. Escape cancels a recording without keeping it. The microphone is
 * released the moment recording ends or the component goes.
 */

export type VoiceInputErrorKind =
  "denied" | "no-device" | "unsupported" | "transcription-unavailable" | "failed";

export interface VoiceInputError {
  kind: VoiceInputErrorKind;
  message: string;
}

export interface VoiceInputMessages {
  recording: string;
  started: string;
  stopped: (seconds: number) => string;
  cancelled: string;
  denied: string;
  noDevice: string;
  unsupported: string;
  transcriptionUnavailable: string;
  failed: string;
}

const defaultMessages: VoiceInputMessages = {
  recording: "Recording",
  started: "Recording started",
  stopped: (seconds) =>
    `Recording stopped, ${String(seconds)} ${seconds === 1 ? "second" : "seconds"}`,
  cancelled: "Recording cancelled",
  denied:
    "Microphone access is blocked. Allow it in your browser's site settings to talk instead of type.",
  noDevice: "No microphone was found.",
  unsupported: "This browser can't record audio.",
  transcriptionUnavailable:
    "Live transcription isn't available in this browser, so only the audio is kept.",
  failed: "The microphone couldn't be started.",
};

/** The browser's speech recogniser, if it has one. */
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** "1:07" from milliseconds. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, "0")}`;
}

export interface VoiceInputProps extends Omit<ComponentPropsWithRef<"div">, "onError"> {
  /** Called with the recorded audio when a recording ends (not when it is cancelled). */
  onRecordingComplete?: (audio: Blob, durationMs: number) => void;
  /** Stream a live transcript through `onTranscript`, where the browser supports it. */
  transcribe?: boolean;
  /** The transcript so far, and whether this part is final. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Language for transcription, e.g. "en-GB". Defaults to the page's. */
  lang?: string;
  /** Stop on their own after this many seconds. */
  maxDuration?: number;
  /** Told when recording starts and stops. */
  onRecordingChange?: (recording: boolean) => void;
  /** Told about anything that went wrong; the message is also shown. */
  onError?: (error: VoiceInputError) => void;
  /** The button's accessible name. Default "Voice input". */
  label?: string;
  /** How the visualizer draws. Default "bars". */
  visualizer?: "bars" | "wave" | "orb";
  /** Words, for other languages. */
  messages?: Partial<VoiceInputMessages>;
  disabled?: boolean;
}

/** A microphone toggle that records, visualizes and optionally transcribes. */
export function VoiceInput({
  onRecordingComplete,
  transcribe = false,
  onTranscript,
  lang,
  maxDuration,
  onRecordingChange,
  onError,
  label = "Voice input",
  visualizer = "bars",
  messages: messageOverrides,
  disabled = false,
  className,
  ...props
}: VoiceInputProps) {
  const messages = { ...defaultMessages, ...messageOverrides };
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<VoiceInputError | null>(null);

  const session = useRef<{
    stream: MediaStream;
    recorder?: MediaRecorder;
    recognition?: Recognition;
    chunks: Blob[];
    startedAt: number;
    keep: boolean;
  } | null>(null);
  const mounted = useRef(true);
  // Latest callbacks, so a recording in flight reports to the current ones.
  const latest = useRef({
    onRecordingComplete,
    onTranscript,
    onRecordingChange,
    onError,
    messages,
  });
  useEffect(() => {
    latest.current = {
      onRecordingComplete,
      onTranscript,
      onRecordingChange,
      onError,
      messages,
    };
  });

  const fail = useCallback((kind: VoiceInputErrorKind, message: string) => {
    const next = { kind, message };
    setError(next);
    setAnnouncement(message);
    latest.current.onError?.(next);
  }, []);

  /** Ends the recording; `keep` decides whether the audio is handed back. */
  const finish = useCallback((keep: boolean) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    current.keep = keep;
    const duration = Date.now() - current.startedAt;
    if (current.recognition) {
      if (keep) current.recognition.stop();
      else current.recognition.abort();
    }
    const release = () => {
      for (const track of current.stream.getTracks()) track.stop();
    };
    if (current.recorder && current.recorder.state !== "inactive") {
      current.recorder.onstop = () => {
        release();
        if (current.keep && current.chunks.length > 0) {
          const type = current.recorder?.mimeType || current.chunks[0]?.type || "audio/webm";
          latest.current.onRecordingComplete?.(new Blob(current.chunks, { type }), duration);
        }
      };
      current.recorder.stop();
    } else {
      release();
    }
    if (!mounted.current) return;
    setStream(null);
    setElapsed(0);
    const { messages: words } = latest.current;
    setAnnouncement(keep ? words.stopped(Math.round(duration / 1000)) : words.cancelled);
    latest.current.onRecordingChange?.(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const words = latest.current.messages;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      fail("unsupported", words.unsupported);
      return;
    }
    setStarting(true);
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setStarting(false);
      const name = cause instanceof Error || cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") fail("denied", words.denied);
      else if (name === "NotFoundError" || name === "OverconstrainedError")
        fail("no-device", words.noDevice);
      else fail("failed", words.failed);
      return;
    }
    if (!mounted.current) {
      for (const track of media.getTracks()) track.stop();
      return;
    }
    setStarting(false);

    const current: NonNullable<typeof session.current> = {
      stream: media,
      chunks: [],
      startedAt: Date.now(),
      keep: true,
    };
    if (typeof MediaRecorder !== "undefined") {
      try {
        const recorder = new MediaRecorder(media);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) current.chunks.push(event.data);
        };
        recorder.start();
        current.recorder = recorder;
      } catch {
        // No recorder for this stream: the visualizer and transcript still work.
      }
    }
    if (transcribe) {
      const Recogniser = recognitionConstructor();
      if (Recogniser) {
        const recognition = new Recogniser();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang ?? (document.documentElement.lang || "en-US");
        let settled = "";
        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            if (!result) continue;
            const text = result[0]?.transcript ?? "";
            if (result.isFinal) settled += text;
            else interim += text;
          }
          latest.current.onTranscript?.((settled + interim).trim(), interim === "");
        };
        // The recogniser failing — blocked, offline, no service — loses the
        // transcript, not the recording, so say exactly that. "no-speech" and
        // "aborted" are not failures.
        recognition.onerror = (event) => {
          if (event.error === "no-speech" || event.error === "aborted") return;
          fail("transcription-unavailable", latest.current.messages.transcriptionUnavailable);
        };
        try {
          recognition.start();
          current.recognition = recognition;
        } catch {
          fail("transcription-unavailable", words.transcriptionUnavailable);
        }
      } else {
        fail("transcription-unavailable", words.transcriptionUnavailable);
      }
    }
    session.current = current;
    setStream(media);
    setElapsed(0);
    setAnnouncement(words.started);
    latest.current.onRecordingChange?.(true);
  }, [fail, lang, transcribe]);

  const recording = stream !== null;

  // The clock, and the auto-stop.
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const current = session.current;
      if (!current) return;
      const ms = Date.now() - current.startedAt;
      setElapsed(ms);
      if (maxDuration !== undefined && ms >= maxDuration * 1000) finish(true);
    }, 250);
    return () => {
      window.clearInterval(id);
    };
  }, [recording, maxDuration, finish]);

  // Let the microphone go if the component does.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      finish(false);
    };
  }, [finish]);

  return (
    <div
      data-slot="voice-input"
      data-recording={recording || undefined}
      className={cn("inline-flex flex-col items-start gap-1.5", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          shape="pill"
          variant={recording ? "destructive" : "outline"}
          aria-pressed={recording}
          aria-label={label}
          loading={starting}
          disabled={disabled}
          data-slot="voice-input-button"
          onClick={() => {
            if (recording) finish(true);
            else void start();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && recording) {
              event.preventDefault();
              finish(false);
            }
          }}
        >
          {starting ? null : recording ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </Button>
        {recording ? (
          <div data-slot="voice-input-live" className="flex items-center gap-3">
            <AudioVisualizer
              stream={stream}
              variant={visualizer}
              bands={16}
              className={visualizer === "orb" ? "size-9" : "h-8 w-28"}
            />
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-destructive" />
              {messages.recording}
              <span
                data-slot="voice-input-timer"
                className="font-mono text-foreground tabular-nums"
              >
                {formatDuration(elapsed)}
              </span>
            </span>
          </div>
        ) : null}
      </div>
      {error ? (
        <p data-slot="voice-input-error" className="max-w-xs text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
