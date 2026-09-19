"use client";

// Ported from SmoothUI Gooey Popover (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/components/popover";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A round trigger whose popover pours out of it: the panel starts as a circle
 * over the trigger and stretches into a rectangle, while an SVG "goo" filter
 * (blur + alpha threshold) melts the two shapes together where they meet.
 *
 * The source ran this on a GSAP timeline and positioned itself by hand. Here
 * Radix Popover (through Dowel's `popover`) owns placement, collision, focus
 * and dismissal, and the timeline is CSS keyframes driven by data-state:
 * Radix's Presence waits for the content's own exit animation — a "hold" as
 * long as the whole close sequence — before unmounting it.
 *
 * Because the content is portalled, the blob that sits under the trigger is
 * drawn inside the portal too, at the trigger's measured position, with an
 * aria-hidden copy of the trigger's icon on top so nothing visibly changes.
 * Under reduced motion the goo layer is dropped and the panel simply appears.
 */

const STYLES = `
@keyframes dowel-gooey-popover-grow {
  from {
    left: calc(var(--gooey-x, var(--gooey-gx)) - var(--gooey-size) / 2);
    top: calc(var(--gooey-y, var(--gooey-gy)) - var(--gooey-size) / 2);
    width: var(--gooey-size); height: var(--gooey-size); border-radius: calc(var(--gooey-size) / 2);
  }
  to { left: 0; top: 0; width: 100%; height: 100%; border-radius: var(--gooey-radius); }
}
@keyframes dowel-gooey-popover-shrink {
  from { left: 0; top: 0; width: 100%; height: 100%; border-radius: var(--gooey-radius); opacity: 1; }
  70% { opacity: 1; }
  to {
    left: calc(var(--gooey-x, var(--gooey-gx)) - var(--gooey-size) / 2);
    top: calc(var(--gooey-y, var(--gooey-gy)) - var(--gooey-size) / 2);
    width: var(--gooey-size); height: var(--gooey-size); border-radius: calc(var(--gooey-size) / 2);
    opacity: 0;
  }
}
@keyframes dowel-gooey-popover-reveal {
  from { opacity: 0; translate: 0 1rem; }
  to { opacity: 1; translate: 0 0; }
}
@keyframes dowel-gooey-popover-conceal {
  from { opacity: 1; translate: 0 0; }
  to { opacity: 0; translate: 0 0.5rem; }
}
@keyframes dowel-gooey-popover-hold {
  from { opacity: 1; }
  to { opacity: 1; }
}
[data-slot="gooey-popover-content"][data-state="open"] { animation: none; }
[data-slot="gooey-popover-content"][data-state="closed"] {
  animation: dowel-gooey-popover-hold calc(var(--gooey-speed) * 1.2 * var(--motion-scale)) linear both;
}
[data-slot="gooey-popover-content"][data-state="open"] [data-slot="gooey-popover-shape"] {
  animation: dowel-gooey-popover-grow calc(var(--gooey-speed) * var(--motion-scale))
    var(--ease-in-out-quint) both;
}
[data-slot="gooey-popover-content"][data-state="closed"] [data-slot="gooey-popover-shape"] {
  animation: dowel-gooey-popover-shrink calc(var(--gooey-speed) * var(--motion-scale))
    var(--ease-in-quint) calc(var(--gooey-speed) * 0.2 * var(--motion-scale)) both;
}
[data-slot="gooey-popover-content"][data-state="open"] [data-slot="gooey-popover-body"] {
  animation: dowel-gooey-popover-reveal calc(var(--gooey-speed) * 0.75 * var(--motion-scale))
    var(--ease-out-quint) calc(var(--gooey-speed) * 0.575 * var(--motion-scale)) both;
}
[data-slot="gooey-popover-content"][data-state="closed"] [data-slot="gooey-popover-body"] {
  animation: dowel-gooey-popover-conceal calc(var(--gooey-speed) * 0.4 * var(--motion-scale))
    var(--ease-in-quint) both;
}
@media (prefers-reduced-motion: reduce) {
  [data-slot="gooey-popover-goo"], [data-slot="gooey-popover-ghost"] { display: none; }
}
`;

const gooeyPopoverVariants = cva("", {
  variants: {
    tone: {
      /** The source's near-black blob on a light page, inverted in dark mode. */
      inverted: "bg-foreground text-background",
      primary: "bg-primary text-primary-foreground",
      card: "bg-card text-card-foreground",
    },
  },
  defaultVariants: {
    tone: "inverted",
  },
});

export interface GooeyPopoverProps
  extends
    Omit<PopoverContentProps, "children" | "content">,
    VariantProps<typeof gooeyPopoverVariants> {
  /** The popover's content. */
  children: ReactNode;
  /** The trigger's icon. A plus by default. */
  trigger?: ReactNode;
  /** The trigger's accessible name — it is icon-only. Also names the content by default. */
  triggerLabel: string;
  /** The trigger's diameter in pixels. */
  triggerSize?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The content's width. Numbers are pixels. */
  contentWidth?: number | string;
  /** Length of the morph in milliseconds; the rest of the sequence scales with it. */
  duration?: number;
  /** Classes for the trigger button. */
  triggerClassName?: string;
}

const PLUS = (
  <svg
    viewBox="0 0 24 24"
    width={20}
    height={20}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Where the trigger's centre sits relative to the content, before measuring. */
function guess(side: GooeyPopoverProps["side"], offset: number) {
  switch (side) {
    case "bottom":
      return { x: "50%", y: `${String(-offset)}px` };
    case "left":
      return { x: `calc(100% + ${String(offset)}px)`, y: "50%" };
    case "right":
      return { x: `${String(-offset)}px`, y: "50%" };
    default:
      return { x: "50%", y: `calc(100% + ${String(offset)}px)` };
  }
}

/** A popover that pours out of its round trigger through an SVG goo filter. */
export function GooeyPopover({
  ref,
  className,
  style,
  children,
  trigger = PLUS,
  triggerLabel,
  triggerSize = 44,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  contentWidth = 240,
  duration = 250,
  side = "top",
  sideOffset = 24,
  tone,
  triggerClassName,
  ...props
}: GooeyPopoverProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const filterId = `dowel-goo-${useId().replace(/:/g, "")}`;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Measure the trigger's centre relative to the placed content.
  useLayoutEffect(() => {
    if (!open) return;
    let frames = 0;
    let handle = 0;
    const measure = () => {
      const content = contentRef.current;
      const button = triggerRef.current;
      if (content && button) {
        const c = content.getBoundingClientRect();
        const t = button.getBoundingClientRect();
        content.style.setProperty("--gooey-x", `${String(t.left + t.width / 2 - c.left)}px`);
        content.style.setProperty("--gooey-y", `${String(t.top + t.height / 2 - c.top)}px`);
      }
      // The portal mounts, then Radix places the content, over the next frames.
      if (++frames < 4) handle = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(handle);
  }, [open]);

  const tones = gooeyPopoverVariants({ tone });
  const initial = guess(side, sideOffset + triggerSize / 2);
  const atTrigger: CSSProperties = {
    left: `calc(var(--gooey-x, var(--gooey-gx)) - ${String(triggerSize / 2)}px)`,
    top: `calc(var(--gooey-y, var(--gooey-gy)) - ${String(triggerSize / 2)}px)`,
    width: triggerSize,
    height: triggerSize,
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <style href="dowel-gooey-popover" precedence="dowel">
        {STYLES}
      </style>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={triggerLabel}
          data-slot="gooey-popover-trigger"
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full transition-[scale] duration-[var(--duration-fast)] active:scale-95",
            tones,
            focusRing,
            triggerClassName,
          )}
          style={{ width: triggerSize, height: triggerSize }}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={setContentRef}
        side={side}
        sideOffset={sideOffset}
        aria-label={props["aria-labelledby"] ? undefined : triggerLabel}
        {...props}
        data-slot="gooey-popover-content"
        className={cn(
          "relative w-auto overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none",
          className,
        )}
        style={
          {
            width: contentWidth,
            "--gooey-size": `${String(triggerSize)}px`,
            "--gooey-speed": `${String(duration)}ms`,
            "--gooey-gx": initial.x,
            "--gooey-gy": initial.y,
            ...style,
          } as CSSProperties
        }
      >
        <svg aria-hidden="true" className="absolute size-0">
          <defs>
            <filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        <div
          aria-hidden="true"
          data-slot="gooey-popover-goo"
          className="pointer-events-none absolute inset-0"
          style={{ filter: `url(#${filterId})` }}
        >
          <div className={cn("absolute rounded-full", tones)} style={atTrigger} />
          <div
            data-slot="gooey-popover-shape"
            className={cn("absolute", tones)}
            style={{ "--gooey-radius": "0px" } as CSSProperties}
          />
        </div>
        <div
          aria-hidden="true"
          data-slot="gooey-popover-shape"
          className={cn("pointer-events-none absolute", tones)}
          style={{ "--gooey-radius": "1.125rem" } as CSSProperties}
        />
        <div
          aria-hidden="true"
          data-slot="gooey-popover-ghost"
          className={cn(
            "pointer-events-none absolute flex items-center justify-center rounded-full",
            tones,
          )}
          style={atTrigger}
        >
          {trigger}
        </div>
        <div
          data-slot="gooey-popover-body"
          className={cn("relative p-4", tones, "bg-transparent")}
        >
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { gooeyPopoverVariants };
