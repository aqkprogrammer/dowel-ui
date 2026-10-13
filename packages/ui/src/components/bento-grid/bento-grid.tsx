// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * The layout behind a feature section or a dashboard overview: tiles of
 * different sizes in one tidy grid.
 *
 * One column on small screens, where every tile is full width and as tall as
 * its content; from `md` up, the chosen number of columns, with each tile
 * spanning the columns and rows it asks for. The tiles stay in document
 * order, so reading order and visual order agree — unless `dense` is set,
 * which lets small tiles fill gaps and so can reorder them visually; leave it
 * off when the order carries meaning.
 */

const bentoGridVariants = cva(
  "grid auto-rows-[minmax(var(--bento-row),auto)] grid-cols-1 gap-(--bento-gap)",
  {
    variants: {
      /** Columns from the `md` breakpoint up. */
      columns: {
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
        6: "md:grid-cols-6",
      },
      /** Let small tiles fill gaps left by large ones. Can reorder tiles visually. */
      dense: {
        true: "md:grid-flow-row-dense",
        false: "",
      },
    },
    defaultVariants: { columns: 3, dense: false },
  },
);

export interface BentoGridProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof bentoGridVariants> {
  /** Space between tiles, in pixels. Default 16. */
  gap?: number;
  /** Height of one row, in pixels; tiles grow past it when their content needs to. Default 180. */
  rowHeight?: number;
}

/** A grid of tiles that span columns and rows, single-column on small screens. */
export function BentoGrid({
  columns,
  dense,
  gap = 16,
  rowHeight = 180,
  className,
  style,
  ...props
}: BentoGridProps) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(bentoGridVariants({ columns, dense }), className)}
      style={
        {
          "--bento-gap": `${String(Math.max(0, gap))}px`,
          "--bento-row": `${String(Math.max(40, rowHeight))}px`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

const bentoItemVariants = cva(
  "relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground",
  {
    variants: {
      /** Columns the tile spans, from `md` up. */
      colSpan: {
        1: "md:col-span-1",
        2: "md:col-span-2",
        3: "md:col-span-3",
        4: "md:col-span-4",
        6: "md:col-span-6",
      },
      /** Rows the tile spans, from `md` up. */
      rowSpan: {
        1: "md:row-span-1",
        2: "md:row-span-2",
        3: "md:row-span-3",
      },
    },
    defaultVariants: { colSpan: 1, rowSpan: 1 },
  },
);

export interface BentoItemProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof bentoItemVariants> {}

/** One tile. Styled as a card by default; override with className. */
export function BentoItem({ colSpan, rowSpan, className, ...props }: BentoItemProps) {
  return (
    <div
      data-slot="bento-item"
      className={cn(bentoItemVariants({ colSpan, rowSpan }), className)}
      {...props}
    />
  );
}

export { bentoGridVariants, bentoItemVariants };
