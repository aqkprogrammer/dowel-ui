import { cn } from "@dowel-ui/react";

import styles from "./cosmic-loader.module.css";

/**
 * The loading state, in the brand's own shape.
 *
 * The mark is a core with an arm sweeping round it; this is the same core
 * with two bodies riding tilted orbits, which is what the mark is a picture
 * of. The bodies travel the ellipses with SMIL rather than a rotating group,
 * so the orbit stays put and only the body moves — a spinning ellipse reads
 * as a wobble, not an orbit.
 *
 * It reports progress, so it keeps moving under reduced motion: a frozen
 * loader says the page has hung. Every instance is a `status` region with a
 * text label, so it is announced once rather than being a silent picture.
 */

const ORBITS = [
  {
    rx: 26,
    ry: 8.5,
    tilt: -18,
    dur: "2.6s",
    r: 2.4,
    colour: "var(--cosmic-blue)",
    reverse: false,
  },
  {
    rx: 19,
    ry: 6.5,
    tilt: 34,
    dur: "3.6s",
    r: 1.9,
    colour: "var(--cosmic-orange)",
    reverse: true,
  },
] as const;

function ellipsePath(rx: number, ry: number, reverse: boolean): string {
  const sweep = reverse ? 0 : 1;
  return `M ${String(32 + rx)} 32 A ${String(rx)} ${String(ry)} 0 1 ${String(sweep)} ${String(32 - rx)} 32 A ${String(rx)} ${String(ry)} 0 1 ${String(sweep)} ${String(32 + rx)} 32 Z`;
}

export function CosmicLoader({
  label = "Loading",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-4", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className={cn(
          styles.loader,
          size === "sm" ? "size-8" : size === "lg" ? "size-24" : "size-14",
        )}
      >
        <circle cx="32" cy="32" r="15" className={styles.halo} />
        {ORBITS.map((orbit) => {
          const path = ellipsePath(orbit.rx, orbit.ry, orbit.reverse);
          return (
            <g key={orbit.rx} transform={`rotate(${String(orbit.tilt)} 32 32)`}>
              <path d={path} className={styles.ring} />
              <circle r={orbit.r} fill={orbit.colour} className={styles.body}>
                <animateMotion dur={orbit.dur} repeatCount="indefinite" path={path} />
              </circle>
            </g>
          );
        })}
        <circle
          cx="32"
          cy="32"
          r="4.5"
          fill="var(--cosmic-star)"
          className={styles.core}
          data-motion="indicator"
        />
      </svg>
      <span
        className={
          size === "sm"
            ? "sr-only"
            : "font-mono text-2xs tracking-[0.16em] text-muted-foreground uppercase"
        }
      >
        {label}…
      </span>
    </div>
  );
}
