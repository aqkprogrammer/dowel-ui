"use client";

// Ported from SmoothUI Phototab (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { cn } from "@/lib/utils";

/*
 * A photo with a floating bar of icon tabs; each tab swaps the photo.
 *
 * It is Dowel's Tabs, restyled — so the ARIA tabs pattern, roving focus,
 * arrow keys that follow the reading direction and Home/End all come from
 * there. On devices with a fine pointer the bar tucks away until the photo is
 * hovered *or anything inside it has focus*, so a keyboard user never tabs
 * into an invisible control; on touch it is always shown.
 *
 * The source moved a hover pill between triggers with a `motion` layoutId.
 * Here the pill is placed from the hovered trigger's offset and moved with a
 * CSS transition — the same effect, no animation library, and it stops under
 * reduced motion.
 */

const photoTabsVariants = cva("group/photo-tabs relative w-full overflow-hidden rounded-2xl", {
  variants: {
    /** Where the tab bar floats. */
    barPosition: {
      bottom: "[--photo-tabs-hide:calc(100%+1rem)]",
      top: "[--photo-tabs-hide:calc(-100%-1rem)]",
    },
  },
  defaultVariants: {
    barPosition: "bottom",
  },
});

export interface PhotoTab {
  value: string;
  /** Names the tab; shown to assistive technology, the icon is decorative. */
  label: string;
  icon: ReactNode;
  /** Image URL for the panel. */
  src: string;
  /** Alt text for the image. Defaults to `label`. */
  alt?: string;
}

export interface PhotoTabsProps
  extends
    Omit<ComponentPropsWithRef<typeof Tabs>, "children" | "orientation">,
    VariantProps<typeof photoTabsVariants> {
  tabs: PhotoTab[];
  /** Accessible name for the tab list. */
  listLabel?: string;
  /** Height of the photo — a number of pixels or any CSS length. */
  height?: number | string;
  /** Tuck the bar away until hover or focus on devices with a fine pointer. */
  revealOnHover?: boolean;
  listClassName?: string;
  triggerClassName?: string;
  imageClassName?: string;
}

/** Photo panels switched by a floating bar of icon tabs. */
export function PhotoTabs({
  className,
  style,
  tabs,
  barPosition,
  listLabel = "Photos",
  height = "25rem",
  revealOnHover = true,
  listClassName,
  triggerClassName,
  imageClassName,
  defaultValue,
  ...props
}: PhotoTabsProps) {
  const [pill, setPill] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  function showPill(trigger: HTMLElement) {
    setPill({
      x: trigger.offsetLeft,
      y: trigger.offsetTop,
      width: trigger.offsetWidth,
      height: trigger.offsetHeight,
    });
  }

  return (
    <Tabs
      data-slot="photo-tabs"
      defaultValue={defaultValue ?? tabs[0]?.value}
      className={cn(photoTabsVariants({ barPosition }), className)}
      style={{ height, ...style }}
      {...props}
    >
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          data-slot="photo-tabs-panel"
          className="mt-0 size-full rounded-2xl"
        >
          <img
            src={tab.src}
            alt={tab.alt ?? tab.label}
            draggable={false}
            className={cn("size-full rounded-2xl bg-muted object-cover", imageClassName)}
          />
        </TabsContent>
      ))}
      <TabsList
        aria-label={listLabel}
        data-slot="photo-tabs-list"
        onPointerLeave={() => setPill(null)}
        className={cn(
          "absolute inset-x-0 mx-auto w-fit gap-2 rounded-full bg-background/60 p-1.5 ring ring-border/70 backdrop-blur-sm",
          barPosition === "top" ? "top-3" : "bottom-3",
          "transition-[translate,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          revealOnHover &&
            cn(
              "pointer-fine:translate-y-[var(--photo-tabs-hide)] pointer-fine:opacity-0",
              "pointer-fine:group-hover/photo-tabs:translate-y-0 pointer-fine:group-hover/photo-tabs:opacity-100",
              "pointer-fine:group-focus-within/photo-tabs:translate-y-0 pointer-fine:group-focus-within/photo-tabs:opacity-100",
            ),
          listClassName,
        )}
      >
        <span
          data-slot="photo-tabs-pill"
          aria-hidden="true"
          data-state={pill ? "visible" : "hidden"}
          className={cn(
            // rtl-ok: the pill is placed from offsetLeft, a physical measurement,
            // so it must be anchored to the physical left edge in both directions.
            "pointer-events-none absolute top-0 left-0 rounded-full bg-primary/25",
            "transition-[translate,width,height,opacity] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            "data-[state=hidden]:opacity-0",
          )}
          style={
            pill
              ? {
                  translate: `${String(pill.x)}px ${String(pill.y)}px`,
                  width: pill.width,
                  height: pill.height,
                }
              : undefined
          }
        />
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            data-slot="photo-tabs-trigger"
            onPointerEnter={(event) => showPill(event.currentTarget)}
            className={cn(
              "relative z-[1] size-9 rounded-full p-0 text-foreground",
              "data-[state=active]:bg-background data-[state=active]:shadow-xs [&_svg:not([class*='size-'])]:size-4",
              triggerClassName,
            )}
          >
            <span aria-hidden="true" className="contents">
              {tab.icon}
            </span>
            <span className="sr-only">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { photoTabsVariants };
