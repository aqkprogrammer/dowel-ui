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

export function capabilitiesOf(sources: string[]): RegistryCapabilities {
  return {
    client: sources.some(hasClientDirective),
    animated: sources.some((source) => ANIMATION.test(source)),
  };
}
