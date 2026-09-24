"use client";

// Original design (pattern inspired by Rare UI Gravity Letters; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  awakeCount,
  contain,
  createBody,
  createWorld,
  GLYPH_RADIUS,
  placeFree,
  settle,
  step,
  wakeAll,
  type GravityBody,
  type GravityWorld,
} from "./gravity-field-physics";

/*
 * A box you drop glyphs into. Click or tap drops one at the pointer; holding
 * pours a stream that follows the pointer. Glyphs fall, tumble, bounce softly
 * and pile up into hills (the physics is in gravity-field-physics.ts).
 *
 * Rendering
 *
 * Each glyph is a DOM element, so `items` can be any ReactNode — emoji, an
 * icon, a component. React renders the list once per drop; the positions never
 * go through React. One requestAnimationFrame loop steps the world and writes
 * each moving glyph's `transform` directly, and it stops the moment every
 * glyph is asleep, so a settled field costs nothing. The loop also pauses while
 * the field is off-screen or the tab is hidden.
 *
 * Reduced motion
 *
 * The world is settled synchronously instead of animated: a dropped glyph
 * appears where it would have come to rest, and the oldest glyph past
 * `maxGlyphs` is removed rather than faded. Device tilt is ignored.
 *
 * Tilt
 *
 * With `deviceTilt`, gravity follows the device: the true projection of
 * gravity onto the screen (from beta and gamma, rotated for the screen's
 * orientation), always at full strength, so tilting a phone spills the pile
 * toward the low side. Where the platform gates motion sensors behind a
 * permission prompt, it is requested on the first tap or key press — a user
 * gesture is required to ask.
 *
 * Accessibility
 *
 * The field is a single button: its action is "drop a glyph", and Enter or
 * Space does that at the centre (holding the key pours, through key repeat).
 * Every glyph is decorative and aria-hidden, and nothing is announced.
 * `touch-action: pan-y` keeps a vertical swipe scrolling the page.
 */

const PREFIX = "dowel-gravity-field";

// Positions are physical pixels from the top-left, so the glyph origin is too.
const STYLES = `
[data-slot=gravity-field-glyph]{position:absolute;top:0;left:0;display:grid;place-items:center;line-height:1;will-change:transform;pointer-events:none}
[data-slot=gravity-field-glyph]>img,[data-slot=gravity-field-glyph]>svg{width:88%;height:88%;object-fit:contain}
`;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
/** Glyphs a second while pouring, and how long a press is held before it pours. */
const POUR_RATE = 14;
const POUR_DELAY = 0.2;
const FADE_SECONDS = 0.4;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const gravityFieldVariants = cva(
  cn(
    "relative isolate block h-72 w-full cursor-crosshair touch-pan-y overflow-hidden rounded-xl font-semibold text-foreground select-none [-webkit-touch-callout:none]",
    focusRing,
  ),
  {
    variants: {
      /** The box behind the glyphs. */
      surface: {
        muted: "bg-muted/60",
        outline: "border border-border",
        plain: "",
      },
    },
    defaultVariants: { surface: "muted" },
  },
);

export type GravityFieldPool = "letters" | "numbers" | "both";

export interface GravityFieldHandle {
  /** Drops one glyph, at a point in the field (pixels from its top-left) or at its centre. */
  drop: (point?: { x: number; y: number }) => void;
  /** Removes every glyph. */
  clear: () => void;
}

interface GlyphRecord {
  id: number;
  content: ReactNode;
  box: number;
}

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function place(element: HTMLElement, body: GravityBody, box: number) {
  const half = box / 2;
  element.style.transform =
    `translate3d(${String(Math.round((body.x - half) * 10) / 10)}px, ` +
    `${String(Math.round((body.y - half) * 10) / 10)}px, 0) ` +
    `rotate(${String(Math.round(body.angle * 1000) / 1000)}rad)`;
}

/**
 * Gravity as a unit vector on the screen, from device orientation: the
 * projection of "down" onto the display, rotated for the screen's orientation.
 * Null when the device is too close to flat for the direction to mean much.
 */
export function tiltToGravity(
  beta: number,
  gamma: number,
  screenAngle = 0,
): { x: number; y: number } | null {
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  const dx = Math.cos(b) * Math.sin(g);
  const dy = Math.sin(b);
  const angle = ((screenAngle % 360) + 360) % 360;
  const [x, y] =
    angle === 90
      ? [dy, -dx]
      : angle === 180
        ? [-dx, -dy]
        : angle === 270
          ? [-dy, dx]
          : [dx, dy];
  const length = Math.hypot(x, y);
  return length < 0.15 ? null : { x: x / length, y: y / length };
}

const Glyph = memo(function Glyph({
  record,
  register,
}: {
  record: GlyphRecord;
  register: (id: number, element: HTMLSpanElement | null) => void;
}) {
  return (
    <span
      ref={(element) => {
        register(record.id, element);
        return () => {
          register(record.id, null);
        };
      }}
      data-slot="gravity-field-glyph"
      style={{ width: record.box, height: record.box, fontSize: record.box * 0.86 }}
    >
      {record.content}
    </span>
  );
});

export interface GravityFieldProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof gravityFieldVariants> {
  /** Which characters drop: A–Z, 0–9, or both. Ignored when `items` is set. */
  pool?: GravityFieldPool;
  /** Your own drop pool — emoji, icons, any node. Each drop picks one at random. */
  items?: ReactNode[];
  /** Downward acceleration in px/s². Lower is floatier. */
  gravity?: number;
  /** Base glyph size in pixels; each drop varies around it by ±15%. */
  size?: number;
  /** Glyphs kept in the field. Past it the oldest fade out. Unlimited by default. */
  maxGlyphs?: number;
  /** Let a phone's tilt steer gravity, asking for sensor permission on first tap where required. */
  deviceTilt?: boolean;
  /** Accessible name of the field, which is a button. */
  label?: string;
  /** Imperative `drop()` and `clear()`. */
  handleRef?: Ref<GravityFieldHandle>;
}

/** A box where clicking drops letters that fall, tumble and pile up under gravity. */
export function GravityField({
  className,
  surface,
  pool = "letters",
  items,
  gravity = 2000,
  size = 36,
  maxGlyphs = Infinity,
  deviceTilt = false,
  label = "Drop a glyph",
  handleRef,
  children,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  ...props
}: GravityFieldProps) {
  const reduced = usePrefersReducedMotion();
  const [glyphs, setGlyphs] = useState<GlyphRecord[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<GravityWorld>(createWorld(0, 0, gravity));
  const elements = useRef(new Map<number, HTMLElement>());
  const boxes = useRef(new Map<number, number>());
  const fading = useRef(new Map<number, number>());
  const nextId = useRef(1);
  const clock = useRef(0);
  const pour = useRef<{ pointer: number; x: number; y: number; held: number } | null>(null);
  const loop = useRef({ raf: 0, last: null as number | null, onScreen: true });
  const askPermission = useRef<(() => void) | null>(null);
  const settings = useRef({ reduced, pool, items, size, maxGlyphs, gravity });
  const direction = useRef({ x: 0, y: 1 });
  // The loop and the pour call back into these; each is kept current below.
  const tickRef = useRef<(now: number) => void>(() => {});
  const dropRef = useRef<(x: number, y: number) => void>(() => {});

  useEffect(() => {
    settings.current = { reduced, pool, items, size, maxGlyphs, gravity };
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const measure = useCallback(() => {
    const world = worldRef.current;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    world.width = rect.width;
    world.height = rect.height;
  }, []);

  const register = useCallback((id: number, element: HTMLSpanElement | null) => {
    if (!element) {
      elements.current.delete(id);
      return;
    }
    elements.current.set(id, element);
    const body = worldRef.current.bodies.find((candidate) => candidate.id === id);
    if (body) place(element, body, boxes.current.get(id) ?? 0);
  }, []);

  const drawAll = useCallback(() => {
    for (const body of worldRef.current.bodies) {
      const element = elements.current.get(body.id);
      if (element) place(element, body, boxes.current.get(body.id) ?? 0);
    }
  }, []);

  const remove = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      const gone = new Set(ids);
      const world = worldRef.current;
      world.bodies = world.bodies.filter((body) => !gone.has(body.id));
      for (const id of ids) {
        fading.current.delete(id);
        boxes.current.delete(id);
      }
      setGlyphs((current) => current.filter((glyph) => !gone.has(glyph.id)));
      // The pile settles into the gap.
      wakeAll(world);
      if (settings.current.reduced) {
        settle(world);
        drawAll();
      }
    },
    [drawAll],
  );

  const request = useCallback(() => {
    const state = loop.current;
    if (state.raf || typeof requestAnimationFrame !== "function") return;
    state.raf = requestAnimationFrame((now) => {
      tickRef.current(now);
    });
  }, []);

  const tick = useCallback(
    (now: number) => {
      const state = loop.current;
      state.raf = 0;
      if (!state.onScreen || document.hidden) {
        state.last = null;
        return;
      }
      const dt = state.last === null ? 1 / 60 : Math.min((now - state.last) / 1000, 1 / 20);
      state.last = now;
      clock.current += dt;
      const world = worldRef.current;

      const stream = pour.current;
      if (stream) {
        stream.held += dt;
        while (stream.held >= POUR_DELAY + 1 / POUR_RATE) {
          stream.held -= 1 / POUR_RATE;
          dropRef.current(stream.x + (Math.random() - 0.5) * 6, stream.y);
        }
      }

      const moving = world.bodies.filter((body) => !body.asleep);
      if (!settings.current.reduced) step(world, dt);
      for (const body of moving) {
        const element = elements.current.get(body.id);
        if (element) place(element, body, boxes.current.get(body.id) ?? 0);
      }

      const done: number[] = [];
      for (const [id, start] of fading.current) {
        const progress = (clock.current - start) / FADE_SECONDS;
        const element = elements.current.get(id);
        if (element) element.style.opacity = String(Math.max(0, 1 - progress));
        if (progress >= 1) done.push(id);
      }
      remove(done);

      if (awakeCount(world) > 0 || fading.current.size > 0 || pour.current) request();
      else state.last = null;
    },
    [remove, request],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const drop = useCallback(
    (x: number, y: number) => {
      const world = worldRef.current;
      if (world.width === 0 || world.height === 0) measure();
      const {
        reduced: still,
        pool: from,
        items: own,
        size: base,
        maxGlyphs: cap,
      } = settings.current;
      const source = own && own.length > 0 ? own : null;
      const characters =
        from === "numbers" ? DIGITS : from === "both" ? LETTERS + DIGITS : LETTERS;
      const content = source
        ? source[Math.floor(Math.random() * source.length)]
        : characters[Math.floor(Math.random() * characters.length)];
      const box = Math.max(4, base * (0.85 + Math.random() * 0.3));
      const id = nextId.current;
      nextId.current += 1;
      const body = createBody(id, x, y, box * GLYPH_RADIUS, {
        vx: (Math.random() - 0.5) * 80,
        spin: (Math.random() - 0.5) * 9,
      });
      body.angle = (Math.random() - 0.5) * 0.5;
      placeFree(world, body);
      world.bodies.push(body);
      boxes.current.set(id, box);
      if (still) settle(world);
      setGlyphs((current) => [...current, { id, content, box }]);

      const alive = world.bodies.filter((candidate) => !fading.current.has(candidate.id));
      const excess = alive.length - Math.max(0, cap);
      if (excess > 0) {
        const oldest = alive.slice(0, excess).map((candidate) => candidate.id);
        if (still) remove(oldest);
        else for (const old of oldest) fading.current.set(old, clock.current);
      }
      request();
    },
    [measure, remove, request],
  );

  useEffect(() => {
    dropRef.current = drop;
  }, [drop]);

  const dropAtCentre = useCallback(() => {
    const world = worldRef.current;
    if (world.width === 0 || world.height === 0) measure();
    drop(world.width / 2 + (Math.random() - 0.5) * 16, world.height / 2);
  }, [drop, measure]);

  useImperativeHandle(
    handleRef,
    () => ({
      drop: (point) => {
        if (point) drop(point.x, point.y);
        else dropAtCentre();
      },
      clear: () => {
        worldRef.current.bodies = [];
        fading.current.clear();
        boxes.current.clear();
        setGlyphs([]);
      },
    }),
    [drop, dropAtCentre],
  );

  // Size, visibility and the loop's lifetime.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const state = loop.current;
    const world = worldRef.current;
    measure();

    const resize = new ResizeObserver(() => {
      measure();
      for (const body of world.bodies) contain(world, body);
      wakeAll(world);
      if (settings.current.reduced) settle(world);
      drawAll();
      request();
    });
    resize.observe(root);

    let intersection: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "function") {
      intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) state.onScreen = entry.isIntersecting;
        request();
      });
      intersection.observe(root);
    }
    const onVisibility = () => {
      state.last = null;
      request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.last = null;
      resize.disconnect();
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [drawAll, measure, request]);

  // Gravity: the prop's strength, in the device's direction when tilting.
  useEffect(() => {
    const world = worldRef.current;
    world.gx = direction.current.x * gravity;
    world.gy = direction.current.y * gravity;
    wakeAll(world);
    if (reduced) {
      settle(world);
      drawAll();
    }
    request();
  }, [gravity, reduced, drawAll, request]);

  useEffect(() => {
    if (!deviceTilt || reduced || typeof DeviceOrientationEvent === "undefined") return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      const target = tiltToGravity(event.beta, event.gamma, window.screen.orientation?.angle);
      if (!target) return;
      const current = direction.current;
      // Smoothed, so sensor noise does not shake the pile.
      const x = current.x + (target.x - current.x) * 0.3;
      const y = current.y + (target.y - current.y) * 0.3;
      const length = Math.hypot(x, y) || 1;
      const turned = Math.abs(Math.atan2(y, x) - Math.atan2(current.y, current.x));
      direction.current = { x: x / length, y: y / length };
      const world = worldRef.current;
      world.gx = direction.current.x * settings.current.gravity;
      world.gy = direction.current.y * settings.current.gravity;
      if (turned > 0.02) {
        wakeAll(world);
        request();
      }
    };
    const listen = () => {
      window.addEventListener("deviceorientation", onOrientation);
    };
    const gate = (DeviceOrientationEvent as OrientationWithPermission).requestPermission;
    if (typeof gate === "function") {
      askPermission.current = () => {
        askPermission.current = null;
        gate()
          .then((state) => {
            if (state === "granted") listen();
          })
          .catch(() => {});
      };
    } else {
      listen();
    }
    return () => {
      askPermission.current = null;
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [deviceTilt, reduced, request]);

  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    const { x, y } = point(event);
    drop(x, y);
    pour.current = { pointer: event.pointerId, x, y, held: 0 };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic or already-released pointer cannot be captured; pouring
      // still ends on pointerup.
    }
    request();
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    const stream = pour.current;
    if (!stream || stream.pointer !== event.pointerId) return;
    const { x, y } = point(event);
    stream.x = x;
    stream.y = y;
  }

  function stopPouring() {
    pour.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    askPermission.current?.();
    dropAtCentre();
  }

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        ref={setRef}
        role="button"
        tabIndex={0}
        aria-label={label}
        data-slot="gravity-field"
        className={cn(gravityFieldVariants({ surface }), className)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          stopPouring();
          askPermission.current?.();
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          stopPouring();
        }}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event);
          stopPouring();
        }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
        <div aria-hidden="true" data-slot="gravity-field-glyphs" className="absolute inset-0">
          {glyphs.map((record) => (
            <Glyph key={record.id} record={record} register={register} />
          ))}
        </div>
      </div>
    </>
  );
}

export { gravityFieldVariants };
