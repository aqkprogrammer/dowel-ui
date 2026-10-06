import type { RegistryCapabilities } from "../schema";

/**
 * Facts about an item that are read from its source, never declared.
 *
 * A declared `client: false` is a claim someone has to remember to update when
 * they add a hook; this cannot fall behind the file it describes. Both checks
 * are deliberately narrow, so a `true` means what it says.
 */

/** A `"use client"` directive at the top of a module. */
const CLIENT_DIRECTIVE = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/;

/**
 * Keyframe animation or the motion library. Not `transition-*`: nearly every
 * interactive component eases a colour on hover, and calling all of them
 * animated would make the flag useless for the question it answers — what
 * will move on screen without being asked.
 */
const ANIMATION = /from\s+["']motion(?:\/[^"']*)?["']|@keyframes|\banimate-(?!none\b)[a-z]/;

export function capabilitiesOf(sources: string[]): RegistryCapabilities {
  return {
    client: sources.some((source) => CLIENT_DIRECTIVE.test(source)),
    animated: sources.some((source) => ANIMATION.test(source)),
  };
}
