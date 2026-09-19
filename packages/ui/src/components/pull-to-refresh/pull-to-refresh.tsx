"use client";

// Ported from bencho Pull to refresh (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  type AnimationPlaybackControls,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A sheet you pull down to refresh.
 *
 * `motion` earns its place here (ADR 0014) because the sheet springs to its
 * resting offset — and back to zero — carrying the velocity of the pull. The
 * pull itself writes two custom properties on the root, `--ptr-at` (offset px)
 * and `--ptr-p` (progress 0–1), and the dot ring above the sheet fades and
 * grows from them in CSS.
 *
 * Pulling is never the only way: the sheet is a focusable group where Enter
 * refreshes, and an optional visible button does the same. While refreshing,
 * the sheet is aria-busy and a polite live region says "Refreshing…" then
 * "Refreshed". The spinning ring is decoration and stops under reduced motion
 * (only allow-listed loaders may be indicators); the busy state and the
 * announcements are what report progress.
 */

const PREFIX = "dowel-pull-to-refresh";

/* Keyframes and [data-slot]/[data-phase] selectors only (the sheet is unlayered). */
const STYLES = `
@keyframes ${PREFIX}-spin{to{rotate:360deg}}
[data-slot=pull-to-refresh][data-phase=refreshing] [data-slot=pull-to-refresh-dots]{animation:${PREFIX}-spin calc(var(--ptr-period, 2400ms) * var(--motion-scale)) linear infinite}
`;

/** Pointer travel that decides whether a press is a pull. */
const SLOP = 4;
/** Ring radius for the dots (px). */
const RING = 15;

const REST_SPRING = { type: "spring" as const, stiffness: 380, damping: 16 };
const BACK_SPRING = { type: "spring" as const, stiffness: 260, damping: 22 };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Rubber-band resistance: near 1:1 for a short pull, 180px of travel gives about 156. */
export function rubberBand(distance: number) {
  return 600 * (1 - Math.exp(-Math.max(0, distance) / 600));
}

/** Spin (0–100) to the ring's period in ms: 2400 at 50, 4800 at 0, 1200 at 100. */
export function spinPeriod(spin: number) {
  return Math.round(2400 * 2 ** ((50 - Math.min(100, Math.max(0, spin))) / 50));
}

const pullToRefreshVariants = cva("relative isolate flex flex-col text-card-foreground", {
  variants: {
    /** `dark` renders the block with the dark token set whatever the page theme. */
    fill: {
      light: "",
      dark: "dark",
    },
  },
  defaultVariants: { fill: "light" },
});

type Phase = "idle" | "pulling" | "refreshing";

export interface PullToRefreshProps
  extends
    Omit<ComponentPropsWithRef<"div">, "onRefresh">,
    VariantProps<typeof pullToRefreshVariants> {
  /** Runs the refresh. The sheet stays in the refreshing state until a returned promise settles. */
  onRefresh?: () => Promise<unknown> | void;
  /** Controlled refreshing state. Leave undefined to let the promise drive it. */
  refreshing?: boolean;
  /** Pull distance (px) that arms the refresh; also the resting offset while refreshing. Default 58. */
  threshold?: number;
  /** Dots in the ring, 3–10. Default 6. */
  dots?: number;
  /** Ring rotation speed, 0–100 (2400ms per turn at 50). Default 50. */
  spin?: number;
  /** Sheet radius in px, 0–40. Default 26. */
  corner?: number;
  /** A 1px inset hairline on the sheet. */
  stroke?: boolean;
  disabled?: boolean;
  /** Shortest time the refreshing state shows, so a fast refresh still reads (ms). Default 600. */
  minDuration?: number;
  /** Names the sheet. Default "Refreshable content". */
  label?: string;
  /** Instructions linked to the sheet with aria-describedby. */
  hint?: string;
  /** Renders a visible Refresh button under the sheet. Default true. */
  showRefreshButton?: boolean;
  /** The refresh button's text. Default "Refresh". */
  refreshButtonLabel?: string;
  /** Announced when a refresh starts. Default "Refreshing…". */
  refreshingLabel?: string;
  /** Announced when a refresh ends. Default "Refreshed". */
  refreshedLabel?: string;
  children?: ReactNode;
}

/** Wraps content in a sheet that refreshes on a pull, Enter, or a button. */
export function PullToRefresh({
  className,
  style,
  fill,
  children,
  onRefresh,
  refreshing,
  threshold = 58,
  dots = 6,
  spin = 50,
  corner = 26,
  stroke = false,
  disabled = false,
  minDuration = 600,
  label = "Refreshable content",
  hint = "Pull down, or press Enter, to refresh.",
  showRefreshButton = true,
  refreshButtonLabel = "Refresh",
  refreshingLabel = "Refreshing…",
  refreshedLabel = "Refreshed",
  ...props
}: PullToRefreshProps) {
  const controlled = refreshing !== undefined;
  const [internal, setInternal] = useState(false);
  const busy = controlled ? refreshing : internal;
  const [pulling, setPulling] = useState(false);
  const [armed, setArmed] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const reduceMotion = usePrefersReducedMotion();
  const hintId = `${PREFIX}-${useId().replace(/:/g, "")}`;

  const sheet = useRef<HTMLDivElement>(null);
  const at = useMotionValue(0);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const press = useRef<{ id: number; x: number; y: number; pulling: boolean } | null>(null);
  const swallowClick = useRef(false);
  const running = useRef(false);
  const velocity = useRef(0);
  const mounted = useRef(false);
  const latest = useRef({ onRefresh, minDuration, reduceMotion, threshold, busy, controlled });
  useLayoutEffect(() => {
    latest.current = { onRefresh, minDuration, reduceMotion, threshold, busy, controlled };
  });

  // Announce each change of state, adjusting during render rather than in an effect.
  const [announced, setAnnounced] = useState(busy);
  if (announced !== busy) {
    setAnnounced(busy);
    setAnnouncement(busy ? refreshingLabel : refreshedLabel);
  }

  useMotionValueEvent(at, "change", (value) => {
    const root = sheet.current?.parentElement;
    if (!root) return;
    const progress = Math.min(1, Math.max(0, value / latest.current.threshold));
    root.style.setProperty("--ptr-at", `${String(value)}px`);
    root.style.setProperty("--ptr-p", String(progress));
  });

  /** Springs (or, under reduced motion, jumps) the sheet to `target`. */
  function settle(target: number, spring: typeof REST_SPRING, from = 0) {
    animation.current?.stop();
    animation.current = null;
    if (latest.current.reduceMotion) {
      at.set(target);
      return;
    }
    animation.current = animate(at, target, { ...spring, velocity: from });
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (busy) at.set(latest.current.threshold);
      return;
    }
    if (busy) settle(latest.current.threshold, REST_SPRING, velocity.current);
    else settle(0, BACK_SPRING);
    velocity.current = 0;
    // Only a change of state moves the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(
    () => () => {
      mounted.current = false;
      animation.current?.stop();
    },
    [],
  );

  async function refresh(from = 0) {
    if (disabled || running.current || latest.current.busy) return;
    running.current = true;
    velocity.current = from;
    const started = Date.now();
    if (!latest.current.controlled) setInternal(true);
    try {
      await latest.current.onRefresh?.();
    } catch {
      // A failed refresh still ends; reporting the error is the caller's job.
    }
    if (latest.current.controlled) {
      // A controlled sheet waits for `refreshing`; if it never turned on, settle back.
      if (!latest.current.busy) settle(0, BACK_SPRING);
    } else {
      const remaining = latest.current.minDuration - (Date.now() - started);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (mounted.current) setInternal(false);
    }
    running.current = false;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    swallowClick.current = false;
    if (disabled || busy || event.button !== 0) return;
    if (event.currentTarget.scrollTop > 0) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pulling: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    const dy = event.clientY - current.y;
    if (!current.pulling) {
      const dx = Math.abs(event.clientX - current.x);
      if (dy > SLOP && dy > dx) {
        current.pulling = true;
        current.y = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
        animation.current?.stop();
        setPulling(true);
      } else if (dy < -SLOP || dx > SLOP) {
        press.current = null;
      }
      return;
    }
    const offset = rubberBand(dy);
    at.set(offset);
    setArmed(offset >= threshold);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = null;
    if (!current.pulling) return;
    swallowClick.current = true;
    setPulling(false);
    setArmed(false);
    const from = at.getVelocity();
    if (event.type === "pointerup" && at.get() >= threshold) void refresh(from);
    else settle(0, BACK_SPRING, from);
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    // The click a pull leaves behind must not activate what it landed on.
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.target !== event.currentTarget || event.repeat) return;
    event.preventDefault();
    void refresh();
  }

  const phase: Phase = busy ? "refreshing" : pulling ? "pulling" : "idle";
  const count = Math.min(10, Math.max(3, Math.round(dots)));
  const rootStyle = {
    "--ptr-period": `${String(spinPeriod(spin))}ms`,
    ...style,
  } as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="pull-to-refresh"
        data-phase={phase}
        data-armed={armed || undefined}
        className={cn(pullToRefreshVariants({ fill }), className)}
        style={rootStyle}
        {...props}
      >
        <div
          aria-hidden="true"
          data-slot="pull-to-refresh-spinner"
          className="pointer-events-none absolute inset-x-0 mx-auto size-15"
          style={{
            top: `${String(threshold / 2 - 30)}px`,
            opacity: "var(--ptr-p, 0)",
            scale: "calc(0.82 + 0.18 * var(--ptr-p, 0))",
          }}
        >
          <span data-slot="pull-to-refresh-dots" className="absolute inset-0">
            {Array.from({ length: count }, (_, index) => (
              <span
                key={index}
                data-slot="pull-to-refresh-dot"
                className="absolute inset-0 m-auto size-1 rounded-full bg-foreground/35"
                style={{
                  transform: `rotate(${String((index * 360) / count)}deg) translateY(-${String(RING)}px)`,
                }}
              />
            ))}
          </span>
        </div>
        <motion.div
          ref={sheet}
          role="group"
          aria-label={label}
          aria-describedby={disabled ? undefined : hintId}
          aria-busy={busy || undefined}
          aria-disabled={disabled || undefined}
          tabIndex={0}
          data-slot="pull-to-refresh-sheet"
          className={cn(
            "relative z-10 min-h-0 flex-1 overflow-auto overscroll-contain bg-card",
            stroke && "ring-1 ring-border ring-inset",
            focusRing,
          )}
          style={{
            y: at,
            borderRadius: `${String(corner)}px`,
            touchAction: atTop ? "pan-x pan-down" : "pan-x pan-y",
          }}
          onScroll={(event) => setAtTop(event.currentTarget.scrollTop <= 0)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClickCapture={handleClickCapture}
          onKeyDown={handleKeyDown}
        >
          {children}
        </motion.div>
        {showRefreshButton ? (
          <Button
            variant="ghost"
            size="sm"
            data-slot="pull-to-refresh-button"
            className="mt-3 self-center"
            disabled={disabled}
            loading={busy}
            onClick={() => void refresh()}
          >
            {busy ? null : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            )}
            {refreshButtonLabel}
          </Button>
        ) : null}
        <span id={hintId} className="sr-only">
          {hint}
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    </MotionConfig>
  );
}

export { pullToRefreshVariants };
