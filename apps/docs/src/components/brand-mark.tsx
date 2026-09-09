import styles from "./brand-mark.module.css";

/**
 * The library's mark: an arm sweeping round a core, which is the hero's
 * galaxy at 20 pixels.
 *
 * Drawn rather than imported so it inherits the theme's primary colour, and
 * so the favicon can be drawn from the same geometry — the two are the same
 * shape, described twice, and `ARC_LENGTH` is what keeps them agreeing.
 */

/** Radius of the ring, in the 32-unit viewBox. */
export const MARK_RADIUS = 11.5;
/** How much of the ring the arm covers, as a fraction of the circumference. */
export const MARK_ARC = 0.64;

const CIRCUMFERENCE = 2 * Math.PI * MARK_RADIUS;

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.mark}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
    >
      <g className={styles.ring}>
        <circle
          cx="16"
          cy="16"
          r={MARK_RADIUS}
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * MARK_ARC} ${CIRCUMFERENCE * (1 - MARK_ARC)}`}
        />
        <circle cx={16 + MARK_RADIUS} cy="16" r="2.7" fill="currentColor" />
      </g>
      <circle className={styles.core} cx="16" cy="16" r="4.8" fill="currentColor" />
    </svg>
  );
}
