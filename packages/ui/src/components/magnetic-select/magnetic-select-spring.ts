/*
 * A damped spring expressed as a CSS `linear()` easing, so a state-driven
 * spring (overshoot, settle) runs as a plain CSS transition: no animation
 * library, and the global reduced-motion rule and --motion-scale still apply.
 *
 * `bounce` 0..1 (0 = critically damped, no overshoot; 1 = very lively).
 * Returns the easing string. Pair it with a duration from the caller.
 * Browsers without linear() drop the declaration, so set it through a CSS
 * variable consumed inside `@supports (transition-timing-function: linear(0, 1))`
 * in the hoisted stylesheet, with a cubic-bezier fallback in the class list.
 */
export function springEasing(bounce: number, samples = 48): string {
  const b = Math.min(Math.max(bounce, 0), 1);
  const zeta = 1 - b * 0.7; // damping ratio 1 → 0.3
  // Choose ω so the envelope has decayed to ~0.1% at t = 1.
  const omega = Math.log(1000) / zeta;
  const points: string[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    let x: number;
    if (zeta >= 0.999) {
      x = 1 - Math.exp(-omega * t) * (1 + omega * t);
    } else {
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      x =
        1 -
        Math.exp(-zeta * omega * t) *
          (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    }
    points.push(i === samples ? "1" : String(Math.round(x * 1000) / 1000));
  }
  return `linear(${points.join(", ")})`;
}
