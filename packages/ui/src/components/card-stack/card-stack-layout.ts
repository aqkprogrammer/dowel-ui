// Ported from SmoothUI Scrollable Card Stack (MIT, © 2024 Eduardo Calvo) and bencho Card stack (MIT, © 2026 Lorenzo Cabra). See THIRD_PARTY_NOTICES.md.
import type { CSSProperties } from "react";

/*
 * Where each card sits. Pure functions of index and state, so the component
 * only chooses which one applies, and the geometry can be read (and tested)
 * on its own.
 */

/* Deck: SmoothUI's numbers. Each card behind the top one is 8% smaller and
 * 30px higher, up to three deep; cards already passed fade and blur away. */
const DECK_SCALE_STEP = 0.08;
const DECK_RISE = -30;
const DECK_MAX_RISE = DECK_RISE * 3;

export function deckCardStyle(index: number, current: number, count: number): CSSProperties {
  const offset = index - current;
  const passed = offset < 0;
  const scale = Math.min(Math.max(1 - offset * DECK_SCALE_STEP, DECK_SCALE_STEP), 2);
  const rise = Math.max(offset * DECK_RISE, DECK_MAX_RISE);

  return {
    transform: `translateY(${String(rise)}px) scale(${String(scale)})`,
    opacity: passed ? 0 : 1,
    filter: passed ? "blur(2px)" : "none",
    zIndex: count - index,
  };
}

/*
 * Fan: bencho's idea, our numbers. Every card turns about one pivot far below
 * the pile, so the sideways travel, the drop of the outer cards and their tilt
 * are one rotation rather than three values that never quite agree.
 *
 * The pile is seeded, not random — the same on every render and every copy —
 * so it looks set down by hand rather than squared up by a computer. These
 * seeds are our own; each column is -1..1 and multiplied by `scatter`.
 */
const SEEDS = [
  { rot: -0.55, dx: 0.35, dy: -0.3, beat: 0.3, tune: -0.2 },
  { rot: 0.7, dx: -0.45, dy: 0.2, beat: -0.4, tune: 0.35 },
  { rot: -0.2, dx: 0.6, dy: 0.45, beat: 0.6, tune: -0.45 },
  { rot: 0.4, dx: -0.2, dy: -0.5, beat: -0.1, tune: 0.15 },
  { rot: -0.8, dx: -0.6, dy: 0.1, beat: 0.45, tune: 0.5 },
  { rot: 0.25, dx: 0.15, dy: -0.15, beat: -0.55, tune: -0.3 },
] as const;

/** Degrees a scattered card sits off square, at full scatter. */
const REST_TILT = 7;
/** Pixels a scattered card sits off centre, at full scatter. */
const REST_DRIFT = 6;
/** Pixels each card rises above the one beneath it in the closed pile. */
const REST_RISE = 3;
/** How much smaller each card beneath the top one is in the closed pile. */
const REST_SHRINK = 0.025;
/** Milliseconds between one card starting to move and the next. */
const STAGGER = 35;
const DURATION = 420;

export interface FanState {
  fanned: boolean;
  /** 0–100. */
  spread: number;
  /** 0–100. */
  scatter: number;
}

export function fanCardStyle(index: number, count: number, state: FanState): CSSProperties {
  const seed = SEEDS[index % SEEDS.length] ?? SEEDS[0];
  const scatter = Math.min(Math.max(state.scatter, 0), 100) / 100;
  const spread = Math.min(Math.max(state.spread, 0), 100) / 100;
  const depth = count - 1 - index;
  const fromCentre = index - (count - 1) / 2;
  // The arc is never zero: a stack that does not open reads as broken.
  const arc = 10 + spread * 30;
  const step = count > 1 ? arc / (count - 1) : 0;

  const x = state.fanned ? 0 : seed.dx * scatter * REST_DRIFT;
  const y = state.fanned ? 0 : -depth * REST_RISE + seed.dy * scatter * REST_DRIFT;
  const angle = state.fanned
    ? fromCentre * step + seed.rot * scatter * 0.3 * step
    : seed.rot * scatter * REST_TILT;
  const scale = state.fanned ? 1 : 1 - depth * REST_SHRINK;

  // Opening starts from the top card; closing from the bottom one. The beat
  // keeps six cards on one easing from all landing on the same frame.
  const order = state.fanned ? depth : index;
  const delay = Math.max(0, STAGGER * (order + seed.beat * scatter * 0.6));
  const duration = DURATION * (1 + seed.tune * scatter * 0.45);

  return {
    transform:
      `translate(calc(var(--card-stack-flip, 1) * ${x.toFixed(2)}px), ${y.toFixed(2)}px) ` +
      `rotate(calc(var(--card-stack-flip, 1) * ${angle.toFixed(3)}deg)) scale(${scale.toFixed(3)})`,
    transformOrigin: "50% calc(50% + 12.5rem)",
    transitionDelay: `calc(${delay.toFixed(0)}ms * var(--motion-scale, 1))`,
    transitionDuration: `calc(${duration.toFixed(0)}ms * var(--motion-scale, 1))`,
    zIndex: index,
  };
}
