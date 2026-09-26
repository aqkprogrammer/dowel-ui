"use client";

// Motion from SmoothUI BasicToast (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { Toast as ToastPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  DEFAULT_TOAST_DURATION,
  toast,
  useToasts,
  type ToastRecord,
  type ToastVariant,
} from "./toast-store";

// Installed, this file is what `@/components/ui/toast` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  DEFAULT_TOAST_DURATION,
  TOAST_LIMIT,
  toast,
  useToasts,
  type ToastAction as ToastActionOptions,
  type ToastOptions,
  type ToastPromiseMessages,
  type ToastRecord,
  type ToastVariant,
} from "./toast-store";

/**
 * Brief, non-blocking messages about something that just happened.
 *
 * Render one `<Toaster />` near the root of the app; raise messages from
 * anywhere with `toast()`. The primitive underneath supplies the parts that are
 * easy to get wrong: a screen-reader announcement region, timers that pause on
 * hover, focus and window blur, swipe-to-dismiss, and F8 to jump focus into the
 * toast list from anywhere on the page.
 */

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
    "rounded-lg border p-4 pe-10 shadow-lg",
    "[--slide-x:calc(100%+1rem)]",
    "data-[state=closed]:animate-float-out data-[state=open]:animate-slide-in",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
    "data-[swipe=end]:animate-toast-swipe-out",
  ),
  {
    variants: {
      variant: {
        default: "border-border bg-popover text-popover-foreground",
        success: "border-success/30 bg-popover text-popover-foreground [&_svg]:text-success",
        warning: "border-warning/35 bg-popover text-popover-foreground [&_svg]:text-warning",
        destructive:
          "border-destructive/30 bg-popover text-popover-foreground [&_svg]:text-destructive",
        info: "border-info/30 bg-popover text-popover-foreground [&_svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const ToastProvider = ToastPrimitive.Provider;

const PREFIX = "dowel-toast";

/* A short hop from the docked edge with a scale pop, instead of the full slide
 * in from off-screen. The edge comes from --dowel-toast-from, which the Toaster
 * sets from its position (3rem from the right, -3rem from the left, 0 when
 * centred); a Toast used on its own comes from the right, like the default. */
const STYLES = `
@keyframes ${PREFIX}-spring-in{from{opacity:0;transform:translate3d(var(--${PREFIX}-from,3rem),0,0) scale(.8)}}
`;

export interface ToastProps
  extends
    ComponentPropsWithRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {
  /**
   * How the toast enters. `default` slides in from off-screen. `spring` hops a
   * short way in from the docked edge with a scale pop and a slight overshoot.
   * Both leave, and swipe away, the same way. Stops under reduced motion.
   */
  animation?: "default" | "spring";
}

export function Toast({ className, variant, animation = "default", ...props }: ToastProps) {
  const spring = animation === "spring";

  return (
    <>
      {spring ? (
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
      ) : null}
      <ToastPrimitive.Root
        data-slot="toast"
        data-animation={spring ? "spring" : undefined}
        className={cn(
          toastVariants({ variant }),
          // Keyed on data-animation as well as data-state so the selector is
          // more specific than the base slide-in, which tailwind-merge cannot
          // recognise as a conflict (it does not know the theme's animate-*
          // names). Spelled out because Tailwind reads class names from source.
          spring &&
            "data-[animation=spring]:data-[state=open]:animate-[dowel-toast-spring-in_calc(250ms*var(--motion-scale))_var(--ease-overshoot)]",
          className,
        )}
        {...props}
      />
    </>
  );
}

export function ToastTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm leading-snug font-medium", className)}
      {...props}
    />
  );
}

export function ToastDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function ToastAction({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-md border border-input bg-transparent px-3 text-xs font-medium",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export function ToastClose({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      className={cn(
        "absolute end-3 top-3 grid size-6 place-items-center rounded-md text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-foreground",
        focusRing,
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </ToastPrimitive.Close>
  );
}

export type ToastPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

/*
  rtl-ok: the positions are *named* left and right, so they stay physical. A
  toast asked for at `bottom-right` that appears bottom-left in Arabic is the
  same lie as a Sheet asked for on the left that opens on the right — and it is
  worse here, because the slide-in comes from the right edge and the toast would
  fly across the screen to reach the other one. The logical version of this is a
  `bottom-end` position, which is a rename rather than a restyle.
*/
const viewportPositions: Record<ToastPosition, string> = {
  "top-left": "top-0 left-0 sm:flex-col-reverse", // rtl-ok: named position
  "top-center": "top-0 left-1/2 -translate-x-1/2 sm:flex-col-reverse",
  "top-right": "top-0 right-0 sm:flex-col-reverse", // rtl-ok: named position
  "bottom-left": "bottom-0 left-0", // rtl-ok: named position
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-0 right-0", // rtl-ok: named position
};

/** Where a spring toast hops in from: the edge it is docked against. */
const springOrigins: Record<ToastPosition, string> = {
  "top-left": "[--dowel-toast-from:-3rem]",
  "top-center": "[--dowel-toast-from:0]",
  "top-right": "[--dowel-toast-from:3rem]",
  "bottom-left": "[--dowel-toast-from:-3rem]",
  "bottom-center": "[--dowel-toast-from:0]",
  "bottom-right": "[--dowel-toast-from:3rem]",
};

export interface ToasterProps {
  position?: ToastPosition;
  /** Default auto-dismiss in ms. Individual toasts may override it. */
  duration?: number;
  className?: string;
  /** Names the toast region for assistive technology. */
  label?: string;
  /** How toasts enter. See `Toast`'s `animation`. */
  animation?: "default" | "spring";
}

/**
 * Renders the toast queue. Mount once, near the root of the application.
 */
export function Toaster({
  position = "bottom-right",
  duration = DEFAULT_TOAST_DURATION,
  className,
  label = "Notifications",
  animation = "default",
}: ToasterProps) {
  const toasts = useToasts();
  // Swiping should follow the edge the toasts are docked against.
  const swipeDirection = position.endsWith("left") ? "left" : "right";

  return (
    <ToastPrimitive.Provider swipeDirection={swipeDirection} duration={duration} label={label}>
      {toasts.map((record) => (
        <ToastItem key={record.id} record={record} animation={animation} />
      ))}
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className={cn(
          "pointer-events-none fixed z-[var(--z-toast)] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm",
          viewportPositions[position],
          animation === "spring" && springOrigins[position],
          className,
        )}
      />
    </ToastPrimitive.Provider>
  );
}

/** Variants that report a problem should interrupt rather than wait for a pause. */
const FOREGROUND_VARIANTS = new Set<ToastVariant>(["destructive", "warning"]);

/**
 * Largest delay setTimeout accepts (2^31 - 1 ms, about 24 days).
 *
 * Anything above this silently overflows to a 32-bit integer and fires almost
 * immediately, so mapping `Infinity` to MAX_SAFE_INTEGER would dismiss a
 * persistent toast after roughly one millisecond — the exact opposite of what
 * was asked for.
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

function ToastItem({
  record,
  animation,
}: {
  record: ToastRecord;
  animation: "default" | "spring";
}) {
  const { id, title, description, variant, action, duration } = record;

  const type = FOREGROUND_VARIANTS.has(variant) ? "foreground" : "background";

  return (
    <Toast
      variant={variant}
      animation={animation}
      type={type}
      // Mirrored onto the element because the primitive expresses `type` only
      // through the transient live region it renders elsewhere. Having it here
      // gives styling and tests something stable to read.
      data-type={type}
      duration={duration === Infinity ? MAX_TIMEOUT_MS : duration}
      onOpenChange={(open) => {
        // Covers every route out: the timer, the close button and a swipe.
        if (!open) toast.dismiss(id);
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title === undefined ? null : <ToastTitle>{title}</ToastTitle>}
        {description === undefined ? null : <ToastDescription>{description}</ToastDescription>}
      </div>
      {action ? (
        <ToastAction altText={action.altText ?? action.label} onClick={action.onClick}>
          {action.label}
        </ToastAction>
      ) : null}
      <ToastClose />
    </Toast>
  );
}

export { toastVariants };
