"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { SonifierTone } from "./sonify";

/*
 * Web Audio for the sonifier, kept out of React.
 *
 * The audio context is created on the first play or preview, which is always
 * inside a click or key press: browsers refuse to start audio any other way,
 * and a page that makes sound on load is exactly what this must never do.
 *
 * Each tone is an oscillator through its own gain envelope, ramped up and down
 * over a few milliseconds. Starting or stopping a waveform mid-cycle is heard
 * as a click, so nothing is ever switched on or off, only faded. A master gain
 * carries mute, so muting mid-playback silences it without losing the place.
 *
 * Tones are handed to the audio thread a quarter of a second ahead by a timer,
 * rather than all at once, so a long series does not build thousands of nodes
 * in one click. The same timer moves the playhead.
 */

type AudioContextConstructor = new () => AudioContext;

function audioContextConstructor(): AudioContextConstructor | undefined {
  const scope = globalThis as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
}

/** Whether this browser can make the sound at all. */
export function canSonify(): boolean {
  return audioContextConstructor() !== undefined;
}

/** Support does not change while a page is open. */
const subscribe = () => () => undefined;

/** Scheduled this far ahead, so the first note's attack is not cut off. */
const LEAD_MS = 40;
/** How far ahead of the clock tones are handed to the audio thread. */
const LOOKAHEAD_MS = 250;
const TICK_MS = 25;
const ATTACK_S = 0.012;
const RELEASE_S = 0.025;
/** Stopping fades over this rather than cutting, which would click. */
const FADE_S = 0.015;
/** Per voice. Low, so a note and a click overlapping never clip. */
const TONE_GAIN = 0.2;
/** A click is short, so it needs more level to be heard at all. */
const CLICK_GAIN = 0.3;
const DEFAULT_VOLUME = 0.8;

interface Output {
  context: AudioContext;
  master: GainNode;
}

interface Voice {
  oscillator: OscillatorNode;
  envelope: GainNode;
}

type ToneShape = Pick<SonifierTone, "frequency" | "duration" | "missing">;

function fadeTo(param: AudioParam, value: number, now: number) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + FADE_S);
}

export interface SonifierPlayCallbacks {
  /** Each tone as it starts to sound. What moves a playhead. */
  onTone?: (tone: SonifierTone) => void;
  /** After the last tone has finished. Not called when stopped. */
  onEnd?: () => void;
}

class SonifierEngine {
  private output: Output | null = null;
  private readonly voices = new Set<Voice>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private level = DEFAULT_VOLUME;

  setLevel(level: number) {
    this.level = level;
    if (this.output) fadeTo(this.output.master.gain, level, this.output.context.currentTime);
  }

  /** The context, created on first use. Only ever called from a user gesture. */
  private open(): Output | null {
    if (!this.output) {
      const Context = audioContextConstructor();
      if (!Context) return null;
      const context = new Context();
      const master = context.createGain();
      master.gain.setValueAtTime(this.level, context.currentTime);
      master.connect(context.destination);
      this.output = { context, master };
    }
    if (this.output.context.state === "suspended") void this.output.context.resume();
    return this.output;
  }

  private sound({ context, master }: Output, tone: ToneShape, at: number) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const length = tone.duration / 1000;
    const attack = Math.min(ATTACK_S, length / 4);
    const release = Math.min(RELEASE_S, length / 4);
    const peak = tone.missing ? CLICK_GAIN : TONE_GAIN;

    oscillator.type = tone.missing ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, at);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(peak, at + attack);
    envelope.gain.setValueAtTime(peak, at + length - release);
    envelope.gain.linearRampToValueAtTime(0, at + length);
    oscillator.connect(envelope);
    envelope.connect(master);

    const voice = { oscillator, envelope };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(at);
    oscillator.stop(at + length);
  }

  /** Fades out every sounding or scheduled voice and stops the clock. */
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (!this.output) return;
    const now = this.output.context.currentTime;
    for (const voice of this.voices) {
      fadeTo(voice.envelope.gain, 0, now);
      voice.oscillator.stop(now + FADE_S);
    }
    this.voices.clear();
  }

  /** Returns false when there is nothing to play or no way to play it. */
  play(tones: readonly SonifierTone[], callbacks: SonifierPlayCallbacks): boolean {
    this.stop();
    const output = tones.length > 0 ? this.open() : null;
    const final = tones.at(-1);
    if (!output || !final) return false;

    // Two clocks: audio time places each note exactly; wall time drives the
    // lookahead and the playhead, and survives a context that is still resuming.
    const origin = output.context.currentTime + LEAD_MS / 1000;
    const zero = Date.now() + LEAD_MS;
    const end = final.start + final.duration;
    let queued = 0;
    let heard = -1;

    const tick = () => {
      const elapsed = Date.now() - zero;
      for (;;) {
        const tone = tones[queued];
        if (!tone || tone.start >= elapsed + LOOKAHEAD_MS) break;
        // A tick that runs late plays the note now rather than in the past.
        this.sound(
          output,
          tone,
          Math.max(origin + tone.start / 1000, output.context.currentTime),
        );
        queued += 1;
      }
      let latest = heard;
      while ((tones[latest + 1]?.start ?? Infinity) <= elapsed) latest += 1;
      if (latest !== heard) {
        heard = latest;
        const tone = tones[latest];
        if (tone) callbacks.onTone?.(tone);
      }
      if (elapsed >= end) {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        callbacks.onEnd?.();
      }
    };

    this.timer = setInterval(tick, TICK_MS);
    tick();
    return true;
  }

  /** One tone now, cutting off any before it so fast scrubbing does not pile up. */
  preview(tone: ToneShape) {
    this.stop();
    const output = this.open();
    if (output) this.sound(output, tone, output.context.currentTime + 0.005);
  }

  /** Releases everything. The engine stays usable: the next gesture opens a new context. */
  dispose() {
    this.stop();
    const output = this.output;
    this.output = null;
    if (output) void output.context.close();
  }
}

export interface UseSonifierOptions {
  /** Silences the output without stopping playback, so the place is kept. */
  muted?: boolean;
  /** Output level, 0 to 1. */
  volume?: number;
}

export interface Sonifier {
  /** False where the Web Audio API is missing. Assumed true while server rendering. */
  supported: boolean;
  playing: boolean;
  /**
   * Plays a schedule from `planTones`, replacing anything already playing.
   * Call it from a click or key press: the first call creates the audio context.
   */
  play: (tones: readonly SonifierTone[], callbacks?: SonifierPlayCallbacks) => void;
  /** One tone straight away; `start` is ignored. What scrubbing plays. */
  preview: (tone: ToneShape) => void;
  /** Silences everything at once, with a fade too short to hear but long enough not to click. */
  stop: () => void;
}

/**
 * Plays tone schedules through the Web Audio API.
 *
 * Nothing is created until `play` or `preview` is called, and everything is
 * stopped and closed on unmount.
 */
export function useSonifier({
  muted = false,
  volume = DEFAULT_VOLUME,
}: UseSonifierOptions = {}): Sonifier {
  const supported = useSyncExternalStore(subscribe, canSonify, () => true);
  const [playing, setPlaying] = useState(false);
  const [engine] = useState(() => new SonifierEngine());

  useEffect(() => {
    engine.setLevel(muted ? 0 : Math.min(1, Math.max(0, volume)));
  }, [engine, muted, volume]);

  useEffect(
    () => () => {
      engine.dispose();
    },
    [engine],
  );

  const play = useCallback(
    (tones: readonly SonifierTone[], callbacks: SonifierPlayCallbacks = {}) => {
      const started = engine.play(tones, {
        onTone: callbacks.onTone,
        onEnd: () => {
          setPlaying(false);
          callbacks.onEnd?.();
        },
      });
      setPlaying(started);
    },
    [engine],
  );

  const stop = useCallback(() => {
    engine.stop();
    setPlaying(false);
  }, [engine]);

  const preview = useCallback(
    (tone: ToneShape) => {
      // A preview cuts off playback too, so the state has to say so.
      engine.preview(tone);
      setPlaying(false);
    },
    [engine],
  );

  return { supported, playing, play, preview, stop };
}
