"use client";

// Original design.
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A compact now-playing card.
 *
 * Changing track is the moment it is built around: the new artwork fades and
 * settles over the old one (a crossfade, with the old layer left underneath
 * until the new one is opaque), and the title and artist slide in from below
 * for "next" or from above for "previous". Both are keyframes replayed by
 * keying the layer on the track, and neither plays on first paint. While
 * playing, a four-bar equaliser bounces beside the title; paused, it freezes
 * where it is. Every duration runs through --motion-scale, and under reduced
 * motion the global rule lands each change at once and stops the equaliser.
 *
 * Progress is real time, not animation: uncontrolled, a quarter-second timer
 * advances the position while playing and moves to the next track at the end
 * of each one, so it is unaffected by reduced motion. Pass `progress` (0–1) to
 * drive it from a real audio element instead.
 *
 * It is a group named "Music player". Previous, Play/Pause and Next are real
 * buttons with names (Play becomes Pause rather than toggling a pressed state,
 * which is how media players are announced). Position is a progressbar with a
 * "0:42 of 3:10" value text. Track changes are announced once in a polite
 * live region; the position is never announced. The progress bar and controls
 * keep `direction: ltr` — a timeline and transport controls do not mirror in
 * right-to-left layouts — while the title and artist follow the page.
 */

const PREFIX = "dowel-mini-player";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const FROM = "--mini-player-from";
const BAR = "--mini-player-bar";

const STYLES = `
@keyframes ${PREFIX}-art{from{opacity:0;scale:1.08;filter:blur(4px)}to{opacity:1;scale:1;filter:blur(0)}}
@keyframes ${PREFIX}-text{from{opacity:0;translate:0 var(${FROM})}to{opacity:1;translate:0 0}}
@keyframes ${PREFIX}-eq{0%,100%{scale:1 .3}50%{scale:1 1}}
[data-slot=mini-player-art-layer][data-animate]{animation:${PREFIX}-art ${scaled(420)} var(--ease-out-quint) both}
[data-slot=mini-player-text][data-animate]{animation:${PREFIX}-text ${scaled(380)} var(--ease-out-quint) both}
[data-slot=mini-player-eq] span{transform-origin:bottom;animation:${PREFIX}-eq ${scaled(900)} ease-in-out var(${BAR}) infinite;animation-play-state:paused}
[data-slot=mini-player-eq][data-playing] span{animation-play-state:running}
`;

const TICK = 250;

export interface MiniPlayerTrack {
  title: string;
  artist: string;
  /** Cover art: an <img>, or anything else. A placeholder pattern stands in when omitted. */
  artwork?: ReactNode;
  /** Length in seconds, for the uncontrolled clock and the progress value text. */
  duration?: number;
}

export interface MiniPlayerProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  tracks: MiniPlayerTrack[];
  /** Controlled track index. */
  index?: number;
  /** Initial track index when uncontrolled. */
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Controlled playing state. */
  playing?: boolean;
  /** Initial playing state when uncontrolled. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Controlled position in the current track, 0–1. Omit it and the card keeps its own clock. */
  progress?: number;
  /** Wrap from the last track to the first, and back. */
  loop?: boolean;
  /** The group's accessible name. */
  label?: string;
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, "0")}`;
}

/** A placeholder cover: a soft glow for even tracks, fine stripes for odd ones. */
function placeholder(index: number): CSSProperties {
  return index % 2 === 0
    ? {
        backgroundImage:
          "radial-gradient(circle at 30% 25%, color-mix(in oklab, var(--color-foreground) 75%, transparent), " +
          "color-mix(in oklab, var(--color-foreground) 18%, transparent) 75%)",
      }
    : {
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--color-foreground) 55%, transparent) 0 3px, " +
          "transparent 3px 7px)",
      };
}

const iconButton = cn(
  "grid shrink-0 place-items-center rounded-full text-muted-foreground",
  "transition-[color,background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "hover:text-foreground motion-safe:active:scale-90",
  "disabled:pointer-events-none disabled:opacity-40",
  focusRing,
);

/** A compact music card with crossfading artwork, sliding titles, an equaliser, progress and transport controls. */
export function MiniPlayer({
  className,
  tracks,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  progress,
  loop = true,
  label = "Music player",
  ...props
}: MiniPlayerProps) {
  const count = tracks.length;
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultIndex);
  const index = Math.min(Math.max(0, indexProp ?? uncontrolledIndex), Math.max(0, count - 1));
  const [uncontrolledPlaying, setUncontrolledPlaying] = useState(defaultPlaying);
  const playing = playingProp ?? uncontrolledPlaying;
  const track = tracks[index];
  const duration = track?.duration ?? 180;

  // Track changes, derived during render so a controlled change animates too.
  const [shown, setShown] = useState(index);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [elapsed, setElapsed] = useState(0);
  if (shown !== index) {
    // Forward unless it stepped back, counting the wrap from first to last.
    const back = index === shown - 1 || (shown === 0 && index === count - 1 && count > 2);
    setDirection(back ? -1 : 1);
    setOutgoing(shown);
    setShown(index);
    setElapsed(0);
  }

  const canPrevious = loop || index > 0;
  const canNext = loop || index < count - 1;

  function goTo(next: number) {
    const wrapped = ((next % count) + count) % count;
    if (indexProp === undefined) setUncontrolledIndex(wrapped);
    onIndexChange?.(wrapped);
  }

  function setPlaying(next: boolean) {
    if (playingProp === undefined) setUncontrolledPlaying(next);
    onPlayingChange?.(next);
  }

  // The clock's view of the latest props, refreshed after every render so the
  // interval never acts on a stale track.
  const latest = useRef({ duration, index, canNext, goTo, setPlaying });
  useEffect(() => {
    latest.current = { duration, index, canNext, goTo, setPlaying };
  });

  // The clock itself lives in a ref, so ticks that land between renders still
  // add up; the state is only its display. `ended` stops it at the end of a
  // track until the track changes.
  const clock = useRef({ index, elapsed: 0, ended: false });
  const clocked = progress === undefined;
  useEffect(() => {
    if (!playing || !clocked || count === 0) return;
    const timer = setInterval(() => {
      const current = latest.current;
      const time = clock.current;
      if (time.index !== current.index)
        clock.current = { index: current.index, elapsed: 0, ended: false };
      if (clock.current.ended) return;
      clock.current.elapsed += TICK / 1000;
      if (clock.current.elapsed < current.duration) {
        setElapsed(clock.current.elapsed);
        return;
      }
      // The end of a track: on to the next, or stop at the last.
      clock.current.elapsed = current.duration;
      clock.current.ended = true;
      setElapsed(current.duration);
      if (current.canNext) current.goTo(current.index + 1);
      else current.setPlaying(false);
    }, TICK);
    return () => clearInterval(timer);
  }, [playing, clocked, count]);

  const position = clocked
    ? Math.min(1, elapsed / duration)
    : Math.min(1, Math.max(0, progress));
  const animate = outgoing !== null;
  const announcement = animate && track ? `Now playing: ${track.title} by ${track.artist}` : "";

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="mini-player"
      data-playing={playing || undefined}
      className={cn(
        "flex w-72 flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 text-card-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          data-slot="mini-player-art"
          className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted"
        >
          {outgoing !== null && tracks[outgoing] ? (
            <div
              key={`out-${String(outgoing)}`}
              className="absolute inset-0 bg-muted"
              style={tracks[outgoing].artwork ? undefined : placeholder(outgoing)}
            >
              {tracks[outgoing].artwork}
            </div>
          ) : null}
          <div
            key={index}
            data-slot="mini-player-art-layer"
            data-animate={animate || undefined}
            className="absolute inset-0 bg-muted [&>img]:size-full [&>img]:object-cover"
            style={track?.artwork ? undefined : placeholder(index)}
          >
            {track?.artwork}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            key={index}
            data-slot="mini-player-text"
            data-animate={animate || undefined}
            style={{ [FROM]: direction === 1 ? "60%" : "-60%" } as CSSProperties}
          >
            <p className="truncate text-sm font-semibold text-foreground">{track?.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track?.artist}</p>
          </div>
        </div>
        <span
          aria-hidden="true"
          data-slot="mini-player-eq"
          data-playing={playing || undefined}
          className="flex h-3.5 shrink-0 items-end gap-[2px] self-start pt-1"
        >
          {[-150, -450, -750, -300].map((delay) => (
            <span
              key={delay}
              className="block h-full w-[2.5px] rounded-full bg-foreground"
              style={{ [BAR]: scaled(delay) } as CSSProperties}
            />
          ))}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        aria-valuetext={`${formatTime(position * duration)} of ${formatTime(duration)}`}
        data-slot="mini-player-progress"
        // A timeline runs left to right in every language.
        dir="ltr"
        className="h-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full origin-left rounded-full bg-foreground",
            animate && position === 0
              ? ""
              : "transition-[scale] duration-[calc(250ms*var(--motion-scale,1))] ease-linear",
          )}
          style={{ scale: `${String(position)} 1` }}
        />
      </div>
      {/* Transport controls keep their order in right-to-left layouts, as media players do. */}
      <div dir="ltr" className="flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="Previous track"
          disabled={!canPrevious || count < 2}
          className={cn(iconButton, "size-8 [&_svg]:size-3.5")}
          onClick={() => goTo(index - 1)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 5h2.5v14H5zM19.5 5.5v13L9 12z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          data-slot="mini-player-play"
          className={cn(
            iconButton,
            "size-9 bg-foreground text-background hover:text-background [&_svg]:size-4",
          )}
          onClick={() => {
            // Playing again from the end of the last track starts it over.
            if (!playing && clocked && clock.current.ended) {
              clock.current = { index, elapsed: 0, ended: false };
              setElapsed(0);
            }
            setPlaying(!playing);
          }}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          aria-label="Next track"
          disabled={!canNext || count < 2}
          className={cn(iconButton, "size-8 [&_svg]:size-3.5")}
          onClick={() => goTo(index + 1)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.5 5H19v14h-2.5zM4.5 5.5v13L15 12z" />
          </svg>
        </button>
      </div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
