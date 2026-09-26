"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { completeSentences, estimateSpeechMs } from "./speakable";

/**
 * Hears a streaming response as it arrives, a sentence at a time.
 *
 * `ai-conversation` announces state and never content, and that stays the
 * default: a live region fed tokens interrupts a screen reader on every one of
 * them. But the cost of that default is that a screen reader user waits for the
 * whole answer while everyone else reads it as it forms.
 *
 * This is the opt-in middle. It speaks only complete sentences — never a
 * fragment, never a half-formed number — paces them against a rough estimate of
 * speech rate so a backlog forms here rather than in the screen reader, where it
 * could no longer be paused or skipped, and gives the listener the controls a
 * sighted reader has for free: pause, skip ahead, hear that again.
 */

export interface StreamAnnouncerLabels {
  toggleOn: string;
  toggleOff: string;
  pause: string;
  resume: string;
  skip: (queued: number) => string;
  repeat: string;
  /** Announced after a skip, so the silence that follows is explained. */
  skipped: (count: number) => string;
  group: string;
}

const DEFAULT_LABELS: StreamAnnouncerLabels = {
  toggleOn: "Stop reading responses as they stream",
  toggleOff: "Read responses as they stream",
  pause: "Pause reading",
  resume: "Resume reading",
  skip: (queued) => (queued > 0 ? `Skip ${String(queued)} queued` : "Skip to latest"),
  repeat: "Repeat last",
  skipped: (count) =>
    count === 1 ? "Skipped 1 sentence." : `Skipped ${String(count)} sentences.`,
  group: "Response reading",
};

/**
 * Chunks kept in the live region. It only gains nodes until it holds this
 * many, then starts over with the next chunk. It is never trimmed from the
 * front while nodes remain: Chrome compares the region before and after from
 * both ends, and with the first node gone and a new last one nothing lines up,
 * so it reports every node as new and NVDA reads them all again. Emptied and
 * refilled in one update, only the new chunk is new.
 */
const RENDERED_CHUNKS = 3;

/**
 * Sentences shorter than this are joined to the next one waiting, so "1." or a
 * bare heading is not an announcement of its own. Longer ones go one at a time:
 * anything handed to the screen reader is beyond Pause and Skip.
 */
const MIN_CHUNK_LENGTH = 40;

/** The most text sent to the screen reader in one announcement. */
const MAX_CHUNK_LENGTH = 320;

interface Chunk {
  id: number;
  text: string;
}

interface StreamAnnouncerContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  /** Sentences waiting their turn. */
  queued: number;
  /** Drops everything waiting and carries on from whatever arrives next. */
  skip: () => void;
  /** Says the last announcement again. */
  repeat: () => void;
  /** Whether there is anything to repeat. */
  canRepeat: boolean;
  labels: StreamAnnouncerLabels;
}

const StreamAnnouncerContext = createContext<StreamAnnouncerContextValue | null>(null);

/** State and actions for building your own controls. */
export function useStreamAnnouncer(): StreamAnnouncerContextValue {
  const context = useContext(StreamAnnouncerContext);
  if (!context) {
    throw new Error("useStreamAnnouncer must be used inside <StreamAnnouncer>.");
  }
  return context;
}

export interface StreamAnnouncerProps extends ComponentPropsWithRef<"div"> {
  /** The response so far — plain text or markdown. Grows as it streams. */
  text: string;
  /** Whether more is still coming. The last sentence is held until it is not. */
  streaming: boolean;
  /** Controlled on/off. Off by default: this is the listener's choice to make. */
  enabled?: boolean;
  defaultEnabled?: boolean;
  /** Persist this if you offer the setting; it belongs to the user, not the page. */
  onEnabledChange?: (enabled: boolean) => void;
  /**
   * The listener's speech rate, roughly, for pacing. Too low and announcements
   * lag the stream; too high and the queue drains into the screen reader, where
   * pause and skip can no longer reach it.
   */
  wordsPerMinute?: number;
  /** Locale for sentence rules. Defaults to the platform's. */
  locale?: string;
  labels?: Partial<StreamAnnouncerLabels>;
  /**
   * Everything the region is given, as it is given. For a transcript of what
   * was read, or to send the same sentences to speech synthesis for people who
   * want to listen without a screen reader.
   */
  onAnnounce?: (text: string) => void;
  /** Your controls. Omitted, the four standard ones are rendered. */
  children?: ReactNode;
}

export function StreamAnnouncer({
  className,
  text,
  streaming,
  enabled: enabledProp,
  defaultEnabled = false,
  onEnabledChange,
  wordsPerMinute = 240,
  locale,
  labels: labelOverrides,
  onAnnounce,
  children,
  ...props
}: StreamAnnouncerProps) {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);

  const [enabledState, setEnabledState] = useState(defaultEnabled);
  const enabled = enabledProp ?? enabledState;
  const [paused, setPausedState] = useState(false);
  const [queued, setQueued] = useState(0);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [canRepeat, setCanRepeat] = useState(false);

  const queue = useRef<string[]>([]);
  /** The sentences of the current response already queued or said. */
  const spoken = useRef<string[]>([]);
  const last = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const pausedRef = useRef(false);
  const wpm = useRef(wordsPerMinute);
  const announceTo = useRef(onAnnounce);
  const drain = useRef<() => void>(() => undefined);

  useEffect(() => {
    wpm.current = wordsPerMinute;
    announceTo.current = onAnnounce;
  }, [wordsPerMinute, onAnnounce]);

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /**
   * Puts one chunk in the region, then holds the next for roughly as long as
   * this one takes to say. `remember` is false for the component's own notices,
   * so Repeat always repeats the response and never "Skipped 3 sentences".
   */
  const send = useCallback(
    (chunk: string, remember: boolean) => {
      if (remember) {
        last.current = chunk;
        setCanRepeat(true);
      }
      nextId.current += 1;
      const id = nextId.current;
      setChunks((current) =>
        current.length < RENDERED_CHUNKS
          ? [...current, { id, text: chunk }]
          : [{ id, text: chunk }],
      );
      announceTo.current?.(chunk);
      stop();
      timer.current = setTimeout(
        () => {
          timer.current = null;
          drain.current();
        },
        estimateSpeechMs(chunk, wpm.current),
      );
    },
    [stop],
  );

  // One sentence per announcement, short ones joined to what follows. The
  // backlog stays here, where Pause and Skip can reach it.
  const pump = useCallback(() => {
    if (pausedRef.current || timer.current !== null) return;
    if (queue.current.length === 0) return;

    let chunk = queue.current.shift() ?? "";
    while (
      queue.current.length > 0 &&
      chunk.length < MIN_CHUNK_LENGTH &&
      chunk.length + (queue.current[0]?.length ?? 0) < MAX_CHUNK_LENGTH
    ) {
      // A heading or list item has no full stop of its own; without one the
      // screen reader runs it straight into the next sentence.
      const pause = /[.!?:;…。！？]["'”’)\]]*$/.test(chunk) ? " " : ". ";
      chunk = `${chunk}${pause}${queue.current.shift() ?? ""}`;
    }
    setQueued(queue.current.length);
    send(chunk, true);
  }, [send]);

  useEffect(() => {
    drain.current = pump;
  }, [pump]);

  const reset = useCallback(() => {
    stop();
    queue.current = [];
    setQueued(0);
  }, [stop]);

  // Follows the text. An effect, because what it drives is timers: the queue is
  // outside React, and the state it sets is only what those timers produce.
  useEffect(() => {
    if (!enabled) return;

    const sentences = completeSentences(text, { streaming, locale });
    // A continuation still begins with every sentence already spoken. Anything
    // else — an empty string, a shorter text, a different opening — is a new
    // response, and whatever was waiting from the old one is dropped.
    const known = spoken.current;
    const continues =
      sentences.length >= known.length &&
      known.every((sentence, i) => sentences[i] === sentence);
    if (!continues) reset();

    const fresh = sentences.slice(continues ? known.length : 0);
    spoken.current = sentences;
    if (fresh.length === 0) return;

    queue.current.push(...fresh);
    setQueued(queue.current.length);
    pump();
  }, [text, streaming, enabled, locale, pump, reset]);

  useEffect(() => stop, [stop]);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (next === enabled) return;
      if (next) {
        // Switched on mid-stream, it reads this response from the start. Switched
        // on after one has finished, it does not suddenly read an old answer.
        spoken.current = streaming ? [] : completeSentences(text, { locale });
      } else {
        reset();
        setChunks([]);
        setCanRepeat(false);
        last.current = null;
      }
      if (enabledProp === undefined) setEnabledState(next);
      onEnabledChange?.(next);
    },
    [enabled, enabledProp, locale, onEnabledChange, reset, streaming, text],
  );

  const setPaused = useCallback(
    (next: boolean) => {
      pausedRef.current = next;
      setPausedState(next);
      if (next) stop();
      else pump();
    },
    [pump, stop],
  );

  const skip = useCallback(() => {
    const dropped = queue.current.length;
    reset();
    if (dropped > 0) send(labels.skipped(dropped), false);
  }, [labels, reset, send]);

  const repeat = useCallback(() => {
    if (last.current) send(last.current, false);
  }, [send]);

  const context = useMemo<StreamAnnouncerContextValue>(
    () => ({
      enabled,
      setEnabled,
      paused,
      setPaused,
      queued,
      skip,
      repeat,
      canRepeat,
      labels,
    }),
    [enabled, setEnabled, paused, setPaused, queued, skip, repeat, canRepeat, labels],
  );

  return (
    <StreamAnnouncerContext.Provider value={context}>
      <div
        data-slot="stream-announcer"
        data-enabled={enabled || undefined}
        role="group"
        aria-label={labels.group}
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      >
        {children ?? (
          <>
            <StreamAnnouncerToggle />
            <StreamAnnouncerPause />
            <StreamAnnouncerSkip />
            <StreamAnnouncerRepeat />
          </>
        )}
        {/* Not role="status" or "log": status is atomic and would re-read the
            whole region, and log would add a second transcript to navigate.
            A plain polite region that only ever gains nodes, present from
            first paint, because a region announces nothing until it exists. */}
        <div data-slot="stream-announcer-region" aria-live="polite" className="sr-only">
          {chunks.map((chunk) => (
            <p key={chunk.id}>{chunk.text}</p>
          ))}
        </div>
      </div>
    </StreamAnnouncerContext.Provider>
  );
}

const controlClass = cn(
  "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1",
  "text-xs font-medium transition-colors duration-[var(--duration-fast)]",
  "hover:bg-accent hover:text-accent-foreground",
  "aria-pressed:bg-accent aria-pressed:text-accent-foreground",
  "disabled:pointer-events-none disabled:opacity-55",
  focusRing,
);

/** Turns reading on and off. A toggle button, so its state is announced. */
export function StreamAnnouncerToggle({
  className,
  onClick,
  children,
  ...props
}: ComponentPropsWithRef<"button">) {
  const { enabled, setEnabled, labels } = useStreamAnnouncer();
  return (
    <button
      type="button"
      data-slot="stream-announcer-toggle"
      aria-pressed={enabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setEnabled(!enabled);
      }}
      className={cn(controlClass, className)}
      {...props}
    >
      {children ?? (enabled ? labels.toggleOn : labels.toggleOff)}
    </button>
  );
}

/**
 * Pause and resume. Hidden while reading is off, since there is nothing for it
 * to act on — a control that does nothing is one more stop to tab past.
 */
export function StreamAnnouncerPause({
  className,
  onClick,
  children,
  ...props
}: ComponentPropsWithRef<"button">) {
  const { enabled, paused, setPaused, labels } = useStreamAnnouncer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      data-slot="stream-announcer-pause"
      aria-pressed={paused}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPaused(!paused);
      }}
      className={cn(controlClass, className)}
      {...props}
    >
      {children ?? (paused ? labels.resume : labels.pause)}
    </button>
  );
}

/** Drops the backlog. The count is in the name, so it says what it will skip. */
export function StreamAnnouncerSkip({
  className,
  onClick,
  children,
  ...props
}: ComponentPropsWithRef<"button">) {
  const { enabled, queued, skip, labels } = useStreamAnnouncer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      data-slot="stream-announcer-skip"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) skip();
      }}
      className={cn(controlClass, className)}
      {...props}
    >
      {children ?? labels.skip(queued)}
    </button>
  );
}

/** Says the last announcement again. */
export function StreamAnnouncerRepeat({
  className,
  onClick,
  children,
  ...props
}: ComponentPropsWithRef<"button">) {
  const { enabled, repeat, canRepeat, labels } = useStreamAnnouncer();
  if (!enabled) return null;
  return (
    <button
      type="button"
      data-slot="stream-announcer-repeat"
      disabled={!canRepeat}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) repeat();
      }}
      className={cn(controlClass, className)}
      {...props}
    >
      {children ?? labels.repeat}
    </button>
  );
}
