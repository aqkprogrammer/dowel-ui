"use client";

// Motion from SmoothUI Pagination (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * The client half of `<PaginationContent indicator="slide">`, in its own file
 * so the rest of Pagination stays renderable on the server.
 *
 * It measures its own parent list rather than being handed a ref, so
 * PaginationContent needs no state of its own. The move is a CSS transition
 * on transform and width with the overshoot curve standing in for SmoothUI's
 * spring; the global reduced-motion rule turns it into a jump.
 */

type Box = Pick<CSSProperties, "width" | "height" | "transform">;

const ACTIVE = '[data-slot="pagination-link"][aria-current="page"]';

function measure(list: HTMLElement): Box | null {
  const active = list.querySelector<HTMLElement>(ACTIVE);
  if (!active) return null;
  let { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = active;
  if (active.offsetParent !== list) {
    const from = list.getBoundingClientRect();
    const to = active.getBoundingClientRect();
    x = to.left - from.left - list.clientLeft;
    y = to.top - from.top - list.clientTop;
    width = to.width;
    height = to.height;
  }
  return { width, height, transform: `translate(${String(x)}px, ${String(y)}px)` };
}

function same(a: Box | null, b: Box | null) {
  return a?.transform === b?.transform && a?.width === b?.width && a?.height === b?.height;
}

/**
 * The sliding active-page pill. A list item because it lives in a `<ul>`,
 * and hidden from assistive technology so the list's item count is still the
 * number of pages: `aria-current` is what announces the current one.
 */
export function PaginationIndicator({ className }: { className?: string }) {
  const [box, setBox] = useState<Box | null>(null);
  const node = useRef<HTMLLIElement | null>(null);

  const update = useCallback(() => {
    const list = node.current?.parentElement;
    if (!list) return;
    const next = measure(list);
    setBox((previous) => (same(previous, next) ? previous : next));
  }, []);

  useLayoutEffect(() => {
    const list = node.current?.parentElement;
    if (!list) return;
    update();
    // Client-state pagination re-renders the links with a new aria-current;
    // a page list that grows or shrinks around the ellipsis changes sizes.
    const mutations = new MutationObserver(update);
    mutations.observe(list, {
      attributes: true,
      attributeFilter: ["aria-current"],
      childList: true,
      subtree: true,
    });
    const resizes = new ResizeObserver(update);
    resizes.observe(list);
    return () => {
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [update]);

  return (
    <li
      ref={node}
      aria-hidden="true"
      data-slot="pagination-indicator"
      data-ready={box ? "" : undefined}
      className={cn(
        "pointer-events-none absolute rounded-md border border-border-strong bg-background",
        "transition-[transform,width,height] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
        "motion-reduce:transition-none",
        !box && "hidden",
        className,
      )}
      // Physical anchor, because the offsets it moves by are physical.
      style={box ? { top: 0, left: 0, ...box } : undefined}
    />
  );
}
