"use client";

// Original design (pattern inspired by bencho Image accordion).
import { cva, type VariantProps } from "class-variance-authority";
import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A row of image panels; one is open, wide, with its caption showing, and the
 * rest are narrow strips with their titles turned on end. Pointing at, focusing
 * or pressing a strip opens it.
 *
 * It is an accordion in the APG sense: each panel's header is a button with
 * aria-expanded that controls its caption, inside a heading. Exactly one panel
 * is open at a time. Arrow keys move between headers (mirrored in RTL for the
 * horizontal layout), Home and End jump to the ends.
 *
 * The widening is a CSS transition on flex-grow, so the global reduced-motion
 * rule makes it instant.
 */

const imageAccordionVariants = cva("group/accordion flex gap-2", {
  variants: {
    orientation: {
      horizontal: "h-80 w-full flex-row",
      vertical: "h-[28rem] w-full flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

export interface ImageAccordionItem {
  id: string | number;
  /** The header text. It names the panel's button. */
  title: ReactNode;
  /** A caption shown while the panel is open. */
  description?: ReactNode;
  /** Image URL. */
  image?: string;
  /** Alternative text for `image`. Omitted, the image is treated as decorative. */
  imageAlt?: string;
  /** Any media node instead of an image. */
  media?: ReactNode;
}

export interface ImageAccordionProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof imageAccordionVariants> {
  items: ImageAccordionItem[];
  /** Controlled open panel. */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /**
   * `hover` (default): pointing at a panel or focusing its header opens it, and
   * so does pressing it. `click`: only pressing it (or Enter/Space) does.
   */
  activateOn?: "hover" | "click";
  /** How many times wider (or taller) the open panel grows than a closed one. */
  expandedSize?: number;
  /** The heading level wrapping each header button. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** Image panels in a row; the one in focus opens wide and shows its caption. */
export function ImageAccordion({
  className,
  items,
  activeIndex: activeProp,
  defaultActiveIndex = 0,
  onActiveIndexChange,
  activateOn = "hover",
  expandedSize = 4,
  headingLevel = 3,
  orientation = "horizontal",
  ...props
}: ImageAccordionProps) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultActiveIndex);
  const controlled = activeProp !== undefined;
  const active = controlled ? activeProp : uncontrolled;
  const horizontal = orientation !== "vertical";
  const Heading = `h${String(headingLevel)}` as "h3";

  function open(index: number) {
    if (index === active) return;
    if (!controlled) setUncontrolled(index);
    onActiveIndexChange?.(index);
  }

  /** Arrow keys, Home and End move focus between headers, as in the APG accordion. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const root = event.currentTarget.closest("[data-slot=image-accordion]");
    const triggers = [
      ...(root?.querySelectorAll<HTMLButtonElement>(
        ":scope > * > * > [data-slot=image-accordion-trigger]",
      ) ?? []),
    ];
    const current = triggers.indexOf(event.currentTarget);
    const rtl =
      horizontal && event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    const forward = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    const back = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const count = triggers.length;
    const next = {
      [forward]: (current + 1) % count,
      [back]: (current - 1 + count) % count,
      Home: 0,
      End: count - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    triggers[next]?.focus();
  }

  return (
    <div
      data-slot="image-accordion"
      data-orientation={orientation}
      className={cn(imageAccordionVariants({ orientation }), className)}
      {...props}
    >
      {items.map((item, index) => {
        const isOpen = index === active;
        const triggerId = `${id}-trigger-${String(index)}`;
        const panelId = `${id}-panel-${String(index)}`;
        const hasPanel = item.description != null;

        return (
          <div
            key={item.id}
            data-slot="image-accordion-item"
            data-state={isOpen ? "open" : "closed"}
            className={cn(
              "group/item relative min-h-0 min-w-0 basis-0 overflow-hidden rounded-xl bg-muted",
              "transition-[flex-grow] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
            )}
            style={{ flexGrow: isOpen ? expandedSize : 1 }}
            onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
              // Touch has no hover; a tap arrives as a click instead.
              if (activateOn === "hover" && event.pointerType === "mouse") open(index);
            }}
          >
            <div
              data-slot="image-accordion-media"
              className={cn(
                "absolute inset-0 transition-[scale] duration-[var(--duration-slower)] ease-[var(--ease-out-quint)]",
                "group-data-[state=closed]/item:scale-110 [&>img]:size-full [&>img]:object-cover",
              )}
            >
              {item.media ??
                (item.image ? (
                  <img src={item.image} alt={item.imageAlt ?? ""} draggable={false} />
                ) : null)}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent"
            />

            <Heading className="absolute inset-0 m-0">
              <button
                type="button"
                id={triggerId}
                data-slot="image-accordion-trigger"
                aria-expanded={isOpen}
                aria-controls={hasPanel ? panelId : undefined}
                className={cn(
                  "flex size-full cursor-pointer rounded-xl p-4 text-start text-foreground",
                  horizontal
                    ? "items-end justify-center group-data-[state=open]/item:justify-start"
                    : "items-center justify-start group-data-[state=open]/item:items-end",
                  focusRingInset,
                )}
                onClick={() => {
                  open(index);
                }}
                onFocus={() => {
                  if (activateOn === "hover") open(index);
                }}
                onKeyDown={handleKeyDown}
              >
                <span
                  data-slot="image-accordion-title"
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    horizontal &&
                      "group-data-[state=closed]/item:rotate-180 group-data-[state=closed]/item:[writing-mode:vertical-rl]",
                    hasPanel && "group-data-[state=open]/item:mb-6",
                  )}
                >
                  {item.title}
                </span>
              </button>
            </Heading>

            {hasPanel ? (
              <div
                id={panelId}
                data-slot="image-accordion-panel"
                aria-hidden={isOpen ? undefined : true}
                inert={isOpen ? undefined : true}
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 line-clamp-1 px-4 pb-4 text-xs text-muted-foreground",
                  "transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
                  "group-data-[state=closed]/item:opacity-0",
                )}
              >
                {item.description}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export { imageAccordionVariants };
