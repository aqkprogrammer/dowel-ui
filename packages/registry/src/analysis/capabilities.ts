import type { RegistryCapabilities } from "../schema";

/**
 * Facts about an item that are read from its source, never declared.
 *
 * A declared `client: false` is a claim someone has to remember to update when
 * they add a hook; this cannot fall behind the file it describes. Both checks
 * are deliberately narrow, so a `true` means what it says.
 */

/**
 * Whether a module opens with a `"use client"` directive.
 *
 * A scan rather than a regular expression. The directive may follow comments
 * and whitespace, and a pattern that skips any number of comments has nested
 * repetition — which backtracks exponentially on input like a long run of
 * `/**\/`. This walks the prefix once.
 */
export function hasClientDirective(source: string): boolean {
  let at = 0;
  for (;;) {
    while (at < source.length && /\s/.test(source.charAt(at))) at += 1;
    if (source.startsWith("//", at)) {
      const end = source.indexOf("\n", at);
      if (end === -1) return false;
      at = end + 1;
    } else if (source.startsWith("/*", at)) {
      const end = source.indexOf("*/", at + 2);
      if (end === -1) return false;
      at = end + 2;
    } else {
      break;
    }
  }
  return source.startsWith('"use client"', at) || source.startsWith("'use client'", at);
}

/**
 * Keyframe animation or the motion library. Not `transition-*`: nearly every
 * interactive component eases a colour on hover, and calling all of them
 * animated would make the flag useless for the question it answers — what
 * will move on screen without being asked.
 */
const ANIMATION = /from\s+["']motion(?:\/[^"']*)?["']|@keyframes|\banimate-(?!none\b)[a-z]/;

/**
 * The heaviest rendering technique an item's own files use, lightest first.
 * Tiers say what a project takes on by installing it: `css` is markup and
 * styles, `motion` adds the animation library, `canvas` draws in a 2D canvas,
 * `webgl` needs a GPU context and a fallback for when there is none.
 */
export const TIERS = ["css", "motion", "canvas", "webgl"] as const;

export type Tier = (typeof TIERS)[number];

const WEBGL = /getContext\(\s*["']webgl2?["']|from\s+["'](?:three|@react-three\/[^"']+)["']/;
const CANVAS = /<canvas\b|getContext\(\s*["']2d["']/;
const MOTION = /from\s+["']motion(?:\/[^"']*)?["']/;

export function tierOf(sources: string[]): Tier {
  if (sources.some((source) => WEBGL.test(source))) return "webgl";
  if (sources.some((source) => CANVAS.test(source))) return "canvas";
  if (sources.some((source) => MOTION.test(source))) return "motion";
  return "css";
}

/** The heavier of two tiers. */
export function heavierTier(a: Tier, b: Tier): Tier {
  return TIERS.indexOf(a) >= TIERS.indexOf(b) ? a : b;
}

export function capabilitiesOf(sources: string[]): RegistryCapabilities {
  return {
    client: sources.some(hasClientDirective),
    animated: sources.some((source) => ANIMATION.test(source)),
    tier: tierOf(sources),
  };
}

/**
 * An item's tier, counting what it installs with it.
 *
 * A background that draws through `dither-canvas` is a canvas component even
 * though its own file only renders a `<canvas>` element and calls a hook; the
 * engine it pulls in is part of what a project takes on. So the tier is the
 * heaviest of the item's own and those of everything it depends on.
 */
export function resolveTiers(
  own: ReadonlyMap<string, Tier>,
  dependencies: ReadonlyMap<string, readonly string[]>,
): Map<string, Tier> {
  const resolved = new Map<string, Tier>();
  const visit = (name: string, path: Set<string>): Tier => {
    const known = resolved.get(name);
    if (known) return known;
    let tier = own.get(name) ?? "css";
    if (path.has(name)) return tier;
    path.add(name);
    for (const dependency of dependencies.get(name) ?? []) {
      tier = heavierTier(tier, visit(dependency, path));
    }
    path.delete(name);
    resolved.set(name, tier);
    return tier;
  };
  for (const name of own.keys()) visit(name, new Set());
  return resolved;
}
