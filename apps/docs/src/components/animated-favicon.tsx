"use client";

import { useEffect } from "react";

import { MARK_ARC, MARK_RADIUS } from "./brand-mark";

/**
 * Turns the mark in the browser tab.
 *
 * No image format animates a favicon in every browser — Chrome ignores both
 * SVG animation and animated GIFs — so the frames are drawn to a canvas and
 * handed to the icon link one at a time. That is only worth doing carefully:
 * it runs at twelve frames a second rather than sixty, stops the moment the
 * tab is hidden, and never starts at all when the reader has asked for less
 * motion, in which case the static `icon.svg` stands.
 */

/** The mark's colour, matching the `--primary` token at its default preset. */
const BRAND = "#545cdf";
const SIZE = 32;
const FPS = 12;
/** Seconds for one full turn, matching the mark in the header. */
const PERIOD = 9;

function draw(context: CanvasRenderingContext2D, angle: number): void {
  const center = SIZE / 2;
  const radius = (SIZE / 32) * MARK_RADIUS;
  context.clearRect(0, 0, SIZE, SIZE);
  context.fillStyle = BRAND;
  context.strokeStyle = BRAND;
  context.lineWidth = (SIZE / 32) * 2.6;
  context.lineCap = "round";

  context.save();
  context.translate(center, center);
  context.rotate(angle);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2 * MARK_ARC);
  context.stroke();
  context.beginPath();
  context.arc(radius, 0, (SIZE / 32) * 2.7, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // The core breathes on its own cycle, as it does in the header.
  const pulse = 1 + 0.16 * Math.sin((angle / (Math.PI * 2)) * PERIOD * ((2 * Math.PI) / 3.4));
  context.beginPath();
  context.arc(center, center, (SIZE / 32) * 4.8 * pulse, 0, Math.PI * 2);
  context.fill();
}

export function AnimatedFavicon() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;

    // A document with two icon links leaves the choice to the browser, and what
    // it picks is the last one declared — which is not necessarily this one,
    // because the framework writes the static icon into the head on its own
    // schedule. Rather than race it, the link is moved back to the end whenever
    // something has appeared after it. That is a no-op on almost every frame.
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.append(link);
    const ensureLast = () => {
      const icons = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
      if (icons[icons.length - 1] !== link) document.head.append(link);
    };

    let angle = 0;
    let timer: number | undefined;
    const step = () => {
      angle = (angle + (Math.PI * 2) / (PERIOD * FPS)) % (Math.PI * 2);
      draw(context, angle);
      link.href = canvas.toDataURL("image/png");
      ensureLast();
    };
    const start = () => {
      if (timer !== undefined) return;
      step();
      timer = window.setInterval(step, 1000 / FPS);
    };
    const stop = () => {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      // Removing it hands the tab back to the static icon in the markup.
      link.remove();
    };
  }, []);

  return null;
}
