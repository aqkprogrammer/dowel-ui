"use client";

// Ported from SmoothUI Fade Through, Per Word Crossfade, Shared Axis X, Shared Axis Y and Shared Axis Z (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

// Installed, this file is what `@/components/ui/text-swap` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export { TextRotate, type TextRotateProps } from "./text-rotate";

/*
 * One mechanism for SmoothUI's five phrase transitions (ADR 0014). Each source
 * is a `motion` AnimatePresence in `mode="wait"`: the old phrase finishes
 * leaving before the new one starts arriving. That is two keyframes and a
 * delay, so this is CSS:
 *
 * - Both phrases sit in one grid cell, so the box is as wide as the wider of
 *   the two while they overlap and nothing reflows mid-transition.
 * - The incoming layer is mounted at once, with its entrance delayed by the
 *   exit's length and `fill-mode: both` holding it at its first keyframe
 *   until then. Its last keyframe is the readable one, so under reduced
 *   motion (every duration and delay runs through --motion-scale) the text
 *   simply appears.
 * - The outgoing layer is aria-hidden and removed on its own animationend,
 *   with a timer as a backstop for environments that never fire one.
 * - A change that lands while a phrase is still leaving replaces the pending
 *   incoming text in place: there is never more than one ghost.
 *
 * This is decoration, never an indicator.
 */

const PREFIX = "dowel-text-swap";

/** SmoothUI's Material easings, and Per Word Crossfade's keynote ease-out. */
const ENTER_EASE = "cubic-bezier(0.2, 0, 0, 1)";
const EXIT_EASE = "cubic-bezier(0.4, 0, 1, 1)";
const KEYNOTE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/*
 * --text-swap-dir is 1 forward and -1 backward; --text-swap-inline is -1 in
 * RTL, so "forward" on the x axis always means the next phrase arrives from the
 * inline end. `[dir=rtl]` covers browsers without :dir(); :dir() then corrects
 * an LTR island nested inside an RTL page.
 */
const STYLES = `
[data-slot=text-swap]{--text-swap-inline:1;--text-swap-z-in:0.9;--text-swap-z-out:1.06}
[dir=rtl] [data-slot=text-swap],[data-slot=text-swap][dir=rtl]{--text-swap-inline:-1}
[data-slot=text-swap]:dir(ltr){--text-swap-inline:1}
[data-slot=text-swap]:dir(rtl){--text-swap-inline:-1}
[data-slot=text-swap][data-direction=backward]{--text-swap-z-in:1.06;--text-swap-z-out:0.9}
[data-slot=text-swap-word]{display:inline-block;white-space:pre}
@keyframes ${PREFIX}-fade-through-in{from{opacity:0;filter:blur(2px);transform:translateY(calc(6px * var(--text-swap-dir,1))) scale(0.99)}to{opacity:1;filter:blur(0);transform:none}}
@keyframes ${PREFIX}-fade-through-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(calc(-4px * var(--text-swap-dir,1)))}}
@keyframes ${PREFIX}-axis-x-in{from{opacity:0;transform:translateX(calc(24px * var(--text-swap-dir,1) * var(--text-swap-inline,1))) scale(0.98)}to{opacity:1;transform:none}}
@keyframes ${PREFIX}-axis-x-out{from{opacity:1;transform:none}to{opacity:0;transform:translateX(calc(-20px * var(--text-swap-dir,1) * var(--text-swap-inline,1))) scale(0.98)}}
@keyframes ${PREFIX}-axis-z-in{from{opacity:0;filter:blur(2px);transform:scale(var(--text-swap-z-in,0.9))}to{opacity:1;filter:blur(0);transform:none}}
@keyframes ${PREFIX}-axis-z-out{from{opacity:1;filter:blur(0);transform:none}to{opacity:0;filter:blur(1px);transform:scale(var(--text-swap-z-out,1.06))}}
@keyframes ${PREFIX}-cut-in{from{opacity:0}to{opacity:1}}
@keyframes ${PREFIX}-cut-out{from{opacity:1}to{opacity:0}}
@keyframes ${PREFIX}-word-in{from{opacity:0;transform:translateY(calc(8px * var(--text-swap-dir,1)))}to{opacity:1;transform:none}}
`;

export type TextSwapTransition =
  "fade-through" | "per-word-crossfade" | "shared-axis-x" | "shared-axis-y" | "shared-axis-z";

interface Phase {
  keyframe: string;
  /** Milliseconds, before --motion-scale. */
  ms: number;
  ease: string;
}

interface TransitionSpec {
  /** Animated word by word rather than as one block. */
  split: boolean;
  /** Default per-word stagger in milliseconds (split transitions only). */
  stagger: number;
  enter: Phase;
  /** `null` when the source removes the old text instantly. */
  exit: Phase | null;
}

/** Timings copied from each SmoothUI source. */
const TRANSITIONS: Record<TextSwapTransition, TransitionSpec> = {
  // Enter 420ms rising 6px out of a 2px blur; exit 260ms lifting 4px.
  "fade-through": {
    split: false,
    stagger: 0,
    enter: { keyframe: "fade-through-in", ms: 420, ease: ENTER_EASE },
    exit: { keyframe: "fade-through-out", ms: 260, ease: EXIT_EASE },
  },
  // 700ms per word, 8px drift, 70ms stagger. The source has no exit.
  "per-word-crossfade": {
    split: true,
    stagger: 70,
    enter: { keyframe: "word-in", ms: 700, ease: KEYNOTE_EASE },
    exit: null,
  },
  // Enter 500ms from 24px along the inline axis; exit 360ms to -20px.
  "shared-axis-x": {
    split: false,
    stagger: 0,
    enter: { keyframe: "axis-x-in", ms: 500, ease: ENTER_EASE },
    exit: { keyframe: "axis-x-out", ms: 360, ease: EXIT_EASE },
  },
  // "Word Cut Staircase": zero-duration opacity cuts, 78ms apart per word.
  "shared-axis-y": {
    split: true,
    stagger: 78,
    enter: { keyframe: "cut-in", ms: 0, ease: "linear" },
    exit: { keyframe: "cut-out", ms: 0, ease: "linear" },
  },
  // Enter 520ms from scale 0.9 and a 2px blur; exit 360ms to 1.06 and 1px.
  "shared-axis-z": {
    split: false,
    stagger: 0,
    enter: { keyframe: "axis-z-in", ms: 520, ease: ENTER_EASE },
    exit: { keyframe: "axis-z-out", ms: 360, ease: EXIT_EASE },
  },
};

/** The transitions, in source order — for stories, docs and tests. */
export const textSwapTransitionNames = Object.keys(TRANSITIONS) as TextSwapTransition[];

const textSwapVariants = cva("[&>*]:col-start-1 [&>*]:row-start-1", {
  variants: {
    transition: {
      "fade-through": "",
      "per-word-crossfade": "",
      // The sources clip the travelling and scaling phrases to the box.
      "shared-axis-x": "overflow-x-clip",
      "shared-axis-y": "",
      "shared-axis-z": "overflow-clip",
    },
    display: {
      inline: "inline-grid",
      block: "grid",
    },
  },
  defaultVariants: {
    transition: "fade-through",
    display: "inline",
  },
});

export type TextSwapElement = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** Splits text into words and the whitespace between them. */
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

function wordCount(text: string): number {
  return tokenize(text).filter((token) => token.trim().length > 0).length;
}

/** How long a phrase takes to leave, in unscaled milliseconds. */
function exitLength(spec: TransitionSpec, text: string, step: number): number {
  if (!spec.exit) return 0;
  const stagger = spec.split ? Math.max(0, wordCount(text) - 1) * step : 0;
  return spec.exit.ms + stagger;
}

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

function animation(phase: Phase, delayMs: number, paused: boolean): CSSProperties {
  return {
    animationName: `${PREFIX}-${phase.keyframe}`,
    animationDuration: scaled(phase.ms),
    animationTimingFunction: phase.ease,
    animationDelay: scaled(delayMs),
    animationFillMode: "both",
    animationPlayState: paused ? "paused" : undefined,
  };
}

interface Layer {
  key: number;
  text: string;
  /** `static` is the first render without `appear`: no animation at all. */
  mode: "static" | "enter";
  /** Unscaled milliseconds before the entrance starts (the old phrase's exit). */
  wait: number;
}

interface SwapState {
  current: Layer;
  leaving: Layer | null;
}

export interface TextSwapProps extends Omit<ComponentPropsWithRef<"span">, "children" | "ref"> {
  /** The value. Whenever it changes, the old text animates out and the new text in. */
  children: string | number;
  /** How the old text leaves and the new text arrives. */
  transition?: TextSwapTransition;
  /**
   * Which way the change moves. `forward` (default) is the sources' motion:
   * with `shared-axis-x` the next phrase arrives from the inline end (the right
   * in LTR, the left in RTL); `backward` reverses it on every axis, and runs a
   * staircase from the last word.
   */
  direction?: "forward" | "backward";
  /** Milliseconds between words, for the split transitions. Defaults to the source's. */
  stagger?: number;
  /** Milliseconds added before every entrance. */
  delay?: number;
  /**
   * Animate the first value in too. `in-view` waits until the element
   * scrolls into view (SmoothUI's `triggerOnView`). Default `false`: only
   * changes animate.
   */
  appear?: boolean | "in-view";
  /** Rendered element. Block elements lay out as `grid`, inline ones as `inline-grid`. */
  as?: TextSwapElement;
  ref?: Ref<HTMLElement>;
}

/** Text that animates from the old string to the new one whenever it changes. */
export function TextSwap({
  children,
  transition = "fade-through",
  direction = "forward",
  stagger,
  delay = 0,
  appear = false,
  as = "span",
  className,
  style,
  ref,
  ...props
}: TextSwapProps) {
  const text = String(children);
  const spec = TRANSITIONS[transition];
  const step = stagger ?? spec.stagger;

  const [state, setState] = useState<SwapState>(() => ({
    current: { key: 0, text, mode: appear ? "enter" : "static", wait: 0 },
    leaving: null,
  }));

  // Derive the next layers during render, so the new value is never painted
  // for a frame without its transition.
  let { current, leaving } = state;
  if (text !== current.text) {
    if (leaving && spec.exit) {
      // Still leaving: the pending phrase has not started yet, so swap it.
      current = { ...current, text };
    } else {
      leaving = spec.exit ? current : null;
      const wait = spec.exit ? exitLength(spec, current.text, step) : 0;
      current = { key: current.key + 1, text, mode: "enter", wait };
    }
    setState({ current, leaving });
  }

  const [inView, setInView] = useState(appear !== "in-view");
  const node = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (inView) return;
    const element = node.current;
    if (typeof IntersectionObserver === "undefined" || !element) {
      // Nothing can tell us when it is visible: show it rather than hide it.
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView]);

  const leavingKey = leaving?.key;
  const leavingText = leaving?.text ?? "";
  const removeLeaving = useCallback((key: number) => {
    setState((previous) =>
      previous.leaving?.key === key ? { ...previous, leaving: null } : previous,
    );
  }, []);

  // A native listener rather than onAnimationEnd: React picks a vendor-prefixed
  // event name wherever AnimationEvent is missing, and would never hear it.
  useEffect(() => {
    const element = node.current;
    if (!element || leavingKey === undefined) return;
    const onEnd = (event: Event) => {
      const target = event.target as Element;
      if (!target.hasAttribute("data-swap-last")) return;
      if (
        target.closest('[data-slot="text-swap-layer"]')?.getAttribute("data-state") !== "exit"
      )
        return;
      removeLeaving(leavingKey);
    };
    element.addEventListener("animationend", onEnd);
    return () => element.removeEventListener("animationend", onEnd);
  }, [leavingKey, removeLeaving]);

  // Backstop for environments that never fire animationend.
  useEffect(() => {
    if (leavingKey === undefined) return;
    const timer = setTimeout(
      () => removeLeaving(leavingKey),
      exitLength(spec, leavingText, step) * 2 + 100,
    );
    return () => clearTimeout(timer);
  }, [leavingKey, leavingText, spec, step, removeLeaving]);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
    },
    [ref],
  );

  const paused = !inView;

  function renderLayer(layer: Layer, phase: "enter" | "exit"): ReactNode {
    const exiting = phase === "exit";
    const active = exiting ? spec.exit : layer.mode === "enter" ? spec.enter : null;
    const base = exiting ? 0 : layer.wait + delay;

    const shared = {
      "data-slot": "text-swap-layer",
      "data-state": exiting ? "exit" : layer.mode === "enter" ? "enter" : "idle",
      "aria-hidden": exiting ? true : undefined,
    } as const;

    if (!spec.split || !active) {
      return (
        <span
          key={layer.key}
          {...shared}
          data-swap-last=""
          style={active ? animation(active, base, paused) : undefined}
        >
          {layer.text}
        </span>
      );
    }

    const tokens = tokenize(layer.text);
    const words = tokens.filter((token) => token.trim().length > 0).length;
    let index = -1;
    return (
      <span key={layer.key} {...shared}>
        {exiting ? null : <span className="sr-only">{layer.text}</span>}
        <span aria-hidden="true" data-slot="text-swap-words">
          {tokens.map((token, position) => {
            if (token.trim().length === 0) return token;
            index += 1;
            const order = direction === "backward" ? words - 1 - index : index;
            const style: CSSProperties & Record<"--i", number> = {
              "--i": order,
              ...animation(active, base + order * step, paused),
            };
            return (
              <span
                key={position}
                data-slot="text-swap-word"
                data-swap-last={order === words - 1 ? "" : undefined}
                style={style}
              >
                {token}
              </span>
            );
          })}
        </span>
      </span>
    );
  }

  const Tag = as as "span";
  const display = as === "span" ? "inline" : "block";

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Tag
        ref={setRef}
        data-slot="text-swap"
        data-transition={transition}
        data-direction={direction}
        className={cn(textSwapVariants({ transition, display }), className)}
        style={
          { "--text-swap-dir": direction === "backward" ? -1 : 1, ...style } as CSSProperties
        }
        {...props}
      >
        {leaving ? renderLayer(leaving, "exit") : null}
        {renderLayer(current, "enter")}
      </Tag>
    </>
  );
}

export { textSwapVariants };
