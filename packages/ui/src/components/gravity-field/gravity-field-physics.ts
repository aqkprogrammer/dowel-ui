// Original design (pattern inspired by Rare UI Gravity Letters; no code referenced).

/*
 * A small rigid-body world for GravityField: discs under gravity, in a box.
 *
 * - Integration is semi-implicit Euler on a fixed substep, so the result does
 *   not depend on the frame rate, and speed is capped per substep so a fast
 *   glyph cannot tunnel through a small one.
 * - Contacts (disc–disc and disc–wall) are solved together as impulses over a
 *   few iterations: a normal impulse with restitution (none below a small
 *   impact speed, so resting contacts do not buzz), and a Coulomb friction
 *   impulse at the contact point that also turns the disc — that is what makes
 *   glyphs tumble when they glance off each other and roll to a stop. Resting
 *   contacts get friction from an estimate of the weight they carry, so a pile
 *   holds a slope and forms rounded hills instead of spreading flat.
 * - Overlap is corrected positionally, split by inverse mass, with a little
 *   slop so stacked discs do not jitter.
 * - Disc pairs come from a spatial hash rebuilt each substep: only discs in
 *   neighbouring cells are compared.
 * - A disc that has been slow for long enough falls asleep. Sleeping discs are
 *   immovable to the rest of the world until something hits them hard, the
 *   gravity changes, or the world is disturbed (`wakeAll`). A settled pile is
 *   therefore perfectly still, and the caller can stop its loop.
 *
 * Units are pixels and seconds. Coordinates are physical — x to the right,
 * y down — because gravity has no reading direction.
 */

export interface GravityBody {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radians, clockwise. */
  angle: number;
  /** Radians per second, clockwise. */
  spin: number;
  r: number;
  invMass: number;
  /** Seconds spent below the sleep thresholds. */
  still: number;
  asleep: boolean;
  touching: boolean;
}

export interface GravityWorld {
  width: number;
  height: number;
  /** Gravity, px/s². */
  gx: number;
  gy: number;
  bodies: GravityBody[];
}

export const PHYSICS = {
  /** Fixed substep, seconds. */
  step: 1 / 180,
  /** Longest frame simulated at once; a longer gap is treated as a pause. */
  maxFrame: 1 / 20,
  iterations: 4,
  restitution: 0.32,
  wallRestitution: 0.36,
  /** Impacts slower than this (px/s) do not bounce. */
  bounceThreshold: 70,
  friction: 0.6,
  /** Fraction of velocity lost per second in flight. */
  airDrag: 0.1,
  /** Fraction of velocity and spin lost per second while touching something. */
  contactDrag: 1.8,
  rollingDrag: 3,
  sleepSpeed: 16,
  sleepSpin: 0.9,
  sleepTime: 0.28,
  /** A sleeping disc hit faster than this (px/s) wakes up. */
  wakeSpeed: 110,
  /** Overlap left uncorrected, px. */
  slop: 0.2,
  /** Fraction of overlap corrected per iteration. */
  correction: 0.7,
} as const;

/** Collision radius as a fraction of a glyph's box. */
export const GLYPH_RADIUS = 0.42;

export function createWorld(width = 0, height = 0, gravity = 2000): GravityWorld {
  return { width, height, gx: 0, gy: gravity, bodies: [] };
}

export function createBody(
  id: number,
  x: number,
  y: number,
  r: number,
  { vx = 0, vy = 0, spin = 0 }: { vx?: number; vy?: number; spin?: number } = {},
): GravityBody {
  const radius = Math.max(1, r);
  return {
    id,
    x,
    y,
    vx,
    vy,
    angle: 0,
    spin,
    r: radius,
    // Mass grows with area, normalised so a 16px disc weighs 1.
    invMass: 1 / (radius / 16) ** 2,
    still: 0,
    asleep: false,
    touching: false,
  };
}

export function wake(body: GravityBody) {
  body.asleep = false;
  body.still = 0;
}

export function wakeAll(world: GravityWorld) {
  for (const body of world.bodies) wake(body);
}

export function awakeCount(world: GravityWorld): number {
  let count = 0;
  for (const body of world.bodies) if (!body.asleep) count += 1;
  return count;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Keeps a disc inside the box, for a box that shrank or a disc placed outside it. */
export function contain(world: GravityWorld, body: GravityBody) {
  const { width, height } = world;
  body.x = width > body.r * 2 ? clamp(body.x, body.r, width - body.r) : width / 2;
  body.y = height > body.r * 2 ? clamp(body.y, body.r, height - body.r) : height / 2;
}

function inside(world: GravityWorld, body: GravityBody) {
  return (
    body.x >= body.r &&
    body.y >= body.r &&
    body.x <= world.width - body.r &&
    body.y <= world.height - body.r
  );
}

/**
 * Moves a new disc out of any disc it was dropped inside, stepping it against
 * gravity so it lands on the pile rather than exploding out of it.
 */
export function placeFree(world: GravityWorld, body: GravityBody) {
  const g = Math.hypot(world.gx, world.gy);
  const ux = g > 0 ? -world.gx / g : 0;
  const uy = g > 0 ? -world.gy / g : -1;
  contain(world, body);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const hit = world.bodies.find(
      (other) =>
        other !== body && Math.hypot(other.x - body.x, other.y - body.y) < other.r + body.r,
    );
    if (!hit) return;
    // Along "up" from the disc it hit, just clear of it.
    const along = (body.x - hit.x) * ux + (body.y - hit.y) * uy;
    const across2 = (body.x - hit.x) ** 2 + (body.y - hit.y) ** 2 - along ** 2;
    const reach = Math.sqrt(Math.max(0, (hit.r + body.r + 0.5) ** 2 - across2));
    const lift = reach - along;
    body.x += ux * lift;
    body.y += uy * lift;
    // Out of the top of the box: the pile is full here. Leave it to the solver.
    if (!inside(world, body)) {
      contain(world, body);
      return;
    }
  }
}

/*
 * One contact between `a` and `b` (or a wall, when `b` is null), with the
 * normal (nx, ny) pointing from a toward b and `depth` the overlap.
 */
function resolve(
  world: GravityWorld,
  h: number,
  a: GravityBody,
  b: GravityBody | null,
  nx: number,
  ny: number,
  depth: number,
  wa: number,
  wb: number,
  restitution: number,
) {
  const w = wa + wb;
  if (w <= 0) return;

  const push = (Math.max(0, depth - PHYSICS.slop) * PHYSICS.correction) / w;
  a.x -= nx * push * wa;
  a.y -= ny * push * wa;
  if (b) {
    b.x += nx * push * wb;
    b.y += ny * push * wb;
  }

  const bvx = b ? b.vx : 0;
  const bvy = b ? b.vy : 0;
  const vn = (bvx - a.vx) * nx + (bvy - a.vy) * ny;
  let jn = 0;
  if (vn < 0) {
    const e = -vn > PHYSICS.bounceThreshold ? restitution : 0;
    jn = (-(1 + e) * vn) / w;
    a.vx -= jn * wa * nx;
    a.vy -= jn * wa * ny;
    if (b) {
      b.vx += jn * wb * nx;
      b.vy += jn * wb * ny;
    }
  }

  // Friction at the contact point. For a solid disc the tangential effective
  // mass is a third of the linear one, which is where the 3 comes from.
  const tx = -ny;
  const ty = nx;
  const vt =
    ((b ? b.vx : 0) - a.vx) * tx +
    ((b ? b.vy : 0) - a.vy) * ty -
    (b ? b.spin * b.r : 0) -
    a.spin * a.r;
  const weight = (Math.abs(world.gx * nx + world.gy * ny) * h) / w;
  const limit = PHYSICS.friction * (jn + weight);
  const jt = clamp(-vt / (3 * w), -limit, limit);
  a.vx -= jt * wa * tx;
  a.vy -= jt * wa * ty;
  a.spin -= (2 * jt * wa) / a.r;
  a.touching = true;
  if (b) {
    b.vx += jt * wb * tx;
    b.vy += jt * wb * ty;
    b.spin -= (2 * jt * wb) / b.r;
    b.touching = true;
  }
}

function collide(world: GravityWorld, h: number, a: GravityBody, b: GravityBody) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= reach * reach) return;
  if (a.asleep && b.asleep) return;
  const d = Math.sqrt(d2);
  const nx = d > 1e-6 ? dx / d : 0;
  const ny = d > 1e-6 ? dy / d : 1;
  const impact = -((b.vx - a.vx) * nx + (b.vy - a.vy) * ny);
  if (a.asleep && impact > PHYSICS.wakeSpeed) wake(a);
  if (b.asleep && impact > PHYSICS.wakeSpeed) wake(b);
  resolve(
    world,
    h,
    a,
    b,
    nx,
    ny,
    reach - d,
    a.asleep ? 0 : a.invMass,
    b.asleep ? 0 : b.invMass,
    PHYSICS.restitution,
  );
}

function walls(world: GravityWorld, h: number, body: GravityBody) {
  const e = PHYSICS.wallRestitution;
  const { width, height } = world;
  if (body.y + body.r > height)
    resolve(world, h, body, null, 0, 1, body.y + body.r - height, body.invMass, 0, e);
  if (body.y - body.r < 0)
    resolve(world, h, body, null, 0, -1, body.r - body.y, body.invMass, 0, e);
  if (body.x - body.r < 0)
    resolve(world, h, body, null, -1, 0, body.r - body.x, body.invMass, 0, e);
  if (body.x + body.r > width)
    resolve(world, h, body, null, 1, 0, body.x + body.r - width, body.invMass, 0, e);
}

/** Buckets disc indices by cell, `size` wide, keyed row-major. */
function hash(world: GravityWorld, size: number) {
  const cells = new Map<number, number[]>();
  const columns = Math.max(1, Math.ceil(world.width / size)) + 2;
  const key = (cx: number, cy: number) => cy * columns + cx;
  world.bodies.forEach((body, index) => {
    const cx = clamp(Math.floor(body.x / size), -1, columns - 2) + 1;
    const cy = Math.max(-1, Math.floor(body.y / size)) + 1;
    const k = key(cx, cy);
    const bucket = cells.get(k);
    if (bucket) bucket.push(index);
    else cells.set(k, [index]);
  });
  return { cells, columns, key };
}

function substep(world: GravityWorld, h: number) {
  const { bodies } = world;
  let largest = 1;
  for (const body of bodies) {
    body.touching = false;
    if (body.r > largest) largest = body.r;
    if (body.asleep) continue;
    body.vx += world.gx * h;
    body.vy += world.gy * h;
    const drag = 1 - PHYSICS.airDrag * h;
    body.vx *= drag;
    body.vy *= drag;
    // No faster than most of a radius per substep, so nothing tunnels.
    const cap = (body.r * 0.8) / h;
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > cap) {
      body.vx *= cap / speed;
      body.vy *= cap / speed;
    }
    body.x += body.vx * h;
    body.y += body.vy * h;
    body.angle += body.spin * h;
  }

  const size = largest * 2;
  const { cells, columns, key } = hash(world, size);
  for (let iteration = 0; iteration < PHYSICS.iterations; iteration += 1) {
    for (const [k, bucket] of cells) {
      const cx = k % columns;
      const cy = Math.floor(k / columns);
      for (const i of bucket) {
        const a = bodies[i];
        if (!a) continue;
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const neighbours = cells.get(key(cx + ox, cy + oy));
            if (!neighbours) continue;
            for (const j of neighbours) {
              const b = bodies[j];
              if (j > i && b) collide(world, h, a, b);
            }
          }
        }
      }
    }
    for (const body of bodies) if (!body.asleep) walls(world, h, body);
  }

  const gravity = Math.hypot(world.gx, world.gy);
  for (const body of bodies) {
    if (body.asleep) continue;
    if (body.touching) {
      const drag = 1 - PHYSICS.contactDrag * h;
      body.vx *= drag;
      body.vy *= drag;
      body.spin *= 1 - PHYSICS.rollingDrag * h;
    }
    const slow =
      body.vx * body.vx + body.vy * body.vy < PHYSICS.sleepSpeed ** 2 &&
      Math.abs(body.spin) < PHYSICS.sleepSpin &&
      (body.touching || gravity < 1);
    body.still = slow ? body.still + h : 0;
    if (body.still >= PHYSICS.sleepTime) {
      body.asleep = true;
      body.vx = 0;
      body.vy = 0;
      body.spin = 0;
    }
  }
}

/**
 * Advances the world by `dt` seconds (at most `PHYSICS.maxFrame`) in fixed
 * substeps. Returns how many discs are still awake.
 */
export function step(world: GravityWorld, dt: number): number {
  const frame = clamp(dt, 0, PHYSICS.maxFrame);
  const count = Math.max(1, Math.round(frame / PHYSICS.step));
  for (let i = 0; i < count && awakeCount(world) > 0; i += 1) substep(world, PHYSICS.step);
  return awakeCount(world);
}

/**
 * Runs the world until everything sleeps, or `limit` simulated seconds pass,
 * and then puts anything still moving to sleep where it is. This is the
 * reduced-motion path: the same resting place, with no fall to watch.
 */
export function settle(world: GravityWorld, limit = 8) {
  let elapsed = 0;
  while (elapsed < limit && awakeCount(world) > 0) {
    substep(world, PHYSICS.step);
    elapsed += PHYSICS.step;
  }
  for (const body of world.bodies) {
    body.asleep = true;
    body.vx = 0;
    body.vy = 0;
    body.spin = 0;
  }
}
