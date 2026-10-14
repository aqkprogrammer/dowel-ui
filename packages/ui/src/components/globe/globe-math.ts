// Original design.

/*
 * The globe's geometry, kept free of WebGL so it can be tested and reused:
 * where a latitude and longitude sit on a unit sphere, an even spread of dots
 * over it, the great-circle arc between two places, and the rotation that
 * turns it. Longitude 0 faces the viewer at no rotation; north is up.
 */

export interface GlobePoint {
  /** Degrees north, -90 to 90. */
  lat: number;
  /** Degrees east, -180 to 180. */
  lng: number;
}

export type Vec3 = [number, number, number];

const RAD = Math.PI / 180;

/** A latitude and longitude as a point on the unit sphere. */
export function toVector({ lat, lng }: GlobePoint): Vec3 {
  const phi = lat * RAD;
  const lambda = lng * RAD;
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
}

/** A point on the unit sphere back to latitude and longitude. */
export function toLatLng([x, y, z]: Vec3): GlobePoint {
  return { lat: Math.asin(Math.max(-1, Math.min(1, y))) / RAD, lng: Math.atan2(x, z) / RAD };
}

/**
 * `count` points spread evenly over the sphere (a Fibonacci lattice), each as
 * a latitude and longitude, so a land test can keep or drop it.
 */
export function fibonacciSphere(count: number): GlobePoint[] {
  const points: GlobePoint[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push(toLatLng([Math.cos(theta) * radius, y, Math.sin(theta) * radius]));
  }
  return points;
}

/**
 * The great-circle path from `a` to `b`, as `segments + 1` points lifted off
 * the surface toward the middle by up to `lift` (a fraction of the radius),
 * so longer routes arc higher.
 */
export function greatCircle(a: GlobePoint, b: GlobePoint, segments = 48, lift = 0.25): Vec3[] {
  const p = toVector(a);
  const q = toVector(b);
  const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const omega = Math.acos(dot);
  const height = lift * (omega / Math.PI);
  const out: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    let v: Vec3;
    if (omega < 1e-6) {
      v = p;
    } else {
      const s = Math.sin(omega);
      const wa = Math.sin((1 - t) * omega) / s;
      const wb = Math.sin(t * omega) / s;
      v = [wa * p[0] + wb * q[0], wa * p[1] + wb * q[1], wa * p[2] + wb * q[2]];
    }
    const r = 1 + height * Math.sin(Math.PI * t);
    out.push([v[0] * r, v[1] * r, v[2] * r]);
  }
  return out;
}

/** A column-major 3×3 rotation: turn by `yaw` about the vertical axis, then tip by `pitch`. */
export function rotation(yaw: number, pitch: number): Float32Array {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Rx(pitch) · Ry(yaw), written column by column for WebGL.
  return new Float32Array([cy, sy * sp, -sy * cp, 0, cp, sp, sy, -cy * sp, cy * cp]);
}

/** Applies a column-major 3×3 matrix to a vector. */
export function rotate(m: Float32Array, [x, y, z]: Vec3): Vec3 {
  return [
    (m[0] ?? 0) * x + (m[3] ?? 0) * y + (m[6] ?? 0) * z,
    (m[1] ?? 0) * x + (m[4] ?? 0) * y + (m[7] ?? 0) * z,
    (m[2] ?? 0) * x + (m[5] ?? 0) * y + (m[8] ?? 0) * z,
  ];
}

/** The yaw and pitch that bring `point` to the front. */
export function facing(point: GlobePoint): { yaw: number; pitch: number } {
  return { yaw: -point.lng * RAD, pitch: point.lat * RAD };
}

/** A CSS colour, or a theme token ("primary"), as sRGB 0–1 — through a 1×1 canvas, so any colour space works. */
export function resolveColor(
  element: Element,
  color: string,
  fallback: Vec3 = [0.5, 0.5, 0.5],
): Vec3 {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  if (!view) return fallback;
  const css =
    /^[a-z][a-z0-9-]*$/.test(color) && color !== "transparent" && color !== "currentcolor"
      ? `var(--color-${color})`
      : color;
  const probe = doc.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  element.appendChild(probe);
  const computed = view.getComputedStyle(probe).color;
  probe.remove();
  try {
    const canvas = doc.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !computed) return fallback;
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return a > 0 ? [r / 255, g / 255, b / 255] : fallback;
  } catch {
    return fallback;
  }
}
