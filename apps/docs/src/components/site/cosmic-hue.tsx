"use client";

import { hexToOklch } from "@dowel-ui/themes";
import { useEffect, useRef } from "react";

import { useTheme } from "../theme-provider";

/**
 * Turns the cosmos to the reader's theme.
 *
 * The star field is drawn once, in its own palette, and baking a new palette
 * into it would mean rebuilding the scene and replaying its opening. So it is
 * not repainted: it is rotated. This reads the live `--primary` after a preset
 * is applied, finds how far its hue sits from the default preset's, and hands
 * that angle to CSS — which turns the WebGL backdrop with `hue-rotate` (the
 * same way it is already inverted for a light theme) and re-derives the cosmic
 * colour tokens the rest of the site's light is mixed from. Blue and orange
 * turn together, so the field keeps its two-tone character in every preset;
 * a preset with no colour, like monochrome, drains it to grey.
 *
 * Reading the resolved colour rather than a table of presets means a preset
 * added later — or one built in the Theme Studio — follows without a change
 * here.
 */

/** The default preset's primary hue, in OKLCH degrees: the field's own. */
const DEFAULT_HUE = 275;
/** Below this chroma a primary is a grey, and the field goes grey with it. */
const GREY_CHROMA = 0.03;

/** The document's resolved `--primary`, as sRGB hex, whatever syntax it was written in. */
function resolvePrimary(): string | undefined {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;color:var(--primary)";
  document.body.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  // A canvas is the one place every browser will turn any CSS colour —
  // oklch, color(), rgb — into plain sRGB bytes.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function CosmicHue() {
  const { preset, resolvedDark } = useTheme();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    // After the provider has written the preset to <html>: its effect runs
    // after this one, as a parent's always does.
    const frame = requestAnimationFrame(() => {
      const hex = preset === "default" ? undefined : resolvePrimary();
      const primary = hex ? hexToOklch(hex) : undefined;
      if (!primary) {
        root.removeAttribute("data-cosmic-tinted");
        root.style.removeProperty("--cosmic-hue-shift");
        root.style.removeProperty("--astra-hue-shift");
        root.style.removeProperty("--cosmic-chroma");
      } else {
        const grey = primary.c < GREY_CHROMA;
        // The shortest way round, so a switch never spins the field the long way.
        const shift = grey ? 0 : ((((primary.h - DEFAULT_HUE) % 360) + 540) % 360) - 180;
        root.style.setProperty("--cosmic-hue-shift", String(Math.round(shift)));
        root.style.setProperty("--astra-hue-shift", `${String(Math.round(shift))}deg`);
        root.style.setProperty("--cosmic-chroma", grey ? "0" : "1");
        root.setAttribute("data-cosmic-tinted", "");
      }
    });
    // The field eases only when the preset itself changed: not on load, which
    // should land rather than animate in, and not on a light/dark switch,
    // where easing the inversion would pass through grey.
    let settle: number | undefined;
    if (previous.current !== null && previous.current !== preset) {
      root.setAttribute("data-cosmic-turning", "");
      settle = window.setTimeout(() => {
        root.removeAttribute("data-cosmic-turning");
      }, 1400);
    }
    previous.current = preset;
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      root.removeAttribute("data-cosmic-turning");
    };
  }, [preset, resolvedDark]);

  return null;
}
