"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * A split-flap display, the kind on an old departures board.
 *
 * Each cell holds one character as two halves. When the value changes, every
 * cell steps forward through the character set to its new character, one flip
 * per step: the top half of the old character folds down over a hinge while
 * the bottom half of the new one swings into place beneath it. Cells start a
 * beat apart, so a change ripples along the row.
 *
 * Long trips are shortened: a cell flips at most `maxFlips` times, skipping
 * ahead through the set, so "A" to "Z" never takes the whole alphabet.
 *
 * The board is read once, as text: a visually hidden polite live region holds
 * the value and the cells are aria-hidden. Under reduced motion the cells
 * change at once.
 */

const PREFIX = "dowel-flap-board";

const STYLES = `
@keyframes ${PREFIX}-fold{from{transform:rotateX(0deg)}to{transform:rotateX(-90deg)}}
@keyframes ${PREFIX}-drop{from{transform:rotateX(90deg)}to{transform:rotateX(0deg)}}
.${PREFIX}-top{animation:${PREFIX}-fold calc(var(--flap-board-speed) * .5 * var(--motion-scale, 1)) ease-in both}
.${PREFIX}-bottom{animation:${PREFIX}-drop calc(var(--flap-board-speed) * .5 * var(--motion-scale, 1)) ease-out calc(var(--flap-board-speed) * .5 * var(--motion-scale, 1)) both}
`;

/** The characters a flap board can show, in flip order. */
export const FLAP_BOARD_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-/!?&'#@";

const flapBoardVariants = cva(
  "inline-flex gap-[0.12em] font-mono font-bold [perspective:30em]",
  {
    variants: {
      size: {
        sm: "text-base",
        md: "text-2xl",
        lg: "text-4xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const cellClass = cn(
  "relative inline-block h-[1.6em] w-[1.1em] rounded-[0.12em] leading-[1.6em]",
  "bg-foreground text-background shadow-sm",
);

/** One half of a character: the top shows the upper half, the bottom the lower. */
function Half({
  char,
  half,
  className,
}: {
  char: string;
  half: "top" | "bottom";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 overflow-hidden bg-foreground [backface-visibility:hidden]",
        half === "top"
          ? "top-0 h-1/2 origin-bottom rounded-t-[0.12em]"
          : "bottom-0 h-1/2 origin-top rounded-b-[0.12em]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 block h-[1.6em] text-center",
          half === "top" ? "top-0" : "bottom-0",
        )}
      >
        {char === " " ? " " : char}
      </span>
    </span>
  );
}

/** The characters a cell passes through on its way from `from` to `to`. */
export function flapSteps(
  from: string,
  to: string,
  charset: string,
  maxFlips: number,
): string[] {
  if (from === to) return [];
  const start = Math.max(0, charset.indexOf(from));
  const end = charset.indexOf(to);
  if (end === -1) return [to];
  const distance = (end - start + charset.length) % charset.length;
  const flips = Math.min(distance, Math.max(1, maxFlips));
  // Evenly spaced through the trip, always landing on the target.
  return Array.from({ length: flips }, (_, i) => {
    const offset = Math.round(((i + 1) * distance) / flips);
    return charset[(start + offset) % charset.length] ?? to;
  });
}

/** Pads or trims `value` to `length` cells and maps characters the set lacks to a space. */
export function toCells(value: string, length: number, charset: string): string[] {
  const upper = charset === charset.toUpperCase();
  return Array.from({ length }, (_, i) => {
    const raw = value[i] ?? " ";
    const char = upper ? raw.toUpperCase() : raw;
    return charset.includes(char) ? char : " ";
  });
}

interface CellState {
  /** What the cell shows at rest. */
  char: string;
  /** The character it showed before the flip in progress. */
  previous: string;
  /** Bumped each flip, to restart the animation. */
  flip: number;
}

export interface FlapBoardProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof flapBoardVariants> {
  /** The text to show. */
  value: string;
  /** How many cells. Defaults to the length of `value`. */
  length?: number;
  /** The characters, in the order the flaps turn through them. */
  charset?: string;
  /** Milliseconds per flip. Default 90. */
  speed?: number;
  /** The most flips a cell makes for one change. Default 10. */
  maxFlips?: number;
  /** Milliseconds between one cell starting and the next. Default 40. */
  stagger?: number;
}

/** A split-flap display that flips each character over to its new value. */
export function FlapBoard({
  value,
  length,
  charset = FLAP_BOARD_CHARSET,
  speed = 90,
  maxFlips = 10,
  stagger = 40,
  size,
  className,
  style,
  ...props
}: FlapBoardProps) {
  const reduced = useReducedMotion();
  const count = Math.max(1, length ?? value.length);
  const target = toCells(value, count, charset);
  const targetKey = target.join("");

  const [cells, setCells] = useState<CellState[]>(() =>
    target.map((char) => ({ char, previous: char, flip: 0 })),
  );
  const shown = useRef(cells.map((cell) => cell.char));

  useEffect(() => {
    const goal = targetKey.split("");
    const timers: ReturnType<typeof setTimeout>[] = [];

    const set = (index: number, char: string) => {
      setCells((current) => {
        const next = goal.map((_, i) => current[i] ?? { char: " ", previous: " ", flip: 0 });
        const cell = next[index];
        if (!cell) return current;
        next[index] = { char, previous: cell.char, flip: cell.flip + 1 };
        return next;
      });
      shown.current[index] = char;
    };

    if (reduced) {
      // Rendered straight from the target below; only the record moves.
      shown.current = [...goal];
      return;
    }

    goal.forEach((to, index) => {
      const steps = flapSteps(shown.current[index] ?? " ", to, charset, maxFlips);
      steps.forEach((char, step) => {
        timers.push(setTimeout(() => set(index, char), index * stagger + step * speed));
      });
    });
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [targetKey, charset, speed, maxFlips, stagger, reduced]);

  return (
    <span
      data-slot="flap-board"
      className={cn(flapBoardVariants({ size }), "[direction:ltr]", className)}
      style={{ "--flap-board-speed": `${String(speed)}ms`, ...style } as CSSProperties}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span className="sr-only" aria-live="polite">
        {value}
      </span>
      {Array.from({ length: count }, (_, index) => {
        const resting = target[index] ?? " ";
        const cell: CellState = reduced
          ? { char: resting, previous: resting, flip: 0 }
          : (cells[index] ?? { char: " ", previous: " ", flip: 0 });
        return (
          <span
            key={index}
            aria-hidden="true"
            data-slot="flap-board-cell"
            className={cellClass}
          >
            {/* At rest: the new top half above the hinge, the old bottom half below until the flap covers it. */}
            <Half char={cell.char} half="top" />
            <Half char={cell.previous} half="bottom" />
            {cell.flip > 0 && cell.previous !== cell.char ? (
              <>
                <Half
                  key={`top-${String(cell.flip)}`}
                  char={cell.previous}
                  half="top"
                  className={`${PREFIX}-top z-10`}
                />
                <Half
                  key={`bottom-${String(cell.flip)}`}
                  char={cell.char}
                  half="bottom"
                  className={`${PREFIX}-bottom z-10`}
                />
              </>
            ) : (
              <Half char={cell.char} half="bottom" />
            )}
            <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-background/40" />
          </span>
        );
      })}
    </span>
  );
}

export { flapBoardVariants };
