"use client";

// Original design (pattern inspired by Rare UI Step player; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A row of step dots with a round play / pause / replay button. The current
 * step stretches into a bar that fills over its duration, then shrinks back to
 * a filled dot as the next one stretches out.
 *
 * Timing
 *
 * The clock is requestAnimationFrame with elapsed time kept in a ref, not a
 * CSS animation, so it is exact and pause-resumable: pausing keeps the elapsed
 * milliseconds, resuming carries on from them, and a step that overruns hands
 * its remainder to the next, so a sequence never drifts. Time while the page
 * is hidden is not counted. Each frame writes the fill as `--sp-p` on the
 * active step — never through React — so a frame costs one style write.
 *
 * Layout without layout animation
 *
 * Only one step is ever a bar, so the track's width is constant and every
 * step's position is known: steps before the current one sit at
 * `i × slot`, steps after it one bar-minus-dot further along. Each step is
 * absolutely placed with `translate`, and each is a bar-wide pill clipped down
 * to a dot with `clip-path: inset()`; growing and shrinking is the clip
 * transitioning, moving is the translate transitioning. Nothing reflows.
 * Every dimension is a ratio of `--sp-size`, set from the `size` prop.
 *
 * The icon
 *
 * Play and pause are the same two shapes: the triangle is cut down the middle
 * into a left trapezoid and a right triangle, which slide into the two pause
 * bars by transitioning their `clip-path` polygons (four points each, so they
 * interpolate). At the end both fade out and a replay arrow turns in.
 *
 * Accessibility
 *
 * The button is named for what it will do — Play, Pause or Replay — the
 * pattern for a media toggle whose icon changes. The track is a progressbar
 * ("Step 2 of 5") or, when `seekable`, a list of step buttons with
 * aria-current="step" and one tab stop: arrow keys (mirrored in RTL), Home and
 * End move and seek. Each step button's hit area is at least 24px square at
 * every size. Nothing is announced as it plays; the value is there when asked.
 * Media icons are not mirrored in right-to-left layouts; the track is.
 */

const PREFIX = "dowel-step-player";

const STYLES = `
[data-slot=step-player]{--sp-dot:calc(var(--sp-size) * .25);--sp-gap:calc(var(--sp-size) * .2);--sp-bar:calc(var(--sp-size) * 2.25);--sp-pad:calc(var(--sp-size) * .375);--sp-slot:calc(var(--sp-dot) + var(--sp-gap));--sp-flip:1}
[data-slot=step-player][data-seekable]{--sp-slot:max(24px, calc(var(--sp-dot) + var(--sp-gap)))}
[dir=rtl] [data-slot=step-player]{--sp-flip:-1}
[data-slot=step-player]:dir(rtl){--sp-flip:-1}
[data-slot=step-player]:dir(ltr){--sp-flip:1}
[data-slot=step-player-track]{position:relative;flex:none;height:var(--sp-size);width:calc((var(--sp-count) - 1) * var(--sp-slot) + var(--sp-bar) + 2 * var(--sp-pad))}
[data-slot=step-player-step]{position:absolute;top:50%;inset-inline-start:var(--sp-pad);width:var(--sp-bar);height:var(--sp-dot);translate:calc(var(--sp-x) * var(--sp-flip)) -50%;transition:translate var(--duration-slow) var(--ease-out-quint)}
[data-slot=step-player-pill]{position:absolute;inset:0;overflow:hidden;border-radius:999px;clip-path:inset(0 calc(var(--sp-bar) - var(--sp-dot)) 0 0 round 999px);transition:clip-path var(--duration-slow) var(--ease-out-quint)}
[dir=rtl] [data-slot=step-player-pill]{clip-path:inset(0 0 0 calc(var(--sp-bar) - var(--sp-dot)) round 999px)}
[data-slot=step-player-pill]:dir(rtl){clip-path:inset(0 0 0 calc(var(--sp-bar) - var(--sp-dot)) round 999px)}
[data-slot=step-player-pill]:dir(ltr){clip-path:inset(0 calc(var(--sp-bar) - var(--sp-dot)) 0 0 round 999px)}
[data-state=active]>[data-slot=step-player-pill]{clip-path:inset(0 0 0 0 round 999px)}
[data-slot=step-player-fill]{position:absolute;inset:0;transform-origin:left;transform:scaleX(0);transition:transform var(--duration-normal) var(--ease-out-quint)}
[dir=rtl] [data-slot=step-player-fill]{transform-origin:right}
[data-slot=step-player-fill]:dir(rtl){transform-origin:right}
[data-state=complete] [data-slot=step-player-fill]{transform:scaleX(1)}
[data-state=active] [data-slot=step-player-fill]{transform:scaleX(var(--sp-p, 0));transition:none}
[data-slot=step-player-seek]{position:absolute;top:50%;inset-inline-start:calc((var(--sp-dot) - var(--sp-slot)) / 2);translate:0 -50%;width:var(--sp-slot);height:max(24px, var(--sp-size))}
[data-state=active]>[data-slot=step-player-seek]{width:calc(var(--sp-slot) + var(--sp-bar) - var(--sp-dot))}
[data-slot=step-player-glyph]{position:absolute;inset:0;background:currentColor;transition:clip-path var(--duration-normal) var(--ease-out-quint),opacity var(--duration-fast) var(--ease-out-quint),scale var(--duration-normal) var(--ease-out-quint)}
[data-icon=play] [data-part=a],[data-icon=replay] [data-part=a]{clip-path:polygon(14% 0%,57% 25%,57% 75%,14% 100%)}
[data-icon=play] [data-part=b],[data-icon=replay] [data-part=b]{clip-path:polygon(57% 25%,100% 50%,100% 50%,57% 75%)}
[data-icon=pause] [data-part=a]{clip-path:polygon(10% 0%,40% 0%,40% 100%,10% 100%)}
[data-icon=pause] [data-part=b]{clip-path:polygon(60% 0%,90% 0%,90% 100%,60% 100%)}
[data-icon=replay] [data-slot=step-player-glyph]{opacity:0;scale:.5}
[data-slot=step-player-replay]{opacity:0;rotate:-120deg;scale:.6;transition:opacity var(--duration-fast) var(--ease-out-quint),rotate var(--duration-slow) var(--ease-overshoot),scale var(--duration-slow) var(--ease-overshoot)}
[data-icon=replay] [data-slot=step-player-replay]{opacity:1;rotate:0deg;scale:1}
`;

const stepPlayerVariants = cva("inline-flex items-center gap-[calc(var(--sp-size)*0.25)]", {
  variants: {
    /** `filled` sits the dots in a capsule; `plain` is the dots alone. */
    track: {
      filled: "[--sp-track:var(--color-muted)]",
      plain: "[--sp-track:transparent]",
    },
  },
  defaultVariants: { track: "filled" },
});

export interface StepPlayerStep {
  /** Milliseconds this step runs for. Overrides `duration`; 0 waits for you. */
  duration?: number;
  /** Named to assistive technology as "Step 2 of 5: <label>". */
  label?: string;
}

export interface StepPlayerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof stepPlayerVariants> {
  /** How many steps, or one entry per step with its own duration and label. */
  steps?: number | StepPlayerStep[];
  /** Controlled active step, zero-based. */
  value?: number;
  /** Initial step when uncontrolled. Clamped to the last step. */
  defaultValue?: number;
  /** Fires when the step advances, wraps, is chosen, or restarts on replay. */
  onValueChange?: (value: number) => void;
  /** Controlled play state. */
  playing?: boolean;
  /** Whether it starts running when uncontrolled. */
  defaultPlaying?: boolean;
  /** Fires when the button is pressed, and when the last step ends without `loop`. */
  onPlayingChange?: (playing: boolean) => void;
  /** Milliseconds per step. 0 stops the timer so you drive `value` yourself. */
  duration?: number;
  /** Wrap to the first step instead of stopping. The replay button never appears. */
  loop?: boolean;
  /** Fires when the last step finishes — on every pass when looping. */
  onComplete?: () => void;
  /** Height of the track and button in pixels; everything else is a ratio of it. */
  size?: number;
  /** Show the round play / pause / replay button. */
  showControl?: boolean;
  /** Which side of the track the button sits on. */
  controlPosition?: "start" | "end";
  /** Steps can be chosen by click, tap or keyboard. */
  seekable?: boolean;
  /** Accessible name of the track. */
  label?: string;
  /** Accessible names of the button in each state, for localisation. */
  controlLabels?: { play?: string; pause?: string; replay?: string };
}

function Replay() {
  return (
    <svg
      data-slot="step-player-replay"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="absolute -inset-[30%] size-[160%]"
    >
      <path
        d="M9.61 5.42A7 7 0 1 1 5.42 9.61"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path d="M6.6 6.52L9.28 2.77L11.06 7.66Z" fill="currentColor" />
    </svg>
  );
}

/** A stepped progress track that plays through its steps, with a play / pause / replay button. */
export function StepPlayer({
  className,
  style,
  track,
  steps = 5,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  duration = 3000,
  loop = false,
  onComplete,
  size = 32,
  showControl = true,
  controlPosition = "start",
  seekable = false,
  label = "Progress",
  controlLabels,
  ...props
}: StepPlayerProps) {
  const count = Array.isArray(steps)
    ? Math.max(1, steps.length)
    : Math.max(1, Math.floor(steps));
  const last = count - 1;
  const clampIndex = (index: number) => Math.min(last, Math.max(0, Math.round(index)));
  const durations = Array.from({ length: count }, (_, index) =>
    Math.max(0, (Array.isArray(steps) ? steps[index]?.duration : undefined) ?? duration),
  );

  const [uncontrolledValue, setUncontrolledValue] = useState(() => clampIndex(defaultValue));
  const value = clampIndex(valueProp ?? uncontrolledValue);
  const [uncontrolledPlaying, setUncontrolledPlaying] = useState(defaultPlaying);
  const playing = playingProp ?? uncontrolledPlaying;
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const replay = !loop && !playing && endedAt === value;
  const activeDuration = durations[value] ?? 0;
  const timerless = activeDuration <= 0;

  const indexRef = useRef(value);
  const elapsed = useRef(0);
  const ended = useRef<number | null>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const seekRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const latest = useRef({
    durations,
    loop,
    controlledValue: valueProp !== undefined,
    controlledPlaying: playingProp !== undefined,
    onValueChange,
    onPlayingChange,
    onComplete,
  });
  useEffect(() => {
    latest.current = {
      durations,
      loop,
      controlledValue: valueProp !== undefined,
      controlledPlaying: playingProp !== undefined,
      onValueChange,
      onPlayingChange,
      onComplete,
    };
  });

  const writeProgress = useCallback((index: number, progress: number) => {
    stepRefs.current[index]?.style.setProperty(
      "--sp-p",
      String(Math.min(1, Math.max(0, progress))),
    );
  }, []);

  const commitValue = useCallback((next: number) => {
    if (!latest.current.controlledValue) setUncontrolledValue(next);
    latest.current.onValueChange?.(next);
  }, []);

  const commitPlaying = useCallback((next: boolean) => {
    if (!latest.current.controlledPlaying) setUncontrolledPlaying(next);
    latest.current.onPlayingChange?.(next);
  }, []);

  const markEnded = useCallback((index: number | null) => {
    ended.current = index;
    setEndedAt(index);
  }, []);

  // A value set from outside restarts that step; one this component advanced
  // to has already been given its carried-over time.
  useLayoutEffect(() => {
    if (indexRef.current !== value) {
      indexRef.current = value;
      elapsed.current = 0;
    }
    writeProgress(value, activeDuration > 0 ? elapsed.current / activeDuration : 1);
  }, [value, activeDuration, writeProgress]);

  useEffect(() => {
    if (!playing || timerless || typeof requestAnimationFrame !== "function") return;
    let raf = 0;
    let before = performance.now();
    let first = true;

    const frame = (now: number) => {
      const config = latest.current;
      // Asked to play from the end: start over.
      if (first && ended.current !== null && ended.current === indexRef.current) {
        indexRef.current = 0;
        elapsed.current = 0;
        markEnded(null);
        commitValue(0);
      }
      first = false;

      const start = indexRef.current;
      let index = start;
      let time = elapsed.current + Math.min(1000, Math.max(0, now - before));
      before = now;
      let total = config.durations[index] ?? 0;
      let finished = false;

      while (total > 0 && time >= total) {
        writeProgress(index, 1);
        time -= total;
        if (index >= config.durations.length - 1) {
          config.onComplete?.();
          if (!config.loop) {
            time = total;
            finished = true;
            break;
          }
          index = 0;
        } else {
          index += 1;
        }
        total = config.durations[index] ?? 0;
        if (total <= 0) time = 0;
      }

      indexRef.current = index;
      elapsed.current = time;
      writeProgress(index, total > 0 ? time / total : 1);
      if (index !== start) commitValue(index);
      if (finished) {
        markEnded(index);
        commitPlaying(false);
        return;
      }
      if (total > 0) raf = requestAnimationFrame(frame);
    };

    // Time spent hidden is not played through.
    const onVisibility = () => {
      before = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, timerless, commitPlaying, commitValue, markEnded, writeProgress]);

  function seek(index: number) {
    const next = clampIndex(index);
    indexRef.current = next;
    elapsed.current = 0;
    markEnded(null);
    writeProgress(next, (durations[next] ?? 0) > 0 ? 0 : 1);
    if (next !== value) commitValue(next);
  }

  function handleControl() {
    if (replay) {
      indexRef.current = 0;
      elapsed.current = 0;
      markEnded(null);
      writeProgress(0, 0);
      commitValue(0);
      commitPlaying(true);
      return;
    }
    commitPlaying(!playing);
  }

  function handleStepKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const moves: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: 1,
      ArrowUp: -1,
    };
    let target: number | null = null;
    if (event.key in moves) target = clampIndex(index + (moves[event.key] ?? 0));
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === null) return;
    event.preventDefault();
    seek(target);
    seekRefs.current[target]?.focus();
  }

  const names = { play: "Play", pause: "Pause", replay: "Replay", ...controlLabels };
  const icon = replay ? "replay" : playing ? "pause" : "play";
  const stepLabel = (index: number) => {
    const own = Array.isArray(steps) ? steps[index]?.label : undefined;
    return `Step ${String(index + 1)} of ${String(count)}${own ? `: ${own}` : ""}`;
  };

  const stepItems = Array.from({ length: count }, (_, index) => {
    const state = index < value ? "complete" : index === value ? "active" : "upcoming";
    const x =
      `calc(${String(index)} * var(--sp-slot)` +
      (index > value ? " + var(--sp-bar) - var(--sp-dot))" : ")");
    const pill = (
      <span aria-hidden="true" data-slot="step-player-pill" className="bg-foreground/20">
        <span data-slot="step-player-fill" className="bg-foreground" />
      </span>
    );
    const place = {
      "data-slot": "step-player-step",
      "data-state": state,
      style: { "--sp-x": x } as CSSProperties,
      ref: (node: HTMLElement | null) => {
        stepRefs.current[index] = node;
      },
    };
    if (!seekable) {
      return (
        <span key={index} {...place}>
          {pill}
        </span>
      );
    }
    return (
      <li key={index} {...place}>
        {pill}
        <button
          ref={(node) => {
            seekRefs.current[index] = node;
          }}
          type="button"
          data-slot="step-player-seek"
          aria-label={stepLabel(index)}
          aria-current={index === value ? "step" : undefined}
          tabIndex={index === value ? 0 : -1}
          className={cn("cursor-pointer rounded-full", focusRing)}
          onClick={() => {
            seek(index);
          }}
          onKeyDown={(event) => {
            handleStepKeyDown(event, index);
          }}
        />
      </li>
    );
  });

  const trackClass = "rounded-full bg-[var(--sp-track)]";
  const trackNode = seekable ? (
    <ol data-slot="step-player-track" aria-label={label} className={trackClass}>
      {stepItems}
    </ol>
  ) : (
    <div
      data-slot="step-player-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={value + 1}
      aria-valuetext={stepLabel(value)}
      className={trackClass}
    >
      {stepItems}
    </div>
  );

  const control = showControl ? (
    <button
      type="button"
      data-slot="step-player-control"
      data-icon={icon}
      aria-label={names[icon]}
      className={cn(
        "grid size-[var(--sp-size)] shrink-0 cursor-pointer place-items-center rounded-full bg-foreground text-background",
        "transition-[scale,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
        "hover:bg-foreground/85 motion-safe:active:scale-95",
        focusRing,
      )}
      onClick={handleControl}
    >
      <span aria-hidden="true" className="relative size-[36%]">
        <span data-slot="step-player-glyph" data-part="a" />
        <span data-slot="step-player-glyph" data-part="b" />
        <Replay />
      </span>
    </button>
  ) : null;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="step-player"
        data-state={replay ? "ended" : playing ? "playing" : "paused"}
        data-seekable={seekable ? "" : undefined}
        className={cn(stepPlayerVariants({ track }), className)}
        style={
          {
            "--sp-size": `${String(Math.max(12, size))}px`,
            "--sp-count": count,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {controlPosition === "start" ? control : null}
        {trackNode}
        {controlPosition === "end" ? control : null}
      </div>
    </>
  );
}

export { stepPlayerVariants };
