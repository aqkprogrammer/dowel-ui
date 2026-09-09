/**
 * How the hero's pieces talk to each other.
 *
 * The drag surfaces live in the page (one over the hero, one over each cue),
 * the canvas lives in a fixed backdrop, and the labels in a fixed chrome. They
 * share no ancestor that could hold state for them without re-rendering the
 * page, so they talk through window events instead — the same way the
 * document's own scroll and pointer events reach them.
 */

export const ASTRA_EVENTS = {
  /** Pointer position over the field, for the shove. */
  pointer: "dowel-astra:pointer",
  /** A drag or arrow-key delta, in radians. */
  rotate: "dowel-astra:rotate",
  /** The drag ended: turn back to face forward. */
  return: "dowel-astra:return",
  /** Play the opening again. */
  replay: "dowel-astra:replay",
  /** The backdrop became visible or hidden, for chrome that overlays it. */
  active: "dowel-astra:active",
} as const;

export interface AstraPointerDetail {
  active: boolean;
  clientX: number;
  clientY: number;
  pressed: boolean;
}

export interface AstraRotateDetail {
  x: number;
  y: number;
}

export function dispatchAstraPointer(detail: AstraPointerDetail): void {
  window.dispatchEvent(new CustomEvent<AstraPointerDetail>(ASTRA_EVENTS.pointer, { detail }));
}

export function dispatchAstraRotate(detail: AstraRotateDetail): void {
  window.dispatchEvent(new CustomEvent<AstraRotateDetail>(ASTRA_EVENTS.rotate, { detail }));
}

export function dispatchAstraReturn(): void {
  window.dispatchEvent(new Event(ASTRA_EVENTS.return));
}

export function dispatchAstraReplay(): void {
  window.dispatchEvent(new Event(ASTRA_EVENTS.replay));
}

export function dispatchAstraActive(active: boolean): void {
  window.dispatchEvent(new CustomEvent<boolean>(ASTRA_EVENTS.active, { detail: active }));
}
