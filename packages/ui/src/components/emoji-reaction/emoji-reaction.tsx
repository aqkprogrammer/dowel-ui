"use client";

// Original design (pattern inspired by Rare UI Emoji reaction; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A reaction button that pops open a bar of emoji; picking one sends copies
 * of it floating up out of the bar.
 *
 * Placement is Popover's, so the bar portals out of any overflow, flips below
 * the trigger when there is no room above, and slides inward rather than off
 * the edge of the screen. It springs open from the trigger — one keyframe
 * with an overshoot, scaled from the transform-origin the primitive computes
 * — and closes faster than it opened. Its emoji follow it in on a short
 * stagger, and lift and magnify under the pointer.
 *
 * Picking: click or tap an emoji, or press on the trigger and drag straight
 * onto one — the bar opens under the finger and releasing on an emoji picks
 * it, one gesture. Holding an emoji down keeps picking it, and each repeat
 * fires `onReact` again (for a stream of reactions); a tap picks on release,
 * so a press that slides off does nothing. The bar stays open after a pick —
 * the trigger shows a cross — until the cross, Escape, a click outside or Tab
 * closes it; the trigger then shows the last pick. Control `open` to close it
 * from `onReact` instead.
 *
 * The floating copies are a portalled, aria-hidden layer of spans on two
 * nested keyframes — one rising on an ease-out, one drifting sideways,
 * shrinking and blurring on an ease-in — so the stream slows as it climbs
 * while the copies spread apart faster. They are removed when their
 * animation ends. None are made under reduced motion, and nothing lifts.
 *
 * Semantics. The bar is role="toolbar", not a menu. A menu is
 * choose-and-close — every screen reader user expects activating a menu item
 * to dismiss it — while here the bar stays open, picks repeat, and holding is
 * the point: a persistent row of buttons with arrow-key movement between them
 * is a toolbar. The trigger is therefore a disclosure (aria-expanded,
 * aria-controls) rather than aria-haspopup, which has no value for a toolbar
 * and would promise a dialog that is not there. The trigger is named
 * "React, Heart" once something is picked; the current pick carries
 * aria-current in the bar. Roving tabindex: the bar is one tab stop, arrows
 * (mirrored in RTL), Home and End move within it, and Tab leaves it — closing
 * it, and continuing from the trigger. Focus returns to the trigger whenever
 * closing would otherwise strand it.
 */

const PREFIX = "dowel-emoji-reaction";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const DX = `--${PREFIX}-dx`;
const RISE = `--${PREFIX}-rise`;
const ROT = `--${PREFIX}-rot`;
const END = `--${PREFIX}-end`;
const DELAY = `--${PREFIX}-delay`;

const STYLES = `
@keyframes ${PREFIX}-in{from{opacity:0;transform:scale(.35)}}
@keyframes ${PREFIX}-out{to{opacity:0;transform:scale(.75)}}
@keyframes ${PREFIX}-item-in{from{opacity:0;scale:.3;translate:0 35%}}
@keyframes ${PREFIX}-rise{from{translate:0 0}to{translate:0 calc(var(${RISE}) * -1)}}
@keyframes ${PREFIX}-drift{0%{opacity:0;scale:.5}12%{opacity:1;scale:1}50%{opacity:1;filter:blur(0)}100%{opacity:0;translate:var(${DX}) 0;scale:var(${END});rotate:var(${ROT});filter:blur(6px)}}
[data-slot=emoji-reaction-particle]{animation:${PREFIX}-rise ${scaled(1150)} cubic-bezier(.2,.65,.35,1) var(${DELAY}) both}
[data-slot=emoji-reaction-particle]>span{animation:${PREFIX}-drift ${scaled(1150)} cubic-bezier(.45,0,.75,.6) var(${DELAY}) both}
`;

/** Copies sent up by a pick, and by each repeat while an emoji is held. */
const BURST = 5;
const REPEAT_BURST = 3;
/** How long a press must last to become a hold, and how often a hold repeats. */
const HOLD_DELAY = 380;
const REPEAT_EVERY = 220;
/** A long hold cannot flood the page. */
const MAX_PARTICLES = 60;

export interface EmojiReactionItem {
  /** The emoji itself, as a native unicode character. */
  emoji: string;
  /** Its accessible name. Defaults to the `labels` entry, then to the emoji. */
  label?: string;
}

const DEFAULT_EMOJIS: readonly EmojiReactionItem[] = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Laughing" },
  { emoji: "😮", label: "Surprised" },
  { emoji: "😢", label: "Sad" },
];

const DEFAULT_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  DEFAULT_EMOJIS.map((item) => [item.emoji, item.label ?? item.emoji]),
);

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  dx: number;
  rise: number;
  rot: number;
  end: number;
  delay: number;
}

const emojiReactionVariants = cva(
  cn(
    "relative inline-grid shrink-0 touch-none place-items-center rounded-full border border-border bg-card leading-none text-muted-foreground shadow-xs select-none",
    "transition-[background-color,color,box-shadow,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    "hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
    "motion-safe:active:scale-95",
    focusRing,
    disabledStyles,
  ),
  {
    variants: {
      /** Scales the trigger, the bar and the emoji that fly up together. */
      size: {
        sm: "size-8 text-base [&_svg]:size-4",
        md: "size-10 text-xl [&_svg]:size-5",
        lg: "size-12 text-2xl [&_svg]:size-6",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/** One emoji in the bar. */
const emojiReactionItemVariants = cva(
  cn(
    "relative grid shrink-0 origin-bottom touch-manipulation place-items-center rounded-full leading-none select-none [-webkit-touch-callout:none]",
    "transition-[translate,scale,background-color] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
    "animate-[dowel-emoji-reaction-item-in_var(--duration-slow)_var(--ease-overshoot)_backwards]",
    "hover:bg-accent/60 aria-[current=true]:bg-accent data-hot:bg-accent/60",
    "motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-125",
    "motion-safe:data-hot:-translate-y-1.5 motion-safe:data-hot:scale-125",
    "motion-safe:active:scale-110",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "size-8 text-lg",
        md: "size-10 text-2xl",
        lg: "size-12 text-3xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const particleSize = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" } as const;

const layer = cn(
  "col-start-1 row-start-1 grid place-items-center",
  "transition-[opacity,scale,rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
  "data-[state=hidden]:scale-50 data-[state=hidden]:opacity-0",
  "data-[state=hidden]:duration-[var(--duration-fast)] data-[state=hidden]:ease-[var(--ease-out-quint)]",
);

function SmileyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.99 9.09A8.5 8.5 0 1 1 13.48 3.63" />
      <path d="M8.6 14.1a4.2 4.2 0 0 0 6.8 0" />
      <path d="M9.1 9.6h.01M14.9 9.6h.01" />
      <path d="M19 2.5v5M16.5 5h5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M17 7 7 17M7 7l10 10" />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

export interface EmojiReactionProps
  extends
    Omit<ComponentPropsWithRef<"button">, "value" | "defaultValue">,
    VariantProps<typeof emojiReactionVariants> {
  /** The emoji in the bar, as `{ emoji, label }` or bare strings named through `labels`. */
  emojis?: readonly (string | EmojiReactionItem)[];
  /** Accessible names for bare-string emoji, keyed by the emoji. */
  labels?: Readonly<Record<string, string>>;
  /** The last pick, controlled. `null` shows the smiley again. */
  value?: string | null;
  /** The initial pick when uncontrolled. */
  defaultValue?: string | null;
  /** Called when the pick changes. */
  onValueChange?: (emoji: string) => void;
  /** Called every time an emoji is picked, including each repeat while one is held. */
  onReact?: (emoji: string) => void;
  /** Which edge of the bar lines up with the trigger. It still shifts inward near the screen edge. */
  align?: "start" | "center" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger's accessible name; the current pick is added after it. */
  label?: string;
  /** The bar's accessible name. */
  barLabel?: string;
  /** Classes for the bar. `className` goes to the trigger. */
  barClassName?: string;
  /**
   * Use your own element — a message, a card, an image — as the trigger. It
   * keeps its own content and name; give it one that says it can be reacted to.
   */
  asChild?: boolean;
}

/** A reaction button that opens a bar of emoji and floats your pick up out of it. */
export function EmojiReaction({
  className,
  barClassName,
  emojis = DEFAULT_EMOJIS,
  labels,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  onReact,
  size,
  align = "center",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = "React",
  barLabel = "Reactions",
  asChild = false,
  disabled,
  children,
  ref,
  "aria-label": ariaLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick,
  onKeyDown,
  ...props
}: EmojiReactionProps) {
  const items = emojis.map((entry) => {
    const item = typeof entry === "string" ? { emoji: entry } : entry;
    return {
      emoji: item.emoji,
      label: item.label ?? labels?.[item.emoji] ?? DEFAULT_LABELS[item.emoji] ?? item.emoji,
    };
  });

  const [innerValue, setInnerValue] = useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : innerValue;
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = openProp ?? innerOpen;
  const [hot, setHot] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragging = useRef(false);
  const openedByPointer = useRef(false);
  const nextId = useRef(0);
  const hold = useRef<{
    timer?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
    fired: boolean;
  }>({ fired: false });
  // Handlers read by a hold's repeat timer, which outlives the render that
  // started it.
  const latest = useRef({ onReact });
  useEffect(() => {
    latest.current = { onReact };
  });

  const stopHold = useCallback(() => {
    clearTimeout(hold.current.timer);
    clearInterval(hold.current.repeat);
    hold.current.timer = undefined;
    hold.current.repeat = undefined;
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const current = items.findIndex((item) => item.emoji === value);
  const roving = Math.min(focusIndex, items.length - 1);

  function setOpen(next: boolean) {
    if (next) setFocusIndex(Math.max(0, current));
    else {
      stopHold();
      dragging.current = false;
      setHot(null);
    }
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function spawn(index: number, emoji: string, count: number) {
    if (prefersReducedMotion()) return;
    const box = itemRefs.current[index]?.getBoundingClientRect();
    if (!box) return;
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const fresh = Array.from({ length: count }, (_, i) => ({
      id: nextId.current++,
      emoji,
      x,
      y,
      dx: (i - (count - 1) / 2) * 14 + (Math.random() - 0.5) * 18,
      rise: 70 + Math.random() * 55,
      rot: (Math.random() - 0.5) * 50,
      end: 0.35 + Math.random() * 0.25,
      delay: i * 55 + Math.random() * 35,
    }));
    setParticles((list) => [...list, ...fresh].slice(-MAX_PARTICLES));
  }

  function pick(index: number, count = BURST) {
    const item = items[index];
    if (!item) return;
    if (item.emoji !== value) {
      if (valueProp === undefined) setInnerValue(item.emoji);
      onValueChange?.(item.emoji);
    }
    onReact?.(item.emoji);
    spawn(index, item.emoji, count);
  }

  /** The emoji under a point, ignoring any not laid out yet. */
  function hitTest(x: number, y: number): number | null {
    for (const [index, node] of itemRefs.current.entries()) {
      const box = node?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) continue;
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return index;
    }
    return null;
  }

  // Trigger. Pointer presses open on the way down, so a drag can carry on to
  // an emoji; the click that follows is swallowed so Popover does not toggle
  // it straight back. Keyboard activation is left to Popover.
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (event.defaultPrevented || disabled || event.button !== 0) return;
    if (open) {
      setOpen(false);
      return;
    }
    openedByPointer.current = true;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setOpen(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(event);
    if (!dragging.current) return;
    const index = hitTest(event.clientX, event.clientY);
    if (index !== hot) setHot(index);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    onPointerUp?.(event);
    if (!dragging.current) return;
    dragging.current = false;
    setHot(null);
    const index = hitTest(event.clientX, event.clientY);
    if (index !== null) pick(index);
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    onPointerCancel?.(event);
    dragging.current = false;
    setHot(null);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.detail !== 0) event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (open) itemRefs.current[roving]?.focus();
    else setOpen(true);
  }

  // Bar.
  function startHold(index: number, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    stopHold();
    hold.current.fired = false;
    const emoji = items[index]?.emoji ?? "";
    hold.current.timer = setTimeout(() => {
      hold.current.fired = true;
      pick(index);
      hold.current.repeat = setInterval(() => {
        latest.current.onReact?.(emoji);
        spawn(index, emoji, REPEAT_BURST);
      }, REPEAT_EVERY);
    }, HOLD_DELAY);
  }

  function handleItemClick(index: number, event: MouseEvent<HTMLButtonElement>) {
    // The release that ends a hold is not another pick.
    if (event.detail !== 0 && hold.current.fired) {
      hold.current.fired = false;
      return;
    }
    pick(index);
  }

  function handleBarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = itemRefs.current.indexOf(event.target as HTMLButtonElement);
    if (from === -1) return;
    const count = items.length;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = from + (rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        next = from + (rtl ? 1 : -1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Tab":
        // Focus the trigger first, so the Tab carries on from it rather than
        // from the end of the page where the bar is portalled.
        triggerRef.current?.focus();
        setOpen(false);
        return;
      default:
        return;
    }
    event.preventDefault();
    const target = (next + count) % count;
    setFocusIndex(target);
    itemRefs.current[target]?.focus();
  }

  function removeParticle(id: number, event: AnimationEvent<HTMLSpanElement>) {
    if (event.animationName !== `${PREFIX}-drift`) return;
    setParticles((list) => list.filter((particle) => particle.id !== id));
  }

  const pickedLabel = current === -1 ? value : items[current]?.label;
  const name = value ? `${label}, ${pickedLabel ?? value}` : label;
  const sized = size ?? "md";

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          asChild={asChild}
          ref={setTriggerRef}
          data-slot="emoji-reaction"
          aria-haspopup={undefined}
          aria-label={asChild ? ariaLabel : (ariaLabel ?? name)}
          disabled={disabled}
          className={asChild ? className : cn(emojiReactionVariants({ size }), className)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {asChild ? (
            children
          ) : (
            <>
              <span
                data-slot="emoji-reaction-icon"
                data-state={!open && !value ? "visible" : "hidden"}
                className={layer}
              >
                <SmileyIcon />
              </span>
              <span
                data-slot="emoji-reaction-value"
                data-state={!open && value ? "visible" : "hidden"}
                className={layer}
              >
                {value}
              </span>
              <span
                data-slot="emoji-reaction-close"
                data-state={open ? "visible" : "hidden"}
                className={cn(layer, "data-[state=hidden]:-rotate-90")}
              >
                <CrossIcon />
              </span>
            </>
          )}
        </PopoverTrigger>
        <PopoverContent
          role="toolbar"
          aria-label={barLabel}
          aria-orientation="horizontal"
          data-slot="emoji-reaction-bar"
          side="top"
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            "flex w-auto items-center gap-1 rounded-full p-1.5",
            "data-[state=open]:animate-[dowel-emoji-reaction-in_var(--duration-slow)_var(--ease-overshoot)]",
            "data-[state=closed]:animate-[dowel-emoji-reaction-out_var(--duration-fast)_var(--ease-in-quint)_forwards]",
            barClassName,
          )}
          onOpenAutoFocus={(event) => {
            // A pointer that opened the bar stays on the trigger — it may be
            // mid-drag. The keyboard moves into the bar.
            if (openedByPointer.current) event.preventDefault();
            openedByPointer.current = false;
          }}
          onCloseAutoFocus={(event) => {
            // Back to the trigger, unless focus has already gone somewhere
            // on purpose — another control that was clicked, or Tab's target.
            event.preventDefault();
            const active = document.activeElement;
            if (!active || active === document.body) triggerRef.current?.focus();
          }}
          onKeyDown={handleBarKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={`${item.emoji}-${String(index)}`}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              tabIndex={index === roving ? 0 : -1}
              aria-label={item.label}
              aria-current={index === current ? "true" : undefined}
              data-slot="emoji-reaction-item"
              data-hot={hot === index ? "" : undefined}
              className={emojiReactionItemVariants({ size })}
              style={{ animationDelay: scaled(index * 24) }}
              onFocus={() => {
                setFocusIndex(index);
              }}
              onClick={(event) => {
                handleItemClick(index, event);
              }}
              onPointerDown={(event) => {
                startHold(index, event);
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onContextMenu={(event) => {
                // A long press is a hold here, not a request for the
                // system's callout.
                event.preventDefault();
              }}
            >
              <span aria-hidden="true">{item.emoji}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
      {particles.length > 0
        ? createPortal(
            <div
              aria-hidden="true"
              data-slot="emoji-reaction-particles"
              className="pointer-events-none fixed inset-0 z-[var(--z-tooltip)] overflow-hidden"
            >
              {particles.map((particle) => (
                <span
                  key={particle.id}
                  data-slot="emoji-reaction-particle"
                  className="absolute flex size-0 items-center justify-center"
                  style={
                    {
                      left: particle.x,
                      top: particle.y,
                      [DX]: `${String(particle.dx)}px`,
                      [RISE]: `${String(particle.rise)}px`,
                      [ROT]: `${String(particle.rot)}deg`,
                      [END]: String(particle.end),
                      [DELAY]: scaled(particle.delay),
                    } as CSSProperties
                  }
                  onAnimationEnd={(event) => {
                    removeParticle(particle.id, event);
                  }}
                >
                  <span className={cn("block leading-none", particleSize[sized])}>
                    {particle.emoji}
                  </span>
                </span>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export { emojiReactionItemVariants, emojiReactionVariants };
