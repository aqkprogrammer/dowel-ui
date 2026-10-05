"use client";

// Original design (pattern inspired by Animate UI Radial Intro; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  animate,
  MotionConfig,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * An intro for a group of people or pictures: a stack in the middle that
 * spins out into a ring.
 *
 * At rest before playing, the avatars sit stacked in the centre, each tipped
 * a few degrees so the pile reads as a pile. Playing, each one rides its own
 * spring along a spiral — its angle unwinding from 200° behind its seat while
 * its distance from the centre grows — so they fan out in a swirl rather than
 * flying in straight lines. The springs start on a stagger and overshoot a
 * little past the ring before settling, the stack straightening as it goes.
 * Positions are a fraction of the ring's own width (container query units),
 * so the ring works at any size without measuring.
 *
 * Once every avatar has landed, the ring can orbit slowly (`orbit`). The
 * avatars move around the circle but never rotate, so faces stay upright.
 * Hovering one pauses the orbit and lifts it with its name above it. A
 * moving thing that never stops needs a way to stop it (WCAG 2.2.2), so an
 * orbiting ring has a pause toggle; the orbit also rests while the ring is
 * off screen.
 *
 * It plays on mount, or the first time it scrolls into view
 * (`trigger="inView"`). To play it again, call `replay()` on the handle passed
 * as `handleRef`, or change the component's `key`.
 *
 * It is a list of images with alt text; the floating names are aria-hidden
 * duplicates of the alt. Under reduced motion it renders the finished ring and
 * does not orbit.
 */

const radialIntroVariants = cva(
  cn(
    "@container relative isolate size-(--radial-intro-size) shrink-0",
    "[--radial-intro-radius:38cqw]",
  ),
  {
    variants: {
      /** The ring's diameter and its avatars' size, in rem. */
      size: {
        sm: "[--radial-intro-avatar:2.5rem] [--radial-intro-size:14rem]",
        md: "[--radial-intro-avatar:3.25rem] [--radial-intro-size:19rem]",
        lg: "[--radial-intro-avatar:4rem] [--radial-intro-size:24rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** How far behind its seat each avatar starts its spiral, in degrees. */
const UNWIND = 200;
const SPREAD = { type: "spring", stiffness: 70, damping: 11, mass: 1 } as const;

const round = (value: number) => Math.round(value * 1e4) / 1e4 || 0;

/** The avatar's offset from the centre, as fractions of the radius. */
export function radialIntroOffset(
  seat: number,
  orbit: number,
  progress: number,
): { x: number; y: number } {
  const radians = ((seat + orbit - (1 - progress) * UNWIND) * Math.PI) / 180;
  return {
    x: round(Math.sin(radians) * progress),
    y: round(-Math.cos(radians) * progress),
  };
}

export interface RadialIntroItem {
  id: string;
  src: string;
  /** The image's alt text. Also shown as its name on hover. */
  alt: string;
}

export interface RadialIntroHandle {
  /** Stacks the avatars again and replays the spiral. */
  replay: () => void;
}

type Phase = "waiting" | "playing" | "settled";

export interface RadialIntroProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof radialIntroVariants> {
  items: RadialIntroItem[];
  /** `mount` plays at once; `inView` waits until the ring first scrolls into view. */
  trigger?: "mount" | "inView";
  /** After landing, rotate the ring slowly. Avatars stay upright. */
  orbit?: boolean;
  /** Seconds per orbit. */
  orbitDuration?: number;
  /** Milliseconds between one avatar setting off and the next. */
  stagger?: number;
  /** Receives `{ replay }`. */
  handleRef?: Ref<RadialIntroHandle>;
  /** The orbit pause toggle's accessible name. */
  pauseLabel?: string;
  /** Rendered in the centre of the ring, fading in once the avatars have spread. */
  children?: ReactNode;
  /** Called once every avatar has landed. */
  onSettled?: () => void;
}

interface AvatarProps {
  item: RadialIntroItem;
  index: number;
  count: number;
  run: number;
  playing: boolean;
  reduced: boolean;
  stagger: number;
  orbit: MotionValue<number>;
  onLanded: (run: number) => void;
  onHover: (hovered: boolean) => void;
}

function Avatar({
  item,
  index,
  count,
  run,
  playing,
  reduced,
  stagger,
  orbit,
  onLanded,
  onHover,
}: AvatarProps) {
  const seat = (index * 360) / Math.max(1, count);
  const progress = useMotionValue(reduced ? 1 : 0);
  const tip = (index % 2 === 0 ? -1 : 1) * (4 + (index % 3) * 3);

  const x = useTransform(
    [progress, orbit] as MotionValue<number>[],
    ([p = 0, o = 0]: number[]) =>
      `calc(var(--radial-intro-radius) * ${String(radialIntroOffset(seat, o, p).x)})`,
  );
  const y = useTransform(
    [progress, orbit] as MotionValue<number>[],
    ([p = 0, o = 0]: number[]) =>
      `calc(var(--radial-intro-radius) * ${String(radialIntroOffset(seat, o, p).y)})`,
  );
  const rotate = useTransform(progress, (p) => round(tip * Math.max(0, 1 - p)));
  const scale = useTransform(progress, (p) => round(0.82 + 0.18 * Math.min(1, Math.max(0, p))));

  useEffect(() => {
    if (!playing) {
      progress.jump(0);
      return;
    }
    if (reduced) {
      progress.jump(1);
      onLanded(run);
      return;
    }
    progress.jump(0);
    const spreading = animate(progress, 1, {
      ...SPREAD,
      delay: (index * stagger) / 1000,
      onComplete: () => {
        onLanded(run);
      },
    });
    return () => {
      spreading.stop();
    };
  }, [playing, reduced, run, index, stagger, progress, onLanded]);

  return (
    <motion.li
      data-slot="radial-intro-item"
      className="group/radial-intro absolute inset-0 m-auto size-(--radial-intro-avatar) hover:z-10"
      style={{ x, y, rotate, scale }}
      onPointerEnter={() => {
        onHover(true);
      }}
      onPointerLeave={() => {
        onHover(false);
      }}
    >
      <motion.div
        className="relative size-full"
        whileHover={{ scale: 1.18, y: -6 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
      >
        <img
          src={item.src}
          alt={item.alt}
          draggable={false}
          data-slot="radial-intro-image"
          className={cn(
            "size-full rounded-full border-2 border-background bg-muted object-cover shadow-md",
            "transition-shadow duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            "group-hover/radial-intro:shadow-[0_0.75rem_1.5rem_color-mix(in_oklab,var(--color-foreground)_22%,transparent)]",
          )}
        />
        <span
          aria-hidden="true"
          data-slot="radial-intro-label"
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 rounded-md px-2 py-1",
            "bg-popover text-xs font-medium text-popover-foreground shadow-md",
            "translate-y-1 scale-90 opacity-0 transition-[opacity,translate,scale] duration-[var(--duration-fast)] ease-[var(--ease-overshoot)]",
            "group-hover/radial-intro:translate-y-0 group-hover/radial-intro:scale-100 group-hover/radial-intro:opacity-100",
          )}
        >
          {item.alt}
        </span>
      </motion.div>
    </motion.li>
  );
}

function PauseIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {paused ? <path d="M8 5.5v13l10-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
    </svg>
  );
}

/** An intro that spins a stack of avatars out into a ring, then lets the ring orbit. */
export function RadialIntro({
  className,
  size,
  items,
  trigger = "mount",
  orbit: orbitEnabled = true,
  orbitDuration = 40,
  stagger = 80,
  handleRef,
  pauseLabel = "Pause rotation",
  children,
  onSettled,
  ref,
  ...props
}: RadialIntroProps) {
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(trigger === "mount");
  const [started, setStarted] = useState(trigger === "mount");
  const [run, setRun] = useState(0);
  const [landed, setLanded] = useState({ run: 0, count: 0 });
  const [hovered, setHovered] = useState(0);
  const [paused, setPaused] = useState(false);
  const orbit = useMotionValue(0);

  const settled =
    started && (items.length === 0 || (landed.run === run && landed.count >= items.length));
  const phase: Phase = !started ? "waiting" : settled ? "settled" : "playing";

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );

  // Watches visibility: to start an `inView` intro, and to rest the orbit off screen.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver !== "function") {
      setInView(true);
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      setInView(visible);
      if (visible) setStarted(true);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const onLanded = useCallback((at: number) => {
    setLanded((current) =>
      current.run === at ? { run: at, count: current.count + 1 } : { run: at, count: 1 },
    );
  }, []);

  const onHover = useCallback((on: boolean) => {
    setHovered((current) => Math.max(0, current + (on ? 1 : -1)));
  }, []);

  const latestSettled = useRef(onSettled);
  useEffect(() => {
    latestSettled.current = onSettled;
  });
  useEffect(() => {
    if (settled) latestSettled.current?.();
  }, [settled, run]);

  useImperativeHandle(
    handleRef,
    () => ({
      replay: () => {
        orbit.jump(0);
        setStarted(true);
        setRun((current) => current + 1);
      },
    }),
    [orbit],
  );

  const orbiting = orbitEnabled && !reduced && items.length > 1;
  const turning = orbiting && settled && inView && hovered === 0 && !paused;
  const degreesPerMs = 360 / (Math.max(1, orbitDuration) * 1000);
  useAnimationFrame((_, delta) => {
    if (turning) orbit.set((orbit.get() + delta * degreesPerMs) % 360);
  });

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={setRoot}
        data-slot="radial-intro"
        data-state={phase}
        className={cn(radialIntroVariants({ size }), className)}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="radial-intro-track"
          data-state={phase}
          className={cn(
            "pointer-events-none absolute inset-[12%] rounded-full border border-dashed border-border",
            "scale-50 opacity-0 transition-[opacity,scale] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
            "data-[state=playing]:scale-100 data-[state=playing]:opacity-100 data-[state=settled]:scale-100 data-[state=settled]:opacity-100",
          )}
        />
        {children !== undefined ? (
          <motion.div
            data-slot="radial-intro-center"
            className="absolute inset-[24%] grid place-items-center text-center"
            initial={false}
            animate={
              phase === "settled" || reduced
                ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                : { opacity: 0, scale: 0.9, filter: "blur(6px)" }
            }
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            {children}
          </motion.div>
        ) : null}
        <ul data-slot="radial-intro-list" className="absolute inset-0">
          {items.map((item, index) => (
            <Avatar
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              run={run}
              playing={started}
              reduced={reduced}
              stagger={stagger}
              orbit={orbit}
              onLanded={onLanded}
              onHover={onHover}
            />
          ))}
        </ul>
        {orbiting ? (
          <button
            type="button"
            data-slot="radial-intro-pause"
            aria-label={pauseLabel}
            aria-pressed={paused}
            className={cn(
              "absolute end-0 bottom-0 grid size-8 place-items-center rounded-full",
              "border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm",
              "transition-[color,background-color,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
              "hover:bg-accent hover:text-accent-foreground motion-safe:active:scale-95 [&_svg]:size-3.5",
              focusRing,
            )}
            onClick={() => {
              setPaused((current) => !current);
            }}
          >
            <PauseIcon paused={paused} />
          </button>
        ) : null}
      </div>
    </MotionConfig>
  );
}

export { radialIntroVariants };
