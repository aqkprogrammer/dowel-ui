"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A surface whose corner peels back like a sticker to show what is under it.
 *
 * The page is one clip-path: a polygon with the corner cut off along a fold
 * line. The folded-over flap is a second element, a triangle that is the cut
 * corner reflected across that fold, shaded light at the crease and darker
 * towards its tip, with a soft drop shadow under it. Both are driven by one
 * number, the fold's distance from the corner, so hover, drag and the full
 * peel are the same drawing at different sizes, and CSS transitions animate
 * between them (the polygons keep the same number of points, so they tween).
 *
 * The corner is given logically (`bottom-end` is bottom-right in English and
 * bottom-left in Arabic) and resolved against the element's own direction.
 *
 * Peeling is a toggle button at the corner, so it works by keyboard and touch
 * as well as by dragging; hovering only hints. The face that is peeled away is
 * inert, and the revealed content inert until it is revealed. Transitions use
 * the duration tokens, so reduced motion makes them instant.
 */

type Corner = "top-start" | "top-end" | "bottom-start" | "bottom-end";
type Physical = "tl" | "tr" | "bl" | "br";

const pagePeelVariants = cva(
  "group/peel relative isolate overflow-hidden rounded-xl text-card-foreground",
  {
    variants: {
      surface: {
        card: "[--page-peel-back:var(--color-muted)] [--page-peel-face:var(--color-card)]",
        primary:
          "text-primary-foreground [--page-peel-back:var(--color-muted)] [--page-peel-face:var(--color-primary)]",
      },
    },
    defaultVariants: { surface: "card" },
  },
);

export interface PagePeelProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof pagePeelVariants> {
  /** The face of the page. */
  children: ReactNode;
  /** What the peel reveals underneath. */
  revealContent: ReactNode;
  /** Which corner lifts. Logical: `end` follows the reading direction. Default "bottom-end". */
  corner?: Corner;
  /** Curl the corner a little on hover and focus. Default true. */
  peelOnHover?: boolean;
  /** How far the hover hint lifts, as a fraction of the full peel. Default 0.14. */
  hoverAmount?: number;
  /** Controlled: fully peeled. */
  peeled?: boolean;
  /** Uncontrolled starting state. */
  defaultPeeled?: boolean;
  onPeeledChange?: (peeled: boolean) => void;
  /** Accessible name of the corner button. Default "Peel back". */
  label?: string;
}

function physicalCorner(corner: Corner, rtl: boolean): Physical {
  const vertical = corner.startsWith("top") ? "t" : "b";
  const end = corner.endsWith("end");
  const right = rtl ? !end : end;
  return `${vertical}${right ? "r" : "l"}` as Physical;
}

/** Page clip, flap box placement, flap triangle and shading direction for each corner. */
function geometry(corner: Physical, s: string) {
  const far = `calc(100% - ${s})`;
  switch (corner) {
    case "br":
      return {
        page: `polygon(0 0, 100% 0, 100% ${far}, ${far} 100%, 0 100%, 0 100%)`,
        // rtl-ok: physical corner, already resolved from the logical one.
        box: { right: 0, bottom: 0 },
        flap: "polygon(0 0, 100% 0, 0 100%)",
        towardTip: "to top left",
      };
    case "bl":
      return {
        page: `polygon(0 0, 100% 0, 100% 100%, ${s} 100%, 0 ${far}, 0 0)`,
        // rtl-ok: physical corner, already resolved from the logical one.
        box: { left: 0, bottom: 0 },
        flap: "polygon(0 0, 100% 0, 100% 100%)",
        towardTip: "to top right",
      };
    case "tr":
      return {
        page: `polygon(0 0, ${far} 0, 100% ${s}, 100% 100%, 0 100%, 0 100%)`,
        // rtl-ok: physical corner, already resolved from the logical one.
        box: { right: 0, top: 0 },
        flap: "polygon(0 0, 100% 100%, 0 100%)",
        towardTip: "to bottom left",
      };
    case "tl":
      return {
        page: `polygon(${s} 0, 100% 0, 100% 100%, 0 100%, 0 ${s}, 0 ${s})`,
        // rtl-ok: physical corner, already resolved from the logical one.
        box: { left: 0, top: 0 },
        flap: "polygon(100% 0, 100% 100%, 0 100%)",
        towardTip: "to bottom right",
      };
  }
}

const transition =
  "transition-[clip-path,width,height,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] group-data-[dragging]/peel:transition-none";

export function PagePeel({
  children,
  revealContent,
  corner = "bottom-end",
  peelOnHover = true,
  hoverAmount = 0.14,
  peeled: peeledProp,
  defaultPeeled = false,
  onPeeledChange,
  label = "Peel back",
  surface,
  className,
  ref,
  ...props
}: PagePeelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [rtl, setRtl] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hinting, setHinting] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultPeeled);
  const peeled = peeledProp ?? uncontrolled;
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const setPeeled = useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onPeeledChange?.(next);
    },
    [onPeeledChange],
  );

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    setRtl(window.getComputedStyle(node).direction === "rtl");
    const measure = () => {
      setSize({ width: node.offsetWidth, height: node.offsetHeight });
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const physical = physicalCorner(corner, rtl);
  const full = size.width + size.height;

  // The fold's distance from the corner, in pixels along each edge.
  const amount = drag ?? (peeled ? 1 : peelOnHover && hinting ? hoverAmount : 0);
  const s = `${String(Math.max(0, amount * full))}px`;
  const shape = geometry(physical, s);
  const flapOpacity = amount >= 0.85 ? Math.max(0, (1 - amount) / 0.15) : 1;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || full === 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    const node = rootRef.current;
    if (!start || !node) return;
    if (!start.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 4)
      return;
    start.moved = true;
    const box = node.getBoundingClientRect();
    const fromRight = box.right - event.clientX;
    const fromLeft = event.clientX - box.left;
    const fromBottom = box.bottom - event.clientY;
    const fromTop = event.clientY - box.top;
    const dx = physical.endsWith("r") ? fromRight : fromLeft;
    const dy = physical.startsWith("b") ? fromBottom : fromTop;
    // The corner follows the pointer: the fold sits halfway between them.
    const distance = (Math.max(0, dx) + Math.max(0, dy)) / 2;
    setDrag(Math.min(1, distance / full));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start?.moved) return;
    const settled = (drag ?? 0) > 0.35;
    setDrag(null);
    if (settled !== peeled) setPeeled(settled);
    // A drag is not also a click.
    event.preventDefault();
    suppressClick.current = true;
  };

  const handleSide: CSSProperties = {
    ...(physical.startsWith("t") ? { top: 0 } : { bottom: 0 }),
    // rtl-ok: physical corner, already resolved from the logical one.
    ...(physical.endsWith("r") ? { right: 0 } : { left: 0 }),
  };

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="page-peel"
      data-state={peeled ? "peeled" : "flat"}
      data-corner={corner}
      data-dragging={drag !== null ? "" : undefined}
      className={cn(pagePeelVariants({ surface }), className)}
      onPointerEnter={() => setHinting(true)}
      onPointerLeave={() => setHinting(false)}
      {...props}
    >
      <div
        data-slot="page-peel-reveal"
        className="absolute inset-0 -z-10 bg-[var(--page-peel-back)] text-foreground"
        inert={!peeled ? true : undefined}
        aria-hidden={!peeled ? true : undefined}
      >
        {revealContent}
      </div>

      <div
        data-slot="page-peel-face"
        className={cn("relative bg-[var(--page-peel-face)]", transition)}
        style={{ clipPath: shape.page }}
        inert={peeled ? true : undefined}
        aria-hidden={peeled ? true : undefined}
      >
        {children}
      </div>

      {/* The flap: the cut corner, folded back over the page. */}
      <div
        aria-hidden="true"
        data-slot="page-peel-flap"
        className={cn(
          "pointer-events-none absolute drop-shadow-[0_6px_8px_color-mix(in_oklab,var(--color-foreground)_28%,transparent)]",
          transition,
        )}
        style={{ ...shape.box, width: s, height: s, opacity: flapOpacity }}
      >
        <div
          className="size-full"
          style={{
            clipPath: shape.flap,
            backgroundImage: `linear-gradient(${shape.towardTip}, transparent 0 49.5%, color-mix(in oklab, var(--page-peel-face) 55%, var(--color-background)) 50%, color-mix(in oklab, var(--page-peel-face) 92%, var(--color-foreground)) 72%, color-mix(in oklab, var(--page-peel-face) 78%, var(--color-foreground)) 100%)`,
          }}
        />
      </div>

      <button
        type="button"
        data-slot="page-peel-handle"
        aria-pressed={peeled}
        aria-label={label}
        className={cn(
          "absolute z-10 size-11 cursor-grab touch-none rounded-full bg-transparent active:cursor-grabbing",
          focusRing,
        )}
        style={handleSide}
        onFocus={(event) => {
          let visible = true;
          try {
            visible = event.currentTarget.matches(":focus-visible");
          } catch {
            // Older engines without :focus-visible: hint on any focus.
          }
          if (visible) setHinting(true);
        }}
        onBlur={() => setHinting(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
          setDrag(null);
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setPeeled(!peeled);
        }}
      />
    </div>
  );
}

export { pagePeelVariants };
