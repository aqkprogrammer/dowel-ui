"use client";

// Ported from bencho Now playing (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A compact music mini-player that expands in place.
 *
 * Every part is absolutely placed, and each placement has a collapsed and an
 * expanded value; one CSS transition on all of them is the source's single
 * critically-damped spring. Positions use inset-inline-start, so the layout
 * mirrors in right-to-left pages.
 *
 * Added over the source, which lists them as missing: aria-expanded on the
 * open/close control, aria-pressed on Like, a real seek slider (arrows ±5s,
 * PageUp/PageDown ±30s, Home/End, pointer drag) that also takes Space for
 * play/pause, and focus rings throughout.
 *
 * It is a presentational player: it keeps time itself while uncontrolled, and
 * a consumer with a real <audio> element controls `playing` and `position`.
 */

const PREFIX = "dowel-now-playing";

const STYLES = `
@keyframes ${PREFIX}-beat{0%{transform:scale(1)}38%{transform:scale(1.34)}100%{transform:scale(1)}}
[data-slot=now-playing-like][aria-pressed=true] svg{animation:${PREFIX}-beat calc(340ms * var(--motion-scale,1)) cubic-bezier(.3,1.4,.5,1)}
[data-slot=now-playing-glyph] path{transition:d calc(320ms * var(--motion-scale,1)) cubic-bezier(.22,1,.36,1)}
`;

const nowPlayingVariants = cva(
  cn(
    "relative w-[16.25rem] max-w-full overflow-hidden bg-card/92 text-card-foreground backdrop-blur-[2px] backdrop-saturate-150",
    "transition-[height,border-radius] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
  ),
  {
    variants: {
      /** A hairline ring — the source's Stroke switch. */
      stroke: {
        true: "shadow-[inset_0_0_0_1px_var(--color-border)]",
        false: "",
      },
    },
    defaultVariants: { stroke: true },
  },
);

const morph =
  "absolute transition-[inset,width,height,border-radius,font-size,gap,opacity,translate] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]";

/** Collapsed → expanded geometry, in px. */
const GEOMETRY = {
  box: { height: [78, 189], radius: [20, 26] },
  art: { size: [40, 64], radius: [10, 16] },
  text: {
    start: [60, 84],
    width: [94, 126],
    height: [40, 64],
    title: [13, 15.5],
    by: [11, 12],
  },
  bar: { top: [65, 96] },
  ops: { x: [206, 130], y: [30, 156], gap: [5, 14], small: [24, 34], lead: [30, 46] },
} as const;

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, "0")}`;
}

const PLAY = ["M8 5L12 7.5L12 16.5L8 19Z", "M12 7.5L18 12L18 12L12 16.5Z"];
const PAUSE = ["M7 5L10.5 5L10.5 19L7 19Z", "M13.5 5L17 5L17 19L13.5 19Z"];

/** Play and pause share a path structure, so each half morphs into a bar. */
function PlayGlyph({ playing }: { playing: boolean }) {
  const paths = playing ? PAUSE : PLAY;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      data-slot="now-playing-glyph"
    >
      {paths.map((d, index) => (
        <path key={index} d={d} style={{ d: `path("${d}")` }} />
      ))}
    </svg>
  );
}

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const SKIP_BACK = "M19 20 9 12l10-8v16ZM5 19V5";
const SKIP_FORWARD = "m5 4 10 8-10 8V4ZM19 5v14";
const HEART =
  "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

/** A controlled-or-not value. */
function useValue<T>(prop: T | undefined, initial: T, onChange?: (value: T) => void) {
  const [inner, setInner] = useState(initial);
  const value = prop ?? inner;
  const set = (next: T) => {
    if (prop === undefined) setInner(next);
    onChange?.(next);
  };
  return [value, set, setInner] as const;
}

export interface NowPlayingProps
  extends
    Omit<ComponentPropsWithRef<"div">, "onChange">,
    VariantProps<typeof nowPlayingVariants> {
  /** The track's title. */
  track: string;
  /** The artist, album or side. */
  artist?: string;
  /** Album art: an image URL, or any node. Decorative unless `artworkAlt` is set. */
  artwork?: string | ReactNode;
  artworkAlt?: string;
  /** Track length in seconds. */
  duration?: number;
  position?: number;
  defaultPosition?: number;
  onPositionChange?: (seconds: number) => void;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  liked?: boolean;
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Restart: called after the position returns to 0. */
  onPrevious?: () => void;
  /** Next track. The position returns to 0. */
  onNext?: () => void;
  labels?: Partial<Record<"play" | "pause" | "previous" | "next" | "like" | "seek", string>>;
}

/** A mini music player that expands in place, with a seek slider and a morphing play button. */
export function NowPlaying({
  className,
  stroke,
  track,
  artist,
  artwork,
  artworkAlt = "",
  duration = 214,
  position: positionProp,
  defaultPosition = 0,
  onPositionChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  liked: likedProp,
  defaultLiked = false,
  onLikedChange,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  onPrevious,
  onNext,
  labels = {},
  style,
  ...props
}: NowPlayingProps) {
  const panelId = useId();
  const [expanded, setExpanded] = useValue(expandedProp, defaultExpanded, onExpandedChange);
  const [playing, setPlaying] = useValue(playingProp, defaultPlaying, onPlayingChange);
  const [liked, setLiked] = useValue(likedProp, defaultLiked, onLikedChange);
  const [rawPosition, setPosition, setInnerPosition] = useValue(
    positionProp,
    defaultPosition,
    onPositionChange,
  );
  const position = Math.min(duration, Math.max(0, rawPosition));
  const seeking = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Uncontrolled time keeps itself; a controlled player follows its <audio>.
  const ticking = playing && positionProp === undefined;
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => {
      setInnerPosition((current) => Math.min(duration, current + 1));
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [ticking, duration, setInnerPosition]);

  const at = (pair: readonly [number, number]) => pair[expanded ? 1 : 0];
  const progress = duration > 0 ? position / duration : 0;

  function seekTo(clientX: number) {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rtl = getComputedStyle(rail).direction === "rtl";
    const fraction = (rtl ? rect.right - clientX : clientX - rect.left) / rect.width;
    setPosition(Math.round(Math.min(1, Math.max(0, fraction)) * duration));
  }

  function handleSeekKey(event: KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const steps: Record<string, number> = {
      ArrowUp: 5,
      ArrowDown: -5,
      ArrowRight: rtl ? -5 : 5,
      ArrowLeft: rtl ? 5 : -5,
      PageUp: 30,
      PageDown: -30,
    };
    let next: number | null = null;
    if (event.key in steps) next = position + (steps[event.key] ?? 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    else if (event.key === " " || event.key === "k") {
      event.preventDefault();
      setPlaying(!playing);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setPosition(Math.min(duration, Math.max(0, next)));
  }

  const button = cn(
    "grid shrink-0 place-items-center rounded-full transition-[width,height,background-color,scale,opacity] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)] active:scale-90",
    "[&_svg]:size-[46%]",
    focusRing,
  );

  return (
    <div
      data-slot="now-playing"
      data-state={expanded ? "expanded" : "collapsed"}
      className={cn(nowPlayingVariants({ stroke }), className)}
      style={{
        height: at(GEOMETRY.box.height),
        borderRadius: at(GEOMETRY.box.radius),
        ...style,
      }}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>

      {/* The hit area: the whole card when collapsed, the header when expanded. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={artist ? `${track}, ${artist}` : track}
        data-slot="now-playing-toggle"
        className={cn(morph, "peer/toggle start-0 top-0 z-0 rounded-[inherit]", focusRing)}
        style={{
          width: expanded ? 84 + 126 : "100%",
          height: expanded ? 84 : "100%",
        }}
        onClick={() => {
          setExpanded(!expanded);
        }}
      />

      <div
        aria-hidden="true"
        data-slot="now-playing-art"
        className={cn(
          morph,
          "pointer-events-none start-2.5 top-2.5 overflow-hidden bg-linear-to-br from-muted to-secondary",
          "peer-active/toggle:scale-96",
        )}
        style={{
          width: at(GEOMETRY.art.size),
          height: at(GEOMETRY.art.size),
          borderRadius: at(GEOMETRY.art.radius),
        }}
      >
        {typeof artwork === "string" ? (
          <img src={artwork} alt="" className="size-full object-cover" />
        ) : (
          artwork
        )}
      </div>
      {artworkAlt ? <span className="sr-only">{artworkAlt}</span> : null}

      <div
        aria-hidden="true"
        data-slot="now-playing-text"
        className={cn(morph, "pointer-events-none top-2.5 flex flex-col justify-center")}
        style={{
          insetInlineStart: at(GEOMETRY.text.start),
          width: at(GEOMETRY.text.width),
          height: at(GEOMETRY.text.height),
        }}
      >
        <span
          className="truncate font-medium tracking-[-0.01em] transition-[font-size] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]"
          style={{ fontSize: at(GEOMETRY.text.title) }}
        >
          {track}
        </span>
        {artist ? (
          <span
            className="truncate text-muted-foreground transition-[font-size] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]"
            style={{ fontSize: at(GEOMETRY.text.by) }}
          >
            {artist}
          </span>
        ) : null}
      </div>

      <div id={panelId} data-slot="now-playing-panel">
        <button
          type="button"
          aria-pressed={liked}
          aria-label={labels.like ?? "Like"}
          tabIndex={expanded ? undefined : -1}
          aria-hidden={expanded ? undefined : true}
          data-slot="now-playing-like"
          className={cn(
            button,
            morph,
            "end-2.5 top-2.5 z-10 size-7.5 text-muted-foreground hover:bg-foreground/7 aria-pressed:text-foreground",
            !expanded && "pointer-events-none opacity-0",
          )}
          onClick={() => {
            setLiked(!liked);
          }}
        >
          <Icon d={HEART} filled={liked} />
        </button>

        <div
          className={cn(morph, "start-2.5 z-10 w-[15rem]")}
          style={{ top: at(GEOMETRY.bar.top) }}
        >
          <div
            ref={railRef}
            role="slider"
            tabIndex={expanded ? 0 : -1}
            aria-hidden={expanded ? undefined : true}
            aria-label={labels.seek ?? "Seek"}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={position}
            aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
            data-slot="now-playing-seek"
            className={cn(
              "-my-2 cursor-pointer touch-none rounded-sm py-2",
              !expanded && "pointer-events-none",
              focusRing,
            )}
            onKeyDown={handleSeekKey}
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
              seeking.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekTo(event.clientX);
            }}
            onPointerMove={(event) => {
              if (seeking.current === event.pointerId) seekTo(event.clientX);
            }}
            onPointerUp={() => {
              seeking.current = null;
            }}
          >
            <div className="h-[3px] overflow-hidden rounded-full bg-foreground/12">
              <div
                data-slot="now-playing-progress"
                className="h-full rounded-full bg-foreground"
                style={{ width: `${String(progress * 100)}%` }}
              />
            </div>
          </div>
          <div
            aria-hidden="true"
            data-slot="now-playing-clock"
            className={cn(
              "mt-1.5 flex justify-between text-[0.65625rem] tracking-[0.04em] text-muted-foreground tabular-nums",
              "transition-opacity duration-[var(--duration-slower)]",
              !expanded && "opacity-0",
            )}
          >
            <span>{formatTime(position)}</span>
            <span>−{formatTime(duration - position)}</span>
          </div>
        </div>

        <div
          data-slot="now-playing-transport"
          className={cn(
            morph,
            "z-10 flex -translate-x-1/2 -translate-y-1/2 items-center rtl:translate-x-1/2",
          )}
          style={{
            insetInlineStart: at(GEOMETRY.ops.x),
            top: at(GEOMETRY.ops.y),
            gap: at(GEOMETRY.ops.gap),
          }}
        >
          <button
            type="button"
            aria-label={labels.previous ?? "Restart"}
            className={cn(button, "text-muted-foreground hover:bg-foreground/7")}
            style={{ width: at(GEOMETRY.ops.small), height: at(GEOMETRY.ops.small) }}
            onClick={() => {
              setPosition(0);
              onPrevious?.();
            }}
          >
            <Icon d={SKIP_BACK} filled />
          </button>
          <button
            type="button"
            aria-label={playing ? (labels.pause ?? "Pause") : (labels.play ?? "Play")}
            data-slot="now-playing-play"
            className={cn(button, "bg-foreground text-background hover:opacity-88")}
            style={{ width: at(GEOMETRY.ops.lead), height: at(GEOMETRY.ops.lead) }}
            onClick={() => {
              setPlaying(!playing);
            }}
          >
            <PlayGlyph playing={playing} />
          </button>
          <button
            type="button"
            aria-label={labels.next ?? "Next"}
            className={cn(button, "text-muted-foreground hover:bg-foreground/7")}
            style={{ width: at(GEOMETRY.ops.small), height: at(GEOMETRY.ops.small) }}
            onClick={() => {
              setPosition(0);
              onNext?.();
            }}
          >
            <Icon d={SKIP_FORWARD} filled />
          </button>
        </div>
      </div>
    </div>
  );
}

export { nowPlayingVariants };
