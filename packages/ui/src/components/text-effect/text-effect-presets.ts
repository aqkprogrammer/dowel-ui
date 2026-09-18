// Ported from SmoothUI text animations (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.

/*
 * The data half of TextEffect: one row per SmoothUI source, and the hoisted
 * stylesheet generated from it. Timing, easing, stagger, distance and blur
 * are the sources' own numbers.
 */

export const PREFIX = "dowel-text-effect";

/** How a string is split. `whole` animates it as one piece. */
export type TextEffectUnit = "character" | "word" | "line" | "whole";

/** Where reveal-text travels to. `start`/`end` follow reading direction. */
export type TextEffectDirection = "up" | "down" | "start" | "end";

/** A resting pose's opposite: where a piece starts (or, for an exit, ends). */
interface Pose {
  /** Defaults to 0. */
  opacity?: number;
  /** Pixels along the inline axis; negative is toward the inline start. */
  x?: number;
  /** Pixels; positive is down. */
  y?: number;
  scale?: number;
  /** Blur radius in pixels. */
  blur?: number;
}

interface Timing {
  /** Milliseconds. */
  duration: number;
  ease: string;
}

export interface PresetSpec extends Timing {
  /** The source's split unit. */
  by: TextEffectUnit;
  /** Milliseconds between pieces. */
  stagger: number;
  /** The entrance pose. */
  from?: Pose;
  /** reveal-text: one entrance pose per `direction`. */
  directions?: Record<TextEffectDirection, Pose>;
  /** Raw keyframes, for a motion that is not pose → rest. */
  frames?: string;
  /** Stagger by distance from the center, or from the nearest edge. */
  order?: "center" | "edges";
  /** Repeats until reduced motion or unmount stops it. */
  loop?: boolean;
  /** Each piece rises out of an overflow-hidden mask. */
  mask?: boolean;
  /**
   * The phrase builders. `row` and `column` grow each word's slot from zero,
   * so the words already placed are pushed aside as the phrase re-centres;
   * `glide` moves the whole phrase while its words fade in. The split is
   * intrinsic to these, so `by` does not apply.
   */
  layout?: "row" | "column" | "glide";
  /** Duration of the first piece, when it differs (it has nothing to push). */
  first?: number;
  /** Motion of the phrase as a whole (`glide`). */
  group?: Timing & { from: Pose };
  /** The source's own exit. Without one, `mode="exit"` plays the entrance backwards. */
  exit?: Timing & { target: "pieces" | "group"; to: Pose };
  /** Classes on the root: the layout the source's root had. */
  root?: string;
}

const EASE_OUT = "var(--ease-out-quint)"; // cubic-bezier(0.22, 1, 0.36, 1), the sources' default
const EASE_STAGE = "cubic-bezier(0.18, 1, 0.32, 1)";
const EASE_BUILD = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EASE_EXIT = "cubic-bezier(0.4, 0, 0.2, 1)";

export const PRESETS = {
  // An entrance despite its name: words arrive clean from a blur, drifting up.
  "blur-out-up": {
    by: "word",
    stagger: 28,
    duration: 560,
    ease: EASE_OUT,
    from: { blur: 6, y: 10 },
  },
  "bottom-up-letters": {
    by: "character",
    stagger: 88,
    duration: 400,
    ease: EASE_STAGE,
    from: { y: 46 },
  },
  "depth-parallax-words": {
    by: "word",
    stagger: 70,
    duration: 700,
    ease: EASE_OUT,
    from: { blur: 3, scale: 0.92, y: 18 },
  },
  "focus-blur-resolve": {
    by: "whole",
    stagger: 0,
    duration: 760,
    ease: EASE_OUT,
    from: { blur: 14, scale: 1.01, y: 14 },
  },
  "kinetic-center-build": {
    by: "word",
    stagger: 430,
    duration: 430,
    first: 340,
    ease: EASE_BUILD,
    from: { blur: 3.5, scale: 0.992, x: 88, y: 6 },
    layout: "row",
    exit: { target: "pieces", to: { blur: 2.5, y: -6 }, duration: 260, ease: EASE_EXIT },
    root: "block",
  },
  "line-by-line-slide": {
    by: "line",
    stagger: 120,
    duration: 900,
    ease: EASE_OUT,
    from: { x: -48 },
    root: "block",
  },
  "mask-reveal-up": {
    by: "line",
    stagger: 90,
    duration: 760,
    ease: EASE_OUT,
    from: { blur: 6, y: 30 },
    mask: true,
    root: "block",
  },
  "micro-scale-fade": {
    by: "whole",
    stagger: 0,
    duration: 600,
    ease: "cubic-bezier(0.32, 0.72, 0, 1)",
    from: { scale: 0.96 },
  },
  "per-character-rise": {
    by: "character",
    stagger: 24,
    duration: 700,
    ease: EASE_BUILD,
    from: { y: 32 },
  },
  // The source leaves x/y on motion's default spring; a 250ms spring is an overshoot curve.
  "reveal-text": {
    by: "whole",
    stagger: 0,
    duration: 250,
    ease: "var(--ease-overshoot)",
    directions: { up: { y: 24 }, down: { y: -24 }, start: { x: 24 }, end: { x: -24 } },
  },
  "scale-down-fade": {
    by: "whole",
    stagger: 0,
    duration: 520,
    ease: EASE_OUT,
    from: { scale: 1.04, y: 8 },
  },
  "short-slide-down": {
    by: "word",
    stagger: 500,
    duration: 500,
    first: 360,
    ease: EASE_BUILD,
    from: { blur: 2.4, scale: 0.992, y: -28 },
    layout: "column",
    exit: { target: "pieces", to: { blur: 1.2, y: 10 }, duration: 320, ease: EASE_EXIT },
    root: "block",
  },
  "short-slide-right": {
    by: "word",
    stagger: 92,
    duration: 210,
    ease: EASE_BUILD,
    from: {},
    layout: "glide",
    group: { from: { opacity: 1, blur: 1.2, x: -24 }, duration: 520, ease: EASE_BUILD },
    exit: { target: "group", to: { blur: 1, x: 12 }, duration: 320, ease: EASE_EXIT },
    root: "relative inline-block overflow-hidden align-bottom",
  },
  "soft-blur-in": {
    by: "character",
    stagger: 25,
    duration: 900,
    ease: EASE_OUT,
    from: { blur: 12, y: 16 },
  },
  "spring-scale-in": {
    by: "word",
    stagger: 95,
    duration: 360,
    ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    from: { scale: 0.7 },
  },
  "stagger-from-center": {
    by: "character",
    stagger: 22,
    duration: 620,
    ease: EASE_OUT,
    from: { blur: 3, y: 12 },
    order: "center",
  },
  "stagger-from-edges": {
    by: "character",
    stagger: 22,
    duration: 620,
    ease: EASE_OUT,
    from: { blur: 3, y: 12 },
    order: "edges",
  },
  "top-down-letters": {
    by: "character",
    stagger: 88,
    duration: 400,
    ease: EASE_STAGE,
    from: { y: -46 },
  },
  // A loop, not an entrance: each letter bobs up, down and back to rest.
  "wave-text": {
    by: "character",
    stagger: 50,
    duration: 1200,
    ease: "cubic-bezier(0.37, 0, 0.63, 1)",
    loop: true,
    frames:
      "0%,50%,100%{transform:translateY(0)}" +
      "25%{transform:translateY(calc(var(--text-effect-amplitude, 8px) * -1))}" +
      "75%{transform:translateY(calc(var(--text-effect-amplitude, 8px) * .5))}",
  },
} satisfies Record<string, PresetSpec>;

export type TextEffectPreset = keyof typeof PRESETS;

/** Every preset, in catalogue order. Stories and tests iterate this. */
export const textEffectPresetNames = Object.keys(PRESETS) as TextEffectPreset[];

/* Keyframes ------------------------------------------------------------- */

function pose(p: Pose): string {
  const rules = [`opacity:${String(p.opacity ?? 0)}`];
  const moves: string[] = [];
  if (p.x || p.y) {
    const x = p.x ? `calc(var(--text-effect-inline, 1) * ${String(p.x)}px)` : "0";
    moves.push(`translate(${x},${String(p.y ?? 0)}px)`);
  }
  if (p.scale !== undefined) moves.push(`scale(${String(p.scale)})`);
  if (moves.length > 0) rules.push(`transform:${moves.join(" ")}`);
  if (p.blur) rules.push(`filter:blur(${String(p.blur)}px)`);
  return rules.join(";");
}

/** Rest for exactly the properties a pose moves: visible, untransformed, sharp. */
function rest(p: Pose): string {
  const rules = ["opacity:1"];
  if (p.x || p.y || p.scale !== undefined) rules.push("transform:none");
  if (p.blur) rules.push("filter:none");
  return rules.join(";");
}

const enter = (name: string, p: Pose) => `@keyframes ${name}{from{${pose(p)}}to{${rest(p)}}}`;
const leave = (name: string, p: Pose) => `@keyframes ${name}{from{${rest(p)}}to{${pose(p)}}}`;

function keyframesFor(name: TextEffectPreset): string {
  const spec: PresetSpec = PRESETS[name];
  const id = `${PREFIX}-${name}`;
  const out: string[] = [];
  if (spec.frames) out.push(`@keyframes ${id}{${spec.frames}}`);
  if (spec.from) out.push(enter(id, spec.from));
  if (spec.directions) {
    for (const [direction, p] of Object.entries(spec.directions)) {
      out.push(enter(`${id}-${direction}`, p));
    }
  }
  if (spec.group) out.push(enter(`${id}-group`, spec.group.from));
  if (spec.exit) out.push(leave(`${id}-exit`, spec.exit.to));
  return out.join("\n");
}

const PIECE = "[data-slot=text-effect-piece]";
const CELL = "[data-slot=text-effect-cell]";
const CONTENT = "[data-slot=text-effect-content]";

export const STYLES = `
[data-slot=text-effect]:dir(rtl){--text-effect-inline:-1}
${PIECE}{display:inline-block;white-space:pre;animation-name:var(--text-effect-name,none);animation-duration:var(--text-effect-duration);animation-timing-function:var(--text-effect-ease);animation-delay:calc((var(--text-effect-delay) + var(--i, 0) * var(--text-effect-stagger)) * var(--motion-scale, 1));animation-iteration-count:var(--text-effect-count,1);animation-direction:var(--text-effect-direction,normal);animation-fill-mode:both}
[data-slot=text-effect-word]{display:inline-block;white-space:nowrap}
[data-slot=text-effect-mask]{display:inline-block;overflow:hidden;vertical-align:bottom}
[data-by=line]>${PIECE},[data-by=line]>[data-slot=text-effect-mask],[data-by=line] [data-slot=text-effect-mask]>${PIECE}{display:block}
${CONTENT}[data-layout=row]{display:flex;flex-wrap:wrap;align-items:center;justify-content:center}
${CONTENT}[data-layout=column]{display:flex;flex-direction:column;align-items:center}
${CONTENT}[data-layout=glide]{display:inline-flex;flex-wrap:nowrap;gap:.25em}
${CELL}{display:grid;grid-template-columns:1fr;grid-template-rows:1fr;min-width:0;min-height:0;animation-name:var(--text-effect-grow,none);animation-duration:var(--text-effect-duration);animation-timing-function:var(--text-effect-ease);animation-delay:calc((var(--text-effect-delay) + var(--i, 0) * var(--text-effect-stagger)) * var(--motion-scale, 1));animation-fill-mode:both}
${CELL}[data-first]{animation-name:none}
${CELL}>${PIECE}{min-width:0;min-height:0}
[data-layout=row]>${CELL}+${CELL}>${PIECE}{padding-inline-start:10px}
[data-layout=column]>${CELL}+${CELL}>${PIECE}{padding-block-start:12px}
[data-slot=text-effect][data-state=idle] :is(${PIECE},${CELL},${CONTENT}){animation-play-state:paused}
@media (prefers-reduced-motion: reduce){${PIECE}{animation-iteration-count:1}}
@keyframes ${PREFIX}-grow-inline{from{grid-template-columns:0fr}to{grid-template-columns:1fr}}
@keyframes ${PREFIX}-grow-block{from{grid-template-rows:0fr}to{grid-template-rows:1fr}}
${textEffectPresetNames.map(keyframesFor).join("\n")}
`;
