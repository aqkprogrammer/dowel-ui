"use client";

// Motion from SmoothUI AnimatedTabs (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * Switches between panels of related content.
 *
 * Tabs are for alternate views of the same subject, not for steps in a process
 * — a user can leave a tab and come back with nothing lost. Activation is
 * automatic on arrow keys by default; pass `activationMode="manual"` when
 * revealing a panel is expensive.
 */
export const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("inline-flex items-center", {
  variants: {
    /**
     * `slide` draws the active tab's pill (or underline) once, on the list,
     * and moves it between tabs. Opt-in: it takes over the active trigger's
     * own background, which would silently discard any active styling a
     * consumer had put on their triggers.
     */
    indicator: {
      none: "",
      slide: cn(
        "relative",
        // Only once the indicator has measured: before that — first paint,
        // server render, no JavaScript — the triggers keep their own styling.
        "has-[>[data-slot=tabs-indicator][data-ready]]:[&_[role=tab]]:relative",
        "has-[>[data-slot=tabs-indicator][data-ready]]:[&_[role=tab][data-state=active]]:border-transparent",
        "has-[>[data-slot=tabs-indicator][data-ready]]:[&_[role=tab][data-state=active]]:bg-transparent",
        "has-[>[data-slot=tabs-indicator][data-ready]]:[&_[role=tab][data-state=active]]:shadow-none",
      ),
    },
    variant: {
      /** Pill track. Reads as a segmented control. */
      solid: "gap-1 rounded-lg bg-muted p-1",
      /** Underlined. Reads as page-level navigation between views. */
      underline: "gap-4 border-b border-border",
    },
  },
  defaultVariants: {
    variant: "solid",
    indicator: "none",
  },
});

const tabsIndicatorVariants = cva(
  cn(
    "pointer-events-none absolute",
    "transition-[transform,width,height] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
    "motion-reduce:transition-none",
  ),
  {
    variants: {
      variant: {
        solid: "rounded-md bg-background shadow-xs",
        underline: "bg-primary",
      },
    },
    defaultVariants: {
      variant: "solid",
    },
  },
);

const tabsTriggerVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap",
    "transition-colors duration-[var(--duration-fast)]",
    "disabled:pointer-events-none disabled:opacity-55",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    focusRing,
  ),
  {
    variants: {
      variant: {
        solid: cn(
          "h-7 rounded-md px-3 text-muted-foreground",
          "hover:text-foreground",
          "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        ),
        underline: cn(
          "-mb-px h-9 border-b-2 border-transparent px-0.5 text-muted-foreground",
          "hover:text-foreground",
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
        ),
      },
    },
    defaultVariants: {
      variant: "solid",
    },
  },
);

export interface TabsListProps
  extends
    ComponentPropsWithRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export function TabsList({ className, variant, indicator, children, ...props }: TabsListProps) {
  const slide = indicator === "slide";
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant ?? "solid"}
      data-indicator={slide ? "slide" : undefined}
      className={cn(tabsListVariants({ variant, indicator }), className)}
      {...props}
    >
      {slide ? <TabsIndicator variant={variant ?? "solid"} /> : null}
      {children}
    </TabsPrimitive.List>
  );
}

type Box = Pick<CSSProperties, "width" | "height" | "transform">;

/**
 * Where the indicator should sit, from the active tab's offset box.
 *
 * Offsets are physical and relative to the list, so this is right in both
 * reading directions and in a vertical list without knowing which it is.
 */
function measure(list: HTMLElement, variant: "solid" | "underline"): Box | null {
  const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
  if (!active) return null;
  let { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = active;
  if (active.offsetParent !== list) {
    // A trigger wrapped in its own positioned element (a tooltip anchor, say)
    // is offset from that wrapper, not the list; fall back to the rects.
    const from = list.getBoundingClientRect();
    const to = active.getBoundingClientRect();
    x = to.left - from.left - list.clientLeft;
    y = to.top - from.top - list.clientTop;
    width = to.width;
    height = to.height;
  }
  if (variant === "underline") {
    // The trigger's own 2px bottom border is where the bar goes.
    return {
      width,
      height: 2,
      transform: `translate(${String(x)}px, ${String(y + height - 2)}px)`,
    };
  }
  return { width, height, transform: `translate(${String(x)}px, ${String(y)}px)` };
}

/**
 * The sliding pill. Decorative — the active tab is announced by
 * aria-selected — so it is hidden from assistive technology.
 */
function TabsIndicator({ variant }: { variant: "solid" | "underline" }) {
  const [box, setBox] = useState<Box | null>(null);
  const node = useRef<HTMLSpanElement | null>(null);

  const update = useCallback(() => {
    const list = node.current?.parentElement;
    if (!list) return;
    const next = measure(list, variant);
    setBox((previous) =>
      previous?.transform === next?.transform &&
      previous?.width === next?.width &&
      previous?.height === next?.height
        ? previous
        : next,
    );
  }, [variant]);

  useLayoutEffect(() => {
    const list = node.current?.parentElement;
    if (!list) return;
    update();
    // Selection changes arrive as data-state flips on the triggers; size
    // changes (fonts loading, labels changing, the list reflowing) do not.
    const mutations = new MutationObserver(update);
    mutations.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    });
    const resizes = new ResizeObserver(update);
    resizes.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]')) resizes.observe(tab);
    return () => {
      mutations.disconnect();
      resizes.disconnect();
    };
  }, [update]);

  return (
    <span
      ref={node}
      aria-hidden="true"
      data-slot="tabs-indicator"
      data-ready={box ? "" : undefined}
      className={cn(tabsIndicatorVariants({ variant }), !box && "hidden")}
      // Anchored to the physical top-left because the offsets it is moved by
      // are physical too.
      style={box ? { top: 0, left: 0, ...box } : undefined}
    />
  );
}

export interface TabsTriggerProps
  extends
    ComponentPropsWithRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

export function TabsTrigger({ className, variant, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

export type TabsContentProps = ComponentPropsWithRef<typeof TabsPrimitive.Content>;

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("mt-4 outline-none", focusRing, className)}
      {...props}
    />
  );
}

export { tabsIndicatorVariants, tabsListVariants, tabsTriggerVariants };
