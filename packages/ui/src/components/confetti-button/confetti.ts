// Original design.

/*
 * The pure half of the confetti burst: pieces with a position, a velocity, a
 * spin and a life, moved by gravity and drag. No DOM, so it is tested
 * directly; the burst draws whatever these functions produce.
 */

export interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation and spin, radians and radians per second. */
  angle: number;
  spin: number;
  /** Width and height in CSS pixels. */
  w: number;
  h: number;
  /** Index into the palette. */
  color: number;
  /** Seconds lived, and seconds it lives. */
  age: number;
  life: number;
  shape: "rect" | "dot";
}

export interface ConfettiOptions {
  /** How many pieces. Default 80. */
  count?: number;
  /** Launch speed in CSS pixels per second. Default 720. */
  speed?: number;
  /** Width of the fan the pieces leave in, degrees. Default 70. */
  spread?: number;
  /** Direction of the fan, degrees: 0 is up, 90 is right. Default 0. */
  angle?: number;
  /** Colours: theme tokens or CSS colours. Default the theme's accents. */
  colors?: readonly string[];
}

export const CONFETTI_GRAVITY = 1400;
const DRAG = 1.6;

/** mulberry32: small and fast, and the same on every engine. */
export function confettiRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A burst of pieces leaving (`x`, `y`) in a fan. */
export function createConfetti(
  x: number,
  y: number,
  palette: number,
  random: () => number,
  { count = 80, speed = 720, spread = 70, angle = 0 }: ConfettiOptions = {},
): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  const total = Math.max(1, Math.min(400, Math.round(count)));
  for (let i = 0; i < total; i += 1) {
    const direction = ((angle + (random() - 0.5) * spread) * Math.PI) / 180;
    const pace = speed * (0.45 + random() * 0.75);
    pieces.push({
      x,
      y,
      vx: Math.sin(direction) * pace,
      vy: -Math.cos(direction) * pace,
      angle: random() * Math.PI * 2,
      spin: (random() - 0.5) * 18,
      w: 5 + random() * 6,
      h: 3 + random() * 5,
      color: Math.floor(random() * Math.max(1, palette)),
      age: 0,
      life: 1.4 + random() * 1.2,
      shape: random() > 0.75 ? "dot" : "rect",
    });
  }
  return pieces;
}

/**
 * Moves every piece one step, in place, and drops those that have run their
 * life or left the screen below. Returns whether any remain.
 */
export function stepConfetti(pieces: ConfettiPiece[], delta: number, bottom: number): boolean {
  const slow = Math.exp(-DRAG * delta);
  let kept = 0;
  for (const piece of pieces) {
    piece.vx *= slow;
    piece.vy = piece.vy * slow + CONFETTI_GRAVITY * delta;
    piece.x += piece.vx * delta;
    piece.y += piece.vy * delta;
    piece.angle += piece.spin * delta;
    piece.age += delta;
    if (piece.age < piece.life && piece.y < bottom + 40) pieces[kept++] = piece;
  }
  pieces.length = kept;
  return kept > 0;
}

/** A piece's opacity: full, then fading over the last third of its life. */
export function confettiAlpha(piece: ConfettiPiece): number {
  const left = 1 - piece.age / piece.life;
  return Math.max(0, Math.min(1, left * 3));
}
