"use client";

// Motion from SmoothUI Dialog and BasicModal (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A modal window that interrupts the user to gather a response.
 *
 * Focus is trapped while open, restored to the trigger on close, and the rest
 * of the page is hidden from assistive technology — all handled by the
 * underlying primitive rather than reimplemented here.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export type DialogOverlayProps = ComponentPropsWithRef<typeof DialogPrimitive.Overlay>;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] bg-overlay backdrop-blur-[2px]",
        "data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in",
        className,
      )}
      {...props}
    />
  );
}

const PREFIX = "dowel-dialog";

/** Each section of a spring dialog arrives 60ms after the one above it. */
const STAGGER_STEP_MS = 60;
const STAGGERED = 6;

const SPRING_CHILD = `[data-slot=dialog-content][data-animation=spring][data-state=open]>:not([data-slot=dialog-close])`;

const STYLES = `
@keyframes ${PREFIX}-spring-in{from{opacity:0;transform:translateY(.5rem) scale(.95)}}
@keyframes ${PREFIX}-section-in{from{opacity:0;transform:translateY(8px)}}
${SPRING_CHILD}{animation:${PREFIX}-section-in calc(250ms * var(--motion-scale)) var(--ease-out-quint) both}
${Array.from(
  { length: STAGGERED - 1 },
  (_, i) =>
    `${SPRING_CHILD}:nth-child(${String(i + 2)}){animation-delay:calc(${String((i + 1) * STAGGER_STEP_MS)}ms * var(--motion-scale))}`,
).join("\n")}
${SPRING_CHILD}:nth-child(n+${String(STAGGERED + 1)}){animation-delay:calc(${String(STAGGERED * STAGGER_STEP_MS)}ms * var(--motion-scale))}
`;

export interface DialogContentProps extends ComponentPropsWithRef<
  typeof DialogPrimitive.Content
> {
  /** Renders the built-in close button. Turn off to supply your own. */
  showCloseButton?: boolean;
  /**
   * How the dialog enters. `default` fades and rises into place. `spring` pops
   * in with a slight overshoot and then brings its sections — header, body,
   * footer — in one after another. Both stop under reduced motion, and both
   * leave the same way.
   */
  animation?: "default" | "spring";
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  animation = "default",
  ...props
}: DialogContentProps) {
  const spring = animation === "spring";

  return (
    <>
      {spring ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-animation={spring ? "spring" : undefined}
          className={cn(
            "fixed top-1/2 left-1/2 z-[var(--z-modal)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "grid gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl",
            "data-[state=closed]:animate-dialog-out",
            // Spelled out because Tailwind reads class names from the source.
            spring
              ? "data-[state=open]:animate-[dowel-dialog-spring-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]"
              : "data-[state=open]:animate-dialog-in",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
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
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </>
  );
}

export function DialogHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pe-8 text-start", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export type DialogTitleProps = ComponentPropsWithRef<typeof DialogPrimitive.Title>;

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export type DialogDescriptionProps = ComponentPropsWithRef<typeof DialogPrimitive.Description>;

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
