"use client";

import { cn } from "@dowel-ui/react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A row of filters: one is chosen at a time, and the grid below follows.
 *
 * Toggle buttons with `aria-pressed` in a labelled group, rather than tabs:
 * there is one grid that filters, not a panel per chip, and tab semantics
 * would promise panels that do not exist. The row scrolls sideways when it
 * has to, fades at whichever edge has more, and keeps the chosen chip in
 * view. The chevrons are a pointer convenience — keyboard focus already
 * scrolls the row — so they are hidden from assistive technology.
 */

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

export function FilterChips({
  label,
  chips,
  value,
  onChange,
  className,
}: {
  label: string;
  chips: FilterChip[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const row = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const node = row.current;
    if (!node) return;
    const start = node.scrollLeft > 2;
    const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 2;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);

  useEffect(() => {
    const node = row.current;
    if (!node) return;
    update();
    const resizes = new ResizeObserver(update);
    resizes.observe(node);
    if (node.firstElementChild) resizes.observe(node.firstElementChild);
    return () => {
      resizes.disconnect();
    };
  }, [update]);

  const behavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  useEffect(() => {
    const node = row.current;
    const active = node?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!node || !active) return;
    const from = node.getBoundingClientRect();
    const to = active.getBoundingClientRect();
    const margin = 40;
    if (to.left < from.left + margin) {
      node.scrollBy({ left: to.left - from.left - margin, behavior: behavior() });
    } else if (to.right > from.right - margin) {
      node.scrollBy({ left: to.right - from.right + margin, behavior: behavior() });
    }
  }, [value]);

  const page = (direction: 1 | -1) => {
    row.current?.scrollBy({
      left: direction * (row.current.clientWidth * 0.7),
      behavior: behavior(),
    });
  };

  const fade = "2.5rem";
  const mask = `linear-gradient(to right, ${edges.start ? "transparent" : "black"}, black ${fade}, black calc(100% - ${fade}), ${edges.end ? "transparent" : "black"})`;

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={row}
        onScroll={update}
        className="[scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <div role="group" aria-label={label} className="flex w-max items-center gap-1.5 py-0.5">
          {chips.map((chip) => {
            const active = chip.id === value;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChange(chip.id);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] whitespace-nowrap",
                  "transition-[border-color,background-color,color] duration-[var(--duration-fast)] outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/55",
                  active
                    ? "border-[var(--hairline-strong)] bg-foreground text-background"
                    : "border-[var(--hairline)] bg-[var(--pane)] text-muted-foreground hover:border-[var(--hairline-strong)] hover:text-foreground",
                )}
              >
                {chip.icon ? <chip.icon aria-hidden="true" className="size-3.5" /> : null}
                {chip.label}
                {chip.count !== undefined ? (
                  <span
                    className={cn(
                      "font-mono text-[0.625rem] tabular-nums",
                      active ? "text-background/70" : "text-muted-foreground",
                    )}
                  >
                    {chip.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {edges.start ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            page(-1);
          }}
          className="absolute top-1/2 left-0 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--hairline)] bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:grid"
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      {edges.end ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            page(1);
          }}
          className="absolute top-1/2 right-0 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--hairline)] bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:grid"
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
