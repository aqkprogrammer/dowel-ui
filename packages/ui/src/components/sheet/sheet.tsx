"use client";

// Motion from SmoothUI Drawer (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A panel that enters from an edge of the viewport.
 *
 * Built on the same modal primitive as Dialog, so focus management, Escape
 * handling and page inerting are identical; only the placement and motion
 * differ. Reach for Sheet when the content is a secondary surface — filters,
 * details, navigation — rather than a decision that must be answered.
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetPortal = SheetPrimitive.Portal;
export const SheetClose = SheetPrimitive.Close;

export function SheetOverlay({
  className,
  ...props
}: ComponentPropsWithRef<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] bg-overlay",
        "data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in",
        className,
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  cn(
    "fixed z-[var(--z-drawer)] flex flex-col gap-4 bg-card p-6 text-card-foreground shadow-xl",
    "data-[state=closed]:animate-slide-out data-[state=open]:animate-slide-in",
  ),
  {
    variants: {
      // --slide-x/--slide-y feed the shared slide keyframes, so all four sides
      // reuse one animation pair instead of eight bespoke keyframes.
      side: {
        top: "inset-x-0 top-0 border-b [--slide-y:-100%]",
        bottom: "inset-x-0 bottom-0 border-t [--slide-y:100%]",
        // rtl-ok: the variant is named `left`, and a sheet asked for on the
        // left that opens on the right in Arabic is an API telling a lie. The
        // logical version of this is a `start`/`end` side, which is a rename
        // rather than a restyle.
        left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r [--slide-x:-100%]", // rtl-ok: named side
        right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l [--slide-x:100%]", // rtl-ok: named side
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

const PREFIX = "dowel-sheet";

/** Sections start once the panel is mostly in, then follow 50ms apart. */
const STAGGER_BASE_MS = 120;
const STAGGER_STEP_MS = 50;
const STAGGERED = 6;

const SPRING_CHILD = `[data-slot=sheet-content][data-animation=spring][data-state=open]>:not([data-slot=sheet-close])`;

const delay = (index: number) =>
  `calc(${String(STAGGER_BASE_MS + index * STAGGER_STEP_MS)}ms * var(--motion-scale))`;

const STYLES = `
@keyframes ${PREFIX}-section-in{from{opacity:0;transform:translateY(6px)}}
${SPRING_CHILD}{animation:${PREFIX}-section-in calc(250ms * var(--motion-scale)) var(--ease-out-quint) both;animation-delay:${delay(0)}}
${Array.from(
  { length: STAGGERED - 1 },
  (_, i) => `${SPRING_CHILD}:nth-child(${String(i + 2)}){animation-delay:${delay(i + 1)}}`,
).join("\n")}
${SPRING_CHILD}:nth-child(n+${String(STAGGERED + 1)}){animation-delay:${delay(STAGGERED)}}
`;

export interface SheetContentProps
  extends
    ComponentPropsWithRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  showCloseButton?: boolean;
  /**
   * How the content arrives. `default` slides in as one piece. `spring` slides
   * the panel the same way, then brings its sections — header, body, footer —
   * in one after another. The panel itself never overshoots: a sheet that
   * bounced past its edge would lift off the side it is attached to. Stops
   * under reduced motion.
   */
  animation?: "default" | "spring";
}

export function SheetContent({
  className,
  children,
  side,
  showCloseButton = true,
  animation = "default",
  ...props
}: SheetContentProps) {
  const spring = animation === "spring";

  return (
    <>
      {spring ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          data-slot="sheet-content"
          data-animation={spring ? "spring" : undefined}
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              aria-label="Close"
              className={cn(
                "absolute end-4 top-4 grid size-7 place-items-center rounded-md text-muted-foreground",
                "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
                "[&_svg]:size-4",
                focusRing,
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </SheetPrimitive.Close>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPortal>
    </>
  );
}

export function SheetHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 pe-8 text-start", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { sheetVariants };
