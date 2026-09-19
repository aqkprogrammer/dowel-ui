// Ported from amicro "Dither Charts" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.

/*
 * Shape geometry for dither charts. Every tracer writes to a `PathSink` — the
 * subset of the path API that both CanvasRenderingContext2D and Path2D share —
 * so the same function builds a clip region, strokes an outline, or records
 * its commands in a test.
 */

export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, start: number, end: number, ccw?: boolean): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Builds a Path2D from a tracer. Returns null where Path2D does not exist
 * (server rendering, some test DOMs), so callers simply skip the clip.
 */
export function makePath(trace: (sink: PathSink) => void): Path2D | null {
  if (typeof Path2D === "undefined") return null;
  const path = new Path2D();
  trace(path);
  return path;
}

const TAU = Math.PI * 2;

/** Normalises an angle into [0, 2π). */
export function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

export interface Wedge {
  index: number;
  /** Fraction of the whole, 0..1. */
  share: number;
  start: number;
  end: number;
  mid: number;
}

/**
 * Splits a circle into wedges, clockwise from 12 o'clock by default, leaving
 * `gap` radians between neighbours (amicro's graph donut uses 0.07).
 * Negative and non-finite values count as zero.
 */
export function pieWedges(
  values: readonly number[],
  options: { start?: number; gap?: number } = {},
): Wedge[] {
  const start = options.start ?? -Math.PI / 2;
  const gap = options.gap ?? 0;
  const clean = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);
  let cursor = start;
  return clean.map((value, index) => {
    const share = total > 0 ? value / total : 0;
    const sweep = share * TAU;
    const half = sweep > gap ? gap / 2 : sweep / 2;
    const wedge = {
      index,
      share,
      start: cursor + half,
      end: cursor + sweep - half,
      mid: cursor + sweep / 2,
    };
    cursor += sweep;
    return wedge;
  });
}

/** True when `angle` lies within the wedge's sweep. */
export function angleInWedge(angle: number, start: number, end: number): boolean {
  if (end <= start) return false;
  return normalizeAngle(angle - start) <= end - start;
}

/**
 * The wedge under a point, or null — hit-testing for a donut from pointer
 * coordinates, so hover never needs to read pixels back.
 */
export function wedgeAt(
  wedges: readonly Wedge[],
  center: Point,
  inner: number,
  outer: number,
  point: Point,
): number | null {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < inner || distance > outer) return null;
  const angle = Math.atan2(dy, dx);
  const hit = wedges.find(
    (wedge) => wedge.share > 0 && angleInWedge(angle, wedge.start, wedge.end),
  );
  return hit ? hit.index : null;
}

/** A plain annular sector (amicro's device donut). */
export function traceWedge(
  sink: PathSink,
  center: Point,
  inner: number,
  outer: number,
  start: number,
  end: number,
): void {
  if (end - start <= 0.0001) return;
  sink.moveTo(center.x + outer * Math.cos(start), center.y + outer * Math.sin(start));
  sink.arc(center.x, center.y, outer, start, end);
  sink.lineTo(center.x + inner * Math.cos(end), center.y + inner * Math.sin(end));
  sink.arc(center.x, center.y, inner, end, start, true);
  sink.closePath();
}

/** An annular sector with rounded corners (amicro's graph donut). */
export function traceRoundedWedge(
  sink: PathSink,
  center: Point,
  inner: number,
  outer: number,
  start: number,
  end: number,
  radius: number,
): void {
  const sweep = end - start;
  if (sweep <= 0.001) return;
  const r = Math.max(0, Math.min(radius, (outer - inner) / 2, (sweep * inner) / 2));
  if (r === 0) {
    traceWedge(sink, center, inner, outer, start, end);
    return;
  }
  const { x: cx, y: cy } = center;
  const at = (distance: number, angle: number): [number, number] => [
    cx + distance * Math.cos(angle),
    cy + distance * Math.sin(angle),
  ];
  const [isx, isy] = at(inner, start + r / inner);
  sink.moveTo(isx, isy);
  sink.arc(cx, cy, inner, start + r / inner, end - r / inner);
  sink.arcTo(...at(inner, end), ...at(outer, end), r);
  sink.arcTo(...at(outer, end), ...at(outer, end - r / outer), r);
  sink.arc(cx, cy, outer, end - r / outer, start + r / outer, true);
  sink.arcTo(...at(outer, start), ...at(inner, start), r);
  sink.arcTo(...at(inner, start), isx, isy, r);
  sink.closePath();
}

/** A rectangle with separate top and bottom corner radii (a stacked segment). */
export function traceRoundedRect(
  sink: PathSink,
  x: number,
  y: number,
  width: number,
  height: number,
  radiusTop: number,
  radiusBottom = radiusTop,
): void {
  if (width <= 0 || height <= 0) return;
  const top = Math.max(0, Math.min(radiusTop, width / 2, height / 2));
  const bottom = Math.max(0, Math.min(radiusBottom, width / 2, height / 2));
  sink.moveTo(x + top, y);
  sink.lineTo(x + width - top, y);
  sink.arcTo(x + width, y, x + width, y + top, top);
  sink.lineTo(x + width, y + height - bottom);
  sink.arcTo(x + width, y + height, x + width - bottom, y + height, bottom);
  sink.lineTo(x + bottom, y + height);
  sink.arcTo(x, y + height, x, y + height - bottom, bottom);
  sink.lineTo(x, y + top);
  sink.arcTo(x, y, x + top, y, top);
  sink.closePath();
}

/**
 * Tangents for a monotone cubic spline (Fritsch–Carlson). Monotone means the
 * curve never overshoots its data: a smooth line that invents a dip below zero
 * between two positive days is lying.
 */
export function monotoneTangents(points: readonly Point[]): number[] {
  const n = points.length;
  if (n < 2) return points.map(() => 0);
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const dx = b.x - a.x;
    slopes.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0] ?? 0;
    if (i === n - 1) return slopes[n - 2] ?? 0;
    const left = slopes[i - 1] ?? 0;
    const right = slopes[i] ?? 0;
    return left * right <= 0 ? 0 : (left + right) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    const slope = slopes[i] ?? 0;
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = (tangents[i] ?? 0) / slope;
    const b = (tangents[i + 1] ?? 0) / slope;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangents[i] = t * a * slope;
      tangents[i + 1] = t * b * slope;
    }
  }
  return tangents;
}

/**
 * Traces a monotone spline through `points`. With `baseline`, it closes the
 * shape down to that y — the region under the line, ready to clip a fill.
 */
export function traceSpline(sink: PathSink, points: readonly Point[], baseline?: number): void {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return;
  const tangents = monotoneTangents(points);
  sink.moveTo(first.x, first.y);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const third = (b.x - a.x) / 3;
    sink.bezierCurveTo(
      a.x + third,
      a.y + third * (tangents[i] ?? 0),
      b.x - third,
      b.y - third * (tangents[i + 1] ?? 0),
      b.x,
      b.y,
    );
  }
  if (baseline !== undefined) {
    sink.lineTo(last.x, baseline);
    sink.lineTo(first.x, baseline);
    sink.closePath();
  }
}

/** Traces straight segments through `points`, optionally closed to a baseline. */
export function tracePolyline(
  sink: PathSink,
  points: readonly Point[],
  baseline?: number,
): void {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return;
  sink.moveTo(first.x, first.y);
  for (const point of points.slice(1)) sink.lineTo(point.x, point.y);
  if (baseline !== undefined) {
    sink.lineTo(last.x, baseline);
    sink.lineTo(first.x, baseline);
    sink.closePath();
  }
}

/** Linear interpolation of a series at fractional index `at` (0..length−1). */
export function valueAt(values: readonly number[], at: number): number {
  if (values.length === 0) return 0;
  const clamped = Math.min(values.length - 1, Math.max(0, at));
  const i0 = Math.floor(clamped);
  const i1 = Math.min(i0 + 1, values.length - 1);
  const a = values[i0] ?? 0;
  const b = values[i1] ?? 0;
  return a + (b - a) * (clamped - i0);
}

/**
 * A round axis maximum just above `value`: 1, 2 or 5 × 10ⁿ, with 5% headroom
 * (amicro's getAxisMax). Zero and negatives give 1.
 */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1;
  const target = value * 1.05;
  const power = 10 ** Math.floor(Math.log10(target));
  const normalized = target / power;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * power;
}
