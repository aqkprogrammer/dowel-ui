"use client";

import type { ColorMode } from "@dowel-ui/themes";
import { useCallback } from "react";
import { flushSync } from "react-dom";

import { useTheme } from "./theme-provider";

/**
 * Switches colour mode with the new mode revealed in a circle from where it
 * was asked for.
 *
 * A View Transition: the browser snapshots the page, the mode changes inside
 * the callback, and the new page is uncovered by a growing clip-path centred
 * on the control. The change has to land inside the callback, so it is
 * flushed synchronously and the class the provider would set a moment later
 * is set here too. Without the API, with reduced motion, or when the choice
 * does not change what is shown — "system" resolving to the current mode —
 * it is an ordinary switch.
 */
export function useModeSweep() {
  const { setMode, resolvedDark } = useTheme();

  return useCallback(
    (next: ColorMode, origin?: { x: number; y: number }) => {
      const root = document.documentElement;
      const willBeDark =
        next === "dark" ||
        (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (
        willBeDark === resolvedDark ||
        reduced ||
        typeof document.startViewTransition !== "function"
      ) {
        setMode(next);
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 0;
      root.classList.add("theme-sweep");
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setMode(next);
        });
        root.classList.toggle("dark", willBeDark);
        root.dataset.astraTheme = willBeDark ? "dark" : "light";
      });
      transition.ready
        .then(() => {
          const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
          );
          root.animate(
            {
              clipPath: [
                `circle(0px at ${String(x)}px ${String(y)}px)`,
                `circle(${String(radius)}px at ${String(x)}px ${String(y)}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {
          // Skipped — another transition took over. The mode has changed anyway.
        });
      void transition.finished.finally(() => {
        root.classList.remove("theme-sweep");
      });
    },
    [setMode, resolvedDark],
  );
}

/** The centre of the element that was activated, for keyboard and pointer alike. */
export function originOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
