"use client";

import { cn } from "@dowel-ui/react";
import { useEffect, useState, type RefObject } from "react";

/**
 * Finds the components a block is built from inside its rendered preview,
 * and draws them.
 *
 * Every component marks its parts with `data-slot`, and the page hands this
 * the slot names each dependency's own source declares — so a box here is a
 * component that is really in the markup, found the way the library labels
 * itself, never a guess from tag names. Only the outermost match of each
 * component is drawn: a card's header is part of the card, not a second card.
 *
 * Nothing in the preview is changed. Positions come from layout offsets, not
 * screen rectangles, so the boxes stay put when the stage tilts back in 3D —
 * which is how the "exploded" view lifts them off the screen beneath.
 */

export interface PartSpec {
  name: string;
  title: string;
  slots: string[];
}

export interface FoundPart {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The palette parts are drawn in, cycled by dependency order. */
export const PART_COLOURS = [
  "#7ab1fe",
  "#fa994c",
  "#6dcbf4",
  "#c4a7ff",
  "#7ee0a8",
  "#f59ac6",
  "#f5c97a",
  "#5fd4c4",
] as const;

export function partColour(index: number): string {
  return PART_COLOURS[index % PART_COLOURS.length] ?? PART_COLOURS[0];
}

/** Position of an element in `root`'s layout box, ignoring any transform on the way. */
function layoutBox(element: HTMLElement, root: HTMLElement): FoundPart | null {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    left += node.offsetLeft;
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    // Scrolled containers between here and the root shift what is shown.
    for (
      let scroller: HTMLElement | null = node.parentElement;
      scroller && scroller !== parent;
    ) {
      left -= scroller.scrollLeft;
      top -= scroller.scrollTop;
      scroller = scroller.parentElement;
    }
    if (parent) {
      left -= parent.scrollLeft;
      top -= parent.scrollTop;
    }
    node = parent;
  }
  // The chain never reached the root: fixed, or not laid out at all.
  if (node !== root) return null;
  if (element.offsetWidth < 4 || element.offsetHeight < 4) return null;
  return { name: "", left, top, width: element.offsetWidth, height: element.offsetHeight };
}

function measure(root: HTMLElement, specs: PartSpec[]): FoundPart[] {
  const found: FoundPart[] = [];
  for (const spec of specs) {
    if (spec.slots.length === 0) continue;
    const selector = spec.slots.map((slot) => `[data-slot="${CSS.escape(slot)}"]`).join(",");
    const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
    for (const element of matches) {
      // Outermost only: skip anything inside another match of the same part.
      const outer = element.parentElement?.closest(selector);
      if (outer && root.contains(outer)) continue;
      const box = layoutBox(element, root);
      if (box) found.push({ ...box, name: spec.name });
    }
  }
  return found;
}

function sameParts(a: FoundPart[], b: FoundPart[]): boolean {
  return (
    a.length === b.length &&
    a.every((part, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        part.name === other.name &&
        part.left === other.left &&
        part.top === other.top &&
        part.width === other.width &&
        part.height === other.height
      );
    })
  );
}

/**
 * Measures parts inside `root` while `active`, and again whenever the
 * preview resizes or its markup changes — a story that streams, or a
 * different example being chosen. Every measurement waits for a frame, so
 * the layout it reads is the one the browser is about to paint.
 */
export function useParts(
  root: RefObject<HTMLElement | null>,
  specs: PartSpec[],
  active: boolean,
): FoundPart[] {
  const [parts, setParts] = useState<FoundPart[]>([]);

  useEffect(() => {
    const node = root.current;
    if (!active || !node) return;
    let frame = 0;
    const run = () => {
      const next = measure(node, specs);
      // The overlay re-rendering is itself a mutation; an unchanged answer
      // must not render again, or measuring would never settle.
      setParts((current) => (sameParts(current, next) ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    schedule();
    const resizes = new ResizeObserver(schedule);
    resizes.observe(node);
    const mutations = new MutationObserver(schedule);
    mutations.observe(node, { childList: true, subtree: true });
    // Live stories mount after a beat, and some lay out with an animation.
    const settle = window.setTimeout(schedule, 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      resizes.disconnect();
      mutations.disconnect();
    };
  }, [active, root, specs]);

  return active ? parts : [];
}

/** The boxes, laid over the preview. Decorative: the legend says the same in words. */
export function PartsOverlay({
  parts,
  specs,
  focus,
}: {
  parts: FoundPart[];
  specs: PartSpec[];
  focus: string | null;
}) {
  const order = new Map(specs.map((spec, index) => [spec.name, index]));
  const titles = new Map(specs.map((spec) => [spec.name, spec.title]));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 [transform-style:preserve-3d]"
    >
      {parts.map((part, index) => {
        const colour = partColour(order.get(part.name) ?? 0);
        const lit = focus === null || focus === part.name;
        return (
          <div
            key={`${part.name}-${String(index)}`}
            className={cn(
              "absolute rounded-md border-[1.5px] transition-[opacity,transform] duration-500 ease-[var(--ease-out-quint)]",
              lit ? "opacity-100" : "opacity-15",
            )}
            style={{
              left: part.left,
              top: part.top,
              width: part.width,
              height: part.height,
              borderColor: colour,
              backgroundColor: `color-mix(in oklab, ${colour} ${focus === part.name ? "16%" : "7%"}, transparent)`,
              boxShadow: `0 0 0 3px color-mix(in oklab, ${colour} 18%, transparent), 0 10px 30px -12px ${colour}`,
              transform: `translateZ(${focus === part.name ? "64px" : "28px"})`,
            }}
          >
            <span
              className="absolute -top-2.5 left-2 rounded px-1.5 py-px font-mono text-[0.625rem] leading-4 whitespace-nowrap text-black"
              style={{ backgroundColor: colour }}
            >
              {titles.get(part.name) ?? part.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
