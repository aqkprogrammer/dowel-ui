"use client";

// Original design.
import type { MouseEvent } from "react";

import { Button, type ButtonProps } from "@/components/button";

import {
  confettiAlpha,
  confettiRandom,
  createConfetti,
  stepConfetti,
  type ConfettiOptions,
} from "./confetti";

// Installed, this file is what `@/components/ui/confetti-button` resolves to,
// so it exports everything the folder's index does.
export {
  CONFETTI_GRAVITY,
  confettiAlpha,
  confettiRandom,
  createConfetti,
  stepConfetti,
  type ConfettiOptions,
  type ConfettiPiece,
} from "./confetti";

/*
 * A celebration: a burst of confetti from a point on the screen — the button
 * that was pressed, by default.
 *
 * The burst draws on a temporary full-screen canvas that ignores the pointer
 * and is hidden from assistive technology, and removes itself when the last
 * piece has fallen. Colours are the theme's, resolved at the moment of the
 * burst. Under reduced motion there is no burst at all: celebrate with words
 * too — a toast, a heading — so nobody misses the news.
 */

const DEFAULT_COLORS = ["primary", "info", "success", "warning", "destructive"] as const;
const MAX_DPR = 2;
let seed = 1;

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Theme tokens and CSS colours as values a canvas accepts. */
function resolveColors(colors: readonly string[]): string[] {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = colors.map((color) => {
    probe.style.color = /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
    return getComputedStyle(probe).color || color;
  });
  probe.remove();
  return resolved;
}

/**
 * Bursts confetti from a point (viewport coordinates) or from the middle of
 * an element. Returns a function that stops it early. Does nothing under
 * reduced motion, on the server, or without a 2D canvas.
 */
export function burstConfetti(
  from: { x: number; y: number } | Element,
  options: ConfettiOptions = {},
): () => void {
  if (typeof document === "undefined" || reducedMotion()) return () => {};

  let x: number;
  let y: number;
  if ("getBoundingClientRect" in from) {
    const box = from.getBoundingClientRect();
    x = box.left + box.width / 2;
    y = box.top + box.height / 2;
  } else {
    x = from.x;
    y = from.y;
  }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.slot = "confetti-canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "2147483000",
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  document.body.appendChild(canvas);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  const palette = resolveColors(
    options.colors && options.colors.length > 0 ? options.colors : DEFAULT_COLORS,
  );
  seed += 1;
  const pieces = createConfetti(x, y, palette.length, confettiRandom(seed * 7919), options);

  let frame = 0;
  let last: number | null = null;
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas.remove();
  };
  const tick = (now: number) => {
    const delta = last === null ? 0 : Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    const alive = stepConfetti(pieces, delta, height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const piece of pieces) {
      ctx.globalAlpha = confettiAlpha(piece);
      ctx.fillStyle = palette[piece.color] ?? palette[0] ?? "";
      if (piece.shape === "dot") {
        ctx.beginPath();
        ctx.arc(piece.x, piece.y, piece.h / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        // Foreshortened as it tumbles, so a flat rectangle reads as paper.
        ctx.fillRect(
          -piece.w / 2,
          -piece.h / 2,
          piece.w,
          piece.h * Math.abs(Math.cos(piece.angle)),
        );
        ctx.restore();
      }
    }
    if (alive) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
  return stop;
}

export interface ConfettiButtonProps extends ButtonProps {
  /** How the burst looks: count, speed, spread, angle and colours. */
  confetti?: ConfettiOptions;
}

/** A Button that bursts confetti from itself when pressed. */
export function ConfettiButton({ confetti, onClick, ...props }: ConfettiButtonProps) {
  return (
    <Button
      data-slot="confetti-button"
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) burstConfetti(event.currentTarget, confetti);
      }}
      {...props}
    />
  );
}
