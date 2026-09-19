"use client";

// Ported from SmoothUI Fade Through, Shared Axis X, Shared Axis Y and Shared Axis Z (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { TextSwap, type TextSwapProps } from "./text-swap";

/*
 * The four SmoothUI phrase components are a TextSwap driven by a timer: a
 * `phrases` array and an `interval` (2500ms). That timer is all this adds.
 *
 * Rotation stops under reduced motion, as Fade Through's does — a phrase that
 * keeps changing is movement even when the swap itself is instant — and the
 * current phrase stays put. `paused` gives consumers the pause control WCAG
 * 2.2.2 asks of anything that updates on its own.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReduced(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches;
}

/** The server cannot know; it renders the first phrase either way. */
function readServer(): boolean {
  return false;
}

export interface TextRotateProps extends Omit<TextSwapProps, "children"> {
  /** The phrases to cycle through, in order. */
  items: readonly string[];
  /** Milliseconds each phrase stays before the next one. */
  interval?: number;
  /** Stops the rotation on the current phrase. */
  paused?: boolean;
  /** Called with the index of each phrase as it arrives. */
  onIndexChange?: (index: number) => void;
}

/** Cycles through `items` on a timer, swapping each with a TextSwap transition. */
export function TextRotate({
  items,
  interval = 2500,
  paused = false,
  onIndexChange,
  ...props
}: TextRotateProps) {
  const [index, setIndex] = useState(0);
  const reduced = useSyncExternalStore(subscribe, readReduced, readServer);
  const count = items.length;
  const stopped = paused || reduced || count <= 1;

  useEffect(() => {
    if (stopped) return;
    const timer = setInterval(() => {
      setIndex((previous) => (previous + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [stopped, count, interval]);

  const announced = useRef(index);
  useEffect(() => {
    if (announced.current === index) return;
    announced.current = index;
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  return <TextSwap {...props}>{items[index % Math.max(count, 1)] ?? ""}</TextSwap>;
}
