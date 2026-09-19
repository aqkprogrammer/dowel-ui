"use client";

// Ported from bencho Todo tower (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A to-do list stacked like bricks on the floor. Ticking a card flicks it off
 * the side and the cards above drop into the gap; grabbing a card drags it,
 * and the cards stacked on top of it sway after it on springs.
 *
 * Deviation from the source: bencho runs a full rigid-body simulation in which
 * cards collide and topple off each other. This keeps the parts of that which
 * carry meaning — the flick, the drop, the sway of a dragged stack — without a
 * physics engine: each card above the one held follows it on a spring that
 * gets looser the higher it sits, and tilts with its own velocity. That is
 * what `motion` is for here (springs carrying a drag's velocity); the flick
 * and the drop are CSS. Dragging is decoration, so it has no keyboard
 * equivalent: every card's "Done" is a real button, and that is the action.
 *
 * Added: completion is announced politely, and focus moves to the card that
 * drops into the gap. Under reduced motion there is no sway, flick or drop.
 */

const PREFIX = "dowel-todo-tower";

const STYLES = `
@keyframes ${PREFIX}-drop{from{transform:translateY(-120%);opacity:0}}
[data-slot=todo-tower-card]{animation:${PREFIX}-drop calc(420ms * var(--motion-scale,1)) cubic-bezier(.5,0,.6,1.25) both;animation-delay:calc(var(--todo-tower-order,0) * 60ms * var(--motion-scale,1))}
`;

/** Height of one brick, and the gap-free pitch of the stack, in px. */
const PITCH = 46;
/** Milliseconds between ticking a card and removing it: the flick. */
const EXIT = 350;

const todoTowerVariants = cva("relative w-[18.75rem] max-w-full touch-none select-none", {
  variants: {
    /** Card surface — the source's Fill switch. */
    fill: {
      light:
        "[--todo-tower-card:var(--color-card)] [--todo-tower-ink:var(--color-card-foreground)]",
      dark: "[--todo-tower-card:var(--color-foreground)] [--todo-tower-ink:var(--color-background)]",
    },
    /** A hairline ring on each card — the source's Stroke switch. */
    stroke: {
      true: "[&_[data-slot=todo-tower-card]]:shadow-[inset_0_0_0_1px_var(--color-border)]",
      false: "",
    },
  },
  defaultVariants: { fill: "light", stroke: false },
});

export interface TodoItem {
  id: string;
  label: string;
}

/** A stable, id-derived horizontal nudge of ±6–15px, so the pile looks hand-stacked. */
function nudge(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const magnitude = 6 + (Math.abs(hash) % 10);
  return hash % 2 === 0 ? magnitude : -magnitude;
}

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface Leader {
  index: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

interface RowProps {
  item: TodoItem;
  index: number;
  count: number;
  leader: Leader | null;
  leaderIndex: number | null;
  out: boolean;
  still: boolean;
  gravity: number;
  slip: number;
  checkLabel: (label: string) => string;
  onCheck: (id: string) => void;
  onGrab: (index: number, event: PointerEvent<HTMLLIElement>) => void;
}

function Row({
  item,
  index,
  count,
  leader,
  leaderIndex,
  out,
  still,
  gravity,
  slip,
  checkLabel,
  onCheck,
  onGrab,
}: RowProps) {
  const follows = leader !== null && leaderIndex !== null && index <= leaderIndex;
  const lag = follows ? leaderIndex - index : 0;
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  // The held card tracks the pointer almost rigidly; each card above it is
  // looser than the one below, so a tall stack sways like one.
  const stiffness = lag === 0 ? 2400 : (200 + gravity * 6) / (1 + lag * 0.6);
  const damping = lag === 0 ? 80 : 8 + (100 - slip) * 0.25;
  const x = useSpring(targetX, { stiffness, damping });
  const y = useSpring(targetY, { stiffness, damping });
  const velocity = useVelocity(x);
  const rotate = useTransform(velocity, (v) =>
    still ? 0 : Math.max(-35, Math.min(35, v * 0.02 * (1 + lag * 0.4))),
  );

  useMotionValueEvent(leader?.x ?? targetX, "change", (value) => {
    if (follows && leader) targetX.set(value);
  });
  useMotionValueEvent(leader?.y ?? targetY, "change", (value) => {
    if (follows && leader) targetY.set(value);
  });

  useEffect(() => {
    if (follows) return;
    targetX.set(0);
    targetY.set(0);
  }, [follows, targetX, targetY]);

  return (
    <li
      data-slot="todo-tower-row"
      data-held={leaderIndex === index || undefined}
      className={cn(
        "absolute bottom-0 left-1/2 -translate-x-1/2 translate-x-[calc(-50%+var(--todo-tower-x))] translate-y-[var(--todo-tower-y)]",
        "transition-[translate] duration-[var(--duration-slow)] ease-[cubic-bezier(0.5,0,0.6,1.3)]",
        "data-[held]:z-3",
      )}
      style={
        {
          "--todo-tower-x": `${String(nudge(item.id))}px`,
          "--todo-tower-y": `${String(-(count - 1 - index) * PITCH)}px`,
        } as CSSProperties
      }
      onPointerDown={(event) => {
        onGrab(index, event);
      }}
    >
      <motion.div data-slot="todo-tower-body" style={{ x, y, rotate }}>
        <div
          data-slot="todo-tower-card"
          data-out={out || undefined}
          className={cn(
            "flex h-[2.875rem] w-[12.875rem] cursor-grab items-center gap-2.5 rounded-[0.6875rem] px-3.5",
            "bg-[var(--todo-tower-card)] text-[var(--todo-tower-ink)]",
            "in-data-[held]:-translate-y-0.5 in-data-[held]:cursor-grabbing",
            "transition-[translate,rotate,opacity] duration-[var(--duration-slow),var(--duration-slow),var(--duration-normal)] ease-[var(--ease-in-quint)]",
            "data-[out]:translate-x-[118%] data-[out]:rotate-5 data-[out]:opacity-0 data-[out]:delay-[var(--duration-instant)]",
          )}
          style={{ "--todo-tower-order": count - 1 - index } as CSSProperties}
        >
          <button
            type="button"
            aria-label={checkLabel(item.label)}
            aria-pressed={out}
            data-slot="todo-tower-check"
            className={cn(
              "grid size-[1.1875rem] shrink-0 place-items-center rounded-md",
              "shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,currentColor_22%,transparent)] hover:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,currentColor_38%,transparent)]",
              "aria-pressed:bg-[var(--todo-tower-ink)] aria-pressed:text-[var(--todo-tower-card)] aria-pressed:shadow-none",
              focusRing,
            )}
            onPointerDown={(event) => {
              // The check is a button, not a handle.
              event.stopPropagation();
            }}
            onClick={() => {
              onCheck(item.id);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={cn("size-3", !out && "invisible")}
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <span
            data-slot="todo-tower-text"
            className={cn(
              "truncate text-[0.9375rem] leading-none tracking-[-0.005em] opacity-80",
              out && "line-through opacity-45",
            )}
          >
            {item.label}
          </span>
        </div>
      </motion.div>
    </li>
  );
}

export interface TodoTowerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange">,
    VariantProps<typeof todoTowerVariants> {
  /** Controlled to-dos, top of the stack first. */
  items?: TodoItem[];
  /** Initial to-dos when uncontrolled, top of the stack first. */
  defaultItems?: TodoItem[];
  /** Called with the remaining to-dos after one is completed. */
  onItemsChange?: (items: TodoItem[]) => void;
  /** Called with the to-do that was completed. */
  onComplete?: (item: TodoItem) => void;
  /** Re-drop the whole stack once the last card is done (uncontrolled only). */
  loop?: boolean;
  /** How hard the stack pulls back together, 0–100. */
  gravity?: number;
  /** How loosely the cards above a held one sway, 0–100. */
  slip?: number;
  /** The list's accessible name. */
  label?: string;
  /** The check button's name for a to-do. */
  checkLabel?: (label: string) => string;
  /** Announced when a to-do is completed. */
  completedLabel?: (label: string) => string;
}

/** A stack of to-do cards: tick one and it flicks away; grab one and the stack sways. */
export function TodoTower({
  className,
  fill,
  stroke,
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  onComplete,
  loop = false,
  gravity = 50,
  slip = 45,
  label = "To-dos",
  checkLabel = (text) => `Done: ${text}`,
  completedLabel = (text) => `Completed: ${text}`,
  style,
  ...props
}: TodoTowerProps) {
  const [inner, setInner] = useState(defaultItems);
  const items = itemsProp ?? inner;
  const [round, setRound] = useState(0);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [leaderIndex, setLeaderIndex] = useState<number | null>(null);
  const [announced, setAnnounced] = useState("");
  const reduced = useReducedMotion() ?? false;
  const leaderX = useMotionValue(0);
  const leaderY = useMotionValue(0);
  const grab = useRef<{ id: number; x: number; y: number } | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusIndex = useRef<number | null>(null);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  // After a card leaves, focus the one that dropped into its place.
  useEffect(() => {
    const index = focusIndex.current;
    if (index === null) return;
    focusIndex.current = null;
    const checks = listRef.current?.querySelectorAll<HTMLElement>(
      "[data-slot=todo-tower-check]",
    );
    const target = checks?.[Math.min(index, checks.length - 1)];
    if (target) target.focus();
    else listRef.current?.focus();
  });

  function remove(id: string) {
    const index = items.findIndex((item) => item.id === id);
    const item = items[index];
    setLeaving((current) => current.filter((value) => value !== id));
    if (!item) return;
    const next = items.filter((value) => value.id !== id);
    focusIndex.current = index;
    onComplete?.(item);
    onItemsChange?.(next);
    setAnnounced(completedLabel(item.label));
    if (itemsProp !== undefined) return;
    if (next.length === 0 && loop) {
      setInner(defaultItems);
      setRound((value) => value + 1);
    } else {
      setInner(next);
    }
  }

  function check(id: string) {
    if (leaving.includes(id)) return;
    if (reducedMotion()) {
      remove(id);
      return;
    }
    setLeaving((current) => [...current, id]);
    timers.current.push(
      setTimeout(() => {
        remove(id);
      }, EXIT),
    );
  }

  function handleGrab(index: number, event: PointerEvent<HTMLLIElement>) {
    if (event.button !== 0 || reduced) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    grab.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    leaderX.jump(0);
    leaderY.jump(0);
    setLeaderIndex(index);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const current = grab.current;
    if (!current || current.id !== event.pointerId) return;
    leaderX.set(event.clientX - current.x);
    leaderY.set(event.clientY - current.y);
  }

  function handleRelease(event: PointerEvent<HTMLDivElement>) {
    const current = grab.current;
    if (!current || current.id !== event.pointerId) return;
    grab.current = null;
    // Thrown: the stack springs home carrying the throw's velocity.
    const options = { type: "spring", stiffness: 180 + gravity * 3, damping: 18 } as const;
    void Promise.all([
      animate(leaderX, 0, { ...options, velocity: leaderX.getVelocity() }),
      animate(leaderY, 0, { ...options, velocity: leaderY.getVelocity() }),
    ]).then(() => {
      if (!grab.current) setLeaderIndex(null);
    });
  }

  const leader: Leader | null =
    leaderIndex === null ? null : { index: leaderIndex, x: leaderX, y: leaderY };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-slot="todo-tower"
        className={cn(todoTowerVariants({ fill, stroke }), className)}
        style={{ height: Math.max(1, items.length) * PITCH + 20, ...style }}
        onPointerMove={handleMove}
        onPointerUp={handleRelease}
        onPointerCancel={handleRelease}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <ul
          key={round}
          ref={listRef}
          aria-label={label}
          tabIndex={-1}
          className="absolute inset-0 outline-none"
        >
          {items.map((item, index) => (
            <Row
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              leader={leader}
              leaderIndex={leaderIndex}
              out={leaving.includes(item.id)}
              still={reduced}
              gravity={gravity}
              slip={slip}
              checkLabel={checkLabel}
              onCheck={check}
              onGrab={handleGrab}
            />
          ))}
        </ul>
        <span role="status" aria-live="polite" className="sr-only">
          {announced}
        </span>
      </div>
    </MotionConfig>
  );
}

export { todoTowerVariants };
