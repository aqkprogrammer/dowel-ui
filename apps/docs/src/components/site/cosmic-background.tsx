import { cn } from "@dowel-ui/react";
import type { CSSProperties } from "react";

/**
 * The star field's light, without the star field.
 *
 * The WebGL galaxy is the home page's opening and nowhere else: it is a scene,
 * and a scene behind every documentation page would cost a GPU and a reader's
 * attention on pages that are for reading. This carries the same language —
 * the navy glow, the blue and orange of the palette, a scatter of stars and
 * an orbit or two — as static markup and a few CSS animations, so it costs
 * nothing to paint, nothing to hydrate, and stops for reduced motion along
 * with everything else in the theme.
 *
 * The stars are placed by a seeded generator, so the server and the client
 * draw the same sky and every page with the same seed has the same one.
 */

export type CosmicIntensity = "subtle" | "ambient" | "hero";

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  tint: "white" | "blue" | "orange";
}

const SETTINGS: Record<
  CosmicIntensity,
  { stars: number; glow: number; orbits: number; maxRadius: number }
> = {
  subtle: { stars: 46, glow: 0.45, orbits: 0, maxRadius: 1.1 },
  ambient: { stars: 90, glow: 0.7, orbits: 1, maxRadius: 1.3 },
  hero: { stars: 150, glow: 1, orbits: 2, maxRadius: 1.6 },
};

/** mulberry32: small, fast, and identical on every JavaScript engine. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatter(count: number, seed: number, maxRadius: number): Star[] {
  const next = random(seed);
  return Array.from({ length: count }, () => {
    // Weighted towards the top, where the glow is: a sky, not wallpaper.
    const y = Math.pow(next(), 1.6) * 600;
    const roll = next();
    return {
      x: Math.round(next() * 1600 * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.round((0.35 + Math.pow(next(), 3) * maxRadius) * 100) / 100,
      o: Math.round((0.25 + next() * 0.65) * 100) / 100,
      tint: roll > 0.9 ? "orange" : roll > 0.76 ? "blue" : "white",
    };
  });
}

const TINT: Record<Star["tint"], string> = {
  white: "currentColor",
  blue: "var(--cosmic-blue)",
  orange: "var(--cosmic-orange)",
};

const ORBITS = [
  { size: "70rem", top: "-6%", period: "140s", start: "18deg", body: "var(--cosmic-blue)" },
  { size: "46rem", top: "-14%", period: "95s", start: "200deg", body: "var(--cosmic-orange)" },
] as const;

export interface CosmicBackgroundProps {
  intensity?: CosmicIntensity;
  /** Changes the sky. Pages that sit side by side read better with different ones. */
  seed?: number;
  className?: string;
}

export function CosmicBackground({
  intensity = "ambient",
  seed = 7,
  className,
}: CosmicBackgroundProps) {
  const settings = SETTINGS[intensity];
  const stars = scatter(settings.stars, seed, settings.maxRadius);

  return (
    <div
      aria-hidden="true"
      data-cosmic={intensity}
      className={cn("cosmic", className)}
      style={{ "--cosmic-glow": settings.glow } as CSSProperties}
    >
      <div className="cosmic-glow" />
      <svg
        className="cosmic-stars"
        viewBox="0 0 1600 600"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
      >
        {[0, 1, 2].map((phase) => (
          <g key={phase} className="cosmic-twinkle" data-phase={phase}>
            {stars
              .filter((_, index) => index % 3 === phase)
              .map((star, index) => (
                <circle
                  key={index}
                  cx={star.x}
                  cy={star.y}
                  r={star.r}
                  fill={TINT[star.tint]}
                  opacity={star.o}
                />
              ))}
          </g>
        ))}
      </svg>
      {ORBITS.slice(0, settings.orbits).map((orbit) => (
        <div
          key={orbit.size}
          className="cosmic-orbit"
          style={
            {
              "--orbit-size": orbit.size,
              "--orbit-top": orbit.top,
              "--orbit-period": orbit.period,
              "--orbit-start": orbit.start,
              "--orbit-body": orbit.body,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
