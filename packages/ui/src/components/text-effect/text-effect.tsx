"use client";

// Ported from SmoothUI Blur Out Up, Bottom Up Letters, Depth Parallax Words, Focus Blur Resolve, Kinetic Center Build, Line By Line Slide, Mask Reveal Up, Micro Scale Fade, Per Character Rise, Reveal Text, Scale Down Fade, Short Slide Down, Short Slide Right, Soft Blur In, Spring Scale In, Stagger From Center, Stagger From Edges, Top Down Letters and Wave Text (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Key,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

/*
 * One mechanism for nineteen SmoothUI text animations (ADR 0014). Every source
 * splits a string into characters, words or lines and moves each piece from a
 * pose to rest with a stagger; they differ only in numbers. So the numbers
 * live in PRESETS, and the component is one code path that reads them.
 *
 * - The motion is CSS. Each piece carries its stagger position as `--i`; the
 *   hoisted stylesheet turns that into a delay, and every delay and duration
 *   runs through --motion-scale. The sources used `motion`'s tweens, which
 *   are cubic-béziers, so nothing is lost.
 * - Every entrance keyframe ends at rest and fills `both`, so under reduced
 *   motion (one near-instant iteration) the text lands readable, never at
 *   opacity 0. The one loop (wave-text) runs once, back to rest.
 * - The split spans are aria-hidden; an sr-only copy carries the full string,
 *   so a screen reader reads a sentence, not a spelling bee.
 * - Horizontal travel is along the inline axis: "from the left" in the
 *   sources is "from the inline start" here, and mirrors in RTL.
 */

import {
  PREFIX,
  PRESETS,
  STYLES,
  textEffectPresetNames,
  type PresetSpec,
  type TextEffectDirection,
  type TextEffectPreset,
  type TextEffectUnit,
} from "./text-effect-presets";

export {
  textEffectPresetNames,
  type TextEffectDirection,
  type TextEffectPreset,
  type TextEffectUnit,
};

/* Variants -------------------------------------------------------------- */

const presetRoots = Object.fromEntries(
  textEffectPresetNames.map((name) => [name, (PRESETS[name] as PresetSpec).root ?? ""]),
) as Record<TextEffectPreset, string>;

/** Root classes: the layout each source gave its wrapper. */
const textEffectVariants = cva("", {
  variants: {
    preset: presetRoots,
    by: { character: "", word: "", line: "block", whole: "" },
  },
  defaultVariants: { preset: "soft-blur-in" },
});

/* Splitting ------------------------------------------------------------- */

interface Plan {
  unit: TextEffectUnit;
  spec: PresetSpec;
  /** Duration of the piece run, in ms, for the "which ends last" sum. */
  duration: number;
  stagger: number;
  /** Whether pieces animate at all in this run (a `glide` exit moves only the phrase). */
  pieces: boolean;
  /** Whether word slots grow (builder entrances). */
  grow: boolean;
  /** Ends last: a piece index, "group", or null for a loop. */
  last: number | "group" | null;
}

function orderOf(index: number, count: number, order: PresetSpec["order"]): number {
  if (order === "center") return Math.abs(index - (count - 1) / 2);
  if (order === "edges") return Math.min(index, count - 1 - index);
  return index;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

function ms(value: number): string {
  return `calc(${String(value)}ms * var(--motion-scale, 1))`;
}

function renderPieces(text: string, plan: Plan): ReactNode[] {
  const { unit, spec } = plan;
  const units =
    unit === "character"
      ? Array.from(text)
      : unit === "word"
        ? text.split(" ")
        : unit === "line"
          ? text.split("\n")
          : [text];

  const piece = (content: string, index: number): ReactNode => {
    const style: Vars = { "--i": orderOf(index, units.length, spec.order) };
    const first = index === 0 && spec.first !== undefined && plan.grow;
    if (first) style["--text-effect-duration"] = ms(spec.first ?? 0);
    let node: ReactNode = (
      <span
        key={index}
        data-slot="text-effect-piece"
        data-last={plan.last === index ? "" : undefined}
        style={style}
      >
        {content}
      </span>
    );
    if (spec.mask) {
      node = (
        <span key={index} data-slot="text-effect-mask">
          {node}
        </span>
      );
    }
    if (spec.layout === "row" || spec.layout === "column") {
      node = (
        <span
          key={index}
          data-slot="text-effect-cell"
          data-first={index === 0 ? "" : undefined}
          style={{ "--i": style["--i"] } as Vars}
        >
          {node}
        </span>
      );
    }
    return node;
  };

  if (spec.layout) return units.map(piece);

  if (unit === "word") {
    // Real spaces between words, so lines wrap where the text would.
    return units.flatMap((word, index) =>
      index === 0 ? [piece(word, index)] : [" ", piece(word, index)],
    );
  }

  if (unit === "character") {
    // Letters are grouped per word so a line never breaks inside one.
    const out: ReactNode[] = [];
    let index = 0;
    for (const [w, word] of text.split(" ").entries()) {
      if (w > 0) out.push(piece(" ", index++));
      const letters = Array.from(word).map((letter) => piece(letter, index++));
      if (letters.length > 0) {
        out.push(
          <span key={`w${String(w)}`} data-slot="text-effect-word">
            {letters}
          </span>,
        );
      }
    }
    return out;
  }

  return units.map(piece);
}

/** The piece (or the phrase) that finishes last, so `onComplete` fires once. */
function lastOf(count: number, plan: Omit<Plan, "last">, groupEnd: number | null) {
  if (plan.spec.loop) return null;
  let best = -1;
  let bestEnd = -Infinity;
  if (plan.pieces) {
    for (let index = 0; index < count; index++) {
      const firstDuration = index === 0 && plan.grow ? plan.spec.first : undefined;
      const end =
        orderOf(index, count, plan.spec.order) * plan.stagger +
        (firstDuration ?? plan.duration);
      if (end >= bestEnd) {
        best = index;
        bestEnd = end;
      }
    }
  }
  if (groupEnd !== null && groupEnd > bestEnd) return "group" as const;
  return best >= 0 ? best : null;
}

function countOf(text: string, unit: TextEffectUnit): number {
  if (unit === "character") return Array.from(text).length;
  if (unit === "word") return text.split(" ").length;
  if (unit === "line") return text.split("\n").length;
  return 1;
}

/* Environment ----------------------------------------------------------- */

const noop = () => () => {};

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/* Component ------------------------------------------------------------- */

export type TextEffectElement = "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface TextEffectProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children" | "ref">,
    Omit<VariantProps<typeof textEffectVariants>, "preset" | "by"> {
  /** The text. A string, because it is split; use `\n` to separate lines. */
  children: string;
  ref?: Ref<HTMLElement>;
  /** The element to render. Headings keep their role and read as one string. */
  as?: TextEffectElement;
  /** Which SmoothUI animation to play. */
  preset?: TextEffectPreset;
  /**
   * Split unit. Defaults to the source's. The phrase builders
   * (kinetic-center-build, short-slide-down, short-slide-right) are always
   * per word: their layout is the effect. Prefer `word` or `line` for
   * joined scripts (Arabic, Devanagari): separate letters cannot join.
   */
  by?: TextEffectUnit;
  /** Milliseconds before the first piece moves. */
  delay?: number;
  /** Milliseconds between pieces. Defaults to the preset's. */
  stagger?: number;
  /** Milliseconds each piece takes to enter (or one wave cycle). Defaults to the preset's. */
  duration?: number;
  /** reveal-text only: the way the text travels as it appears. */
  direction?: TextEffectDirection;
  /** wave-text only: peak height of the wave, in pixels. */
  amplitude?: number;
  /**
   * `mount` plays immediately; `in-view` waits until the text first scrolls
   * into view, once. Without IntersectionObserver (or on the server) the text
   * renders at rest.
   */
  trigger?: "mount" | "in-view";
  /**
   * `enter` brings the text in. `exit` takes it out — with the source's own
   * exit where it had one (the phrase builders), otherwise the entrance
   * played backwards. An exit ends hidden; the sr-only copy remains. Has no
   * effect on wave-text, which is a loop rather than an entrance.
   */
  mode?: "enter" | "exit";
  /** Change it to replay. Changing `children`, `preset` or `mode` also replays. */
  replayKey?: Key;
  /** Called once the last piece settles. Never called for wave-text. */
  onComplete?: () => void;
}

/** Text that animates in, piece by piece, in one of nineteen SmoothUI motions. */
export function TextEffect({
  children,
  ref,
  as: Comp = "span",
  preset = "soft-blur-in",
  by,
  delay = 0,
  stagger,
  duration,
  direction = "up",
  amplitude = 8,
  trigger = "mount",
  mode = "enter",
  replayKey,
  onComplete,
  className,
  style,
  ...props
}: TextEffectProps) {
  const spec: PresetSpec = PRESETS[preset];
  const unit = spec.layout ? spec.by : (by ?? spec.by);
  const exiting = mode === "exit" && !spec.loop;

  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
  // Server snapshot false: an in-view effect renders at rest on the server and
  // wherever IntersectionObserver is missing, rather than waiting forever.
  const observable = useSyncExternalStore(
    noop,
    () => typeof IntersectionObserver !== "undefined",
    () => false,
  );
  const [seen, setSeen] = useState(false);
  const node = useRef<HTMLElement | null>(null);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      assignRef(ref, element);
    },
    [ref],
  );

  const waiting = trigger === "in-view" && !seen;

  useEffect(() => {
    const element = node.current;
    if (!waiting || !observable || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [waiting, observable]);

  // A native listener rather than onAnimationEnd: React listens for a
  // vendor-prefixed event name wherever AnimationEvent is missing.
  const complete = useRef(onComplete);
  useEffect(() => {
    complete.current = onComplete;
  });
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const onEnd = (event: Event) => {
      if (event.target instanceof Element && event.target.hasAttribute("data-last")) {
        complete.current?.();
      }
    };
    element.addEventListener("animationend", onEnd);
    return () => element.removeEventListener("animationend", onEnd);
  }, [Comp]);

  const state = waiting ? (observable ? "idle" : "static") : "playing";
  const animated = state !== "static";

  // What runs: the entrance, the source's exit, or the entrance reversed.
  const exit = exiting ? spec.exit : undefined;
  const id = `${PREFIX}-${preset}`;
  const pieceRun = exit
    ? exit.target === "pieces"
      ? { name: `${id}-exit`, duration: exit.duration, ease: exit.ease, stagger: 0 }
      : null
    : {
        name: spec.directions ? `${id}-${direction}` : id,
        duration: duration ?? spec.duration,
        ease: spec.ease,
        stagger: stagger ?? spec.stagger,
      };
  const groupRun = exit
    ? exit.target === "group"
      ? { name: `${id}-exit`, duration: exit.duration, ease: exit.ease }
      : null
    : spec.group
      ? { name: `${id}-group`, duration: spec.group.duration, ease: spec.group.ease }
      : null;

  const base = {
    unit,
    spec,
    duration: pieceRun?.duration ?? 0,
    stagger: pieceRun?.stagger ?? 0,
    pieces: pieceRun !== null,
    grow: !exiting && (spec.layout === "row" || spec.layout === "column"),
  };
  const plan: Plan = {
    ...base,
    last: lastOf(countOf(children, unit), base, groupRun?.duration ?? null),
  };

  const vars: Vars = {
    "--text-effect-name": animated && pieceRun ? pieceRun.name : "none",
    "--text-effect-duration": ms(plan.duration),
    "--text-effect-ease": pieceRun?.ease ?? "linear",
    "--text-effect-delay": `${String(delay)}ms`,
    "--text-effect-stagger": `${String(plan.stagger)}ms`,
    "--text-effect-count": spec.loop && !reduced ? "infinite" : "1",
    "--text-effect-direction": exiting && !exit ? "reverse" : "normal",
    "--text-effect-grow":
      animated && plan.grow
        ? `${PREFIX}-grow-${spec.layout === "row" ? "inline" : "block"}`
        : "none",
  };
  if (spec.loop) vars["--text-effect-amplitude"] = `${String(amplitude)}px`;
  if (animated && groupRun) {
    Object.assign(vars, {
      animationName: groupRun.name,
      animationDuration: ms(groupRun.duration),
      animationTimingFunction: groupRun.ease,
      animationDelay: ms(delay),
      animationFillMode: "both",
    } satisfies CSSProperties);
  }

  const run = [String(replayKey ?? ""), preset, unit, mode, direction, children].join(" ");

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Comp
        ref={setRef}
        data-slot="text-effect"
        data-preset={preset}
        data-mode={spec.loop ? "loop" : mode}
        data-state={state}
        className={cn(textEffectVariants({ preset, by: unit }), className)}
        style={style}
        {...props}
      >
        <span data-slot="text-effect-label" className="sr-only">
          {children}
        </span>
        <span
          key={run}
          aria-hidden="true"
          data-slot="text-effect-content"
          data-by={unit}
          data-layout={spec.layout}
          data-last={plan.last === "group" ? "" : undefined}
          style={vars}
        >
          {renderPieces(children, plan)}
        </span>
      </Comp>
    </>
  );
}

export { textEffectVariants };
