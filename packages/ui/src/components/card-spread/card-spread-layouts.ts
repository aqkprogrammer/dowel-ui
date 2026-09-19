// Ported from amicro "Card Spreads" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.

/*
 * The geometry of every spread, as pure functions of (index, count).
 *
 * amicro hard-codes each spread for five (or seven) cards in pixels, for a
 * card 128 × 176 px. Here each is one formula, so any number of cards works,
 * and every distance is a percentage of the card itself — `translate(%)`
 * resolves against the element's own box — so a spread keeps its proportions
 * at any card size. The defaults reproduce amicro's positions to within a few
 * pixels at five cards.
 *
 * Units, in every pose:
 * - `x` is a percentage of the card's width (positive = toward the inline end
 *   once the component applies its direction flip),
 * - `y` a percentage of the card's height (positive = down),
 * - `rotate` degrees (positive = clockwise in LTR),
 * - `scale` a factor, `z` a stacking order.
 */

export const CARD_SPREAD_LAYOUTS = [
  "arc",
  "long-arc",
  "linear",
  "corner",
  "stamp",
  "cascade",
  "scatter",
  "wheel",
] as const;

export type CardSpreadLayout = (typeof CARD_SPREAD_LAYOUTS)[number];

export interface CardSpreadPose {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
}

/**
 * The three knobs amicro's adjustable Stamp Arc exposes, generalised to every
 * layout. Each layout reads the ones that mean something to it.
 */
export interface CardSpreadTuning {
  /** Rotation between neighbouring cards, in degrees. */
  arc?: number;
  /** Horizontal distance between neighbouring cards, as a percentage of card width. */
  gap?: number;
  /**
   * Vertical travel, as a percentage of card height. For the curved layouts it
   * is the curvature: a card `d` steps from the centre drops `offset × d²`.
   * For `cascade` it is the rise per card.
   */
  offset?: number;
}

export interface CardSpreadOrigin {
  /** Horizontal offset of the transform origin from the card's centre, in % of its width. */
  x: number;
  /** Vertical transform origin, in % of the card's height from its top edge. */
  y: number;
}

interface LayoutSpec {
  defaults: Required<CardSpreadTuning>;
  origin: CardSpreadOrigin;
  open: (d: number, i: number, count: number, t: Required<CardSpreadTuning>) => CardSpreadPose;
  rest?: (d: number, i: number, count: number) => Partial<CardSpreadPose>;
}

const BOTTOM: CardSpreadOrigin = { x: 0, y: 100 };
const CENTRE: CardSpreadOrigin = { x: 0, y: 50 };

/** Stacking order that keeps the centre card on top and falls off symmetrically. */
function centred(d: number, count: number): number {
  return Math.round(count - Math.abs(d) * 2);
}

/** The card sitting exactly at the centre, if there is one (odd counts only). */
function isCentre(d: number): boolean {
  return Math.abs(d) < 0.5;
}

/**
 * The shared shape of amicro's arcs: a fixed step in angle and distance, and a
 * parabolic drop. `lift` is how far the centre card rises, in units of
 * `offset × centre`; it is what separates the ARC's steep curve from the Long
 * ARC's and Stamp's flatter one.
 */
function arcPose(lift: number): LayoutSpec["open"] {
  return (d, _i, count, t) => {
    const centre = (count - 1) / 2;
    return {
      x: d * t.gap,
      y: t.offset * (d * d - lift * centre),
      rotate: d * t.arc,
      scale: isCentre(d) ? 1.05 : 1,
      z: centred(d, count),
    };
  };
}

/**
 * Small fixed offsets that make the dealt hand look dealt rather than ruled.
 * Deterministic — the same card always lands in the same place — and taken
 * from the difference between amicro's hand-placed coordinates and the
 * formula, so five cards land where amicro put them.
 */
const SCATTER_JITTER: readonly { x: number; y: number; r: number }[] = [
  { x: -1, y: -1.5, r: 0 },
  { x: 2, y: 1.75, r: 1 },
  { x: 0, y: 0, r: 2 },
  { x: -2, y: 4.5, r: 1 },
  { x: 1, y: 1.5, r: 1 },
];

const LAYOUTS: Record<CardSpreadLayout, LayoutSpec> = {
  // ARC (5 Cards) and ARC (7 Cards): 15° and ~36 px per step, a 5 px/step² curve.
  arc: {
    defaults: { arc: 15, gap: 28, offset: 2.8 },
    origin: BOTTOM,
    open: arcPose(1),
  },
  // Long ARC (5 Cards): half the angle, twice the reach.
  "long-arc": {
    defaults: { arc: 7.5, gap: 55, offset: 3.5 },
    origin: BOTTOM,
    open: arcPose(0.4),
  },
  // Linear Spread: a row, no rotation, no curve.
  linear: {
    defaults: { arc: 0, gap: 35, offset: 0 },
    origin: CENTRE,
    open: (d, _i, count, t) => ({
      x: d * t.gap,
      y: t.offset * d * d,
      rotate: d * t.arc,
      scale: isCentre(d) ? 1.05 : 1,
      z: centred(d, count),
    }),
  },
  // Corner Fan: pivots on the bottom inline-start corner, first card a step back.
  corner: {
    defaults: { arc: 10, gap: 0, offset: 0 },
    origin: { x: -50, y: 100 },
    open: (_d, i, count, t) => ({
      x: i * t.gap,
      y: i * t.offset,
      rotate: (i - 1) * t.arc,
      scale: i === Math.floor((count - 1) / 2) ? 1.03 : 1,
      z: count - i,
    }),
  },
  // Stamp Arc (Adjustable): the widest, flattest arc; arc/gap/offset are its sliders.
  stamp: {
    defaults: { arc: 12.5, gap: 70, offset: 7.1 },
    origin: BOTTOM,
    open: arcPose(0.4),
  },
  // Cascade Stagger Fan: climbs diagonally, each card a step up and across.
  cascade: {
    defaults: { arc: 6, gap: 11, offset: 16 },
    origin: CENTRE,
    open: (d, _i, count, t) => ({
      x: d * t.gap,
      y: -d * t.offset - t.offset / 2,
      rotate: d * t.arc,
      scale: isCentre(d) ? 1.05 : 0.98,
      z: centred(d, count),
    }),
    // Closed, the deck shows its edges: each card sits a hair below the last.
    rest: (d) => ({ y: d * 1.1 }),
  },
  // Scatter Desk Deal: an overlapping, slightly irregular dealt hand.
  scatter: {
    defaults: { arc: 7, gap: 29, offset: 6.75 },
    origin: CENTRE,
    open: (d, i, count, t) => {
      const jitter = SCATTER_JITTER[i % SCATTER_JITTER.length] ?? { x: 0, y: 0, r: 0 };
      return {
        x: d * t.gap + jitter.x,
        y: t.offset * d * d - 17 + jitter.y,
        rotate: d * t.arc + jitter.r,
        scale: isCentre(d) ? 1.05 : 0.98,
        z: centred(d, count),
      };
    },
  },
  // Wheel Radial Fan: rotates about a hub just below the cards.
  wheel: {
    defaults: { arc: 18, gap: 0, offset: 2.8 },
    origin: { x: 0, y: 110 },
    open: (d, _i, count, t) => {
      const centre = (count - 1) / 2;
      return {
        x: d * t.gap,
        y: t.offset * (d * d - centre * centre - 1.6),
        rotate: d * t.arc,
        scale: isCentre(d) ? 1.05 : 0.98,
        z: centred(d, count),
      };
    },
  },
};

/** The tuning a layout uses when none is given. */
export function getCardSpreadDefaults(layout: CardSpreadLayout): Required<CardSpreadTuning> {
  return { ...LAYOUTS[layout].defaults };
}

/** Where a layout's cards pivot. */
export function getCardSpreadOrigin(layout: CardSpreadLayout): CardSpreadOrigin {
  return { ...LAYOUTS[layout].origin };
}

/**
 * The pose of card `index` of `count`, open or closed.
 *
 * Undefined tuning values fall back to the layout's defaults, so a consumer
 * can adjust one knob without restating the others.
 */
export function getCardSpreadPose(
  layout: CardSpreadLayout,
  index: number,
  count: number,
  open: boolean,
  tuning: CardSpreadTuning = {},
): CardSpreadPose {
  const spec = LAYOUTS[layout];
  const d = index - (count - 1) / 2;

  if (!open) {
    const base: CardSpreadPose = {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      z: layout === "corner" ? count - index : centred(d, count),
    };
    return { ...base, ...spec.rest?.(d, index, count) };
  }

  const t: Required<CardSpreadTuning> = {
    arc: tuning.arc ?? spec.defaults.arc,
    gap: tuning.gap ?? spec.defaults.gap,
    offset: tuning.offset ?? spec.defaults.offset,
  };
  return spec.open(d, index, count, t);
}
