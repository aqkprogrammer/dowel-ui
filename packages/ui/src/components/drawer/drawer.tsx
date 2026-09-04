"use client";

import { Dialog as DrawerPrimitive } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A bottom sheet that can be dismissed by dragging it down.
 *
 * Drag is a pointer-only affordance. Escape, the overlay and the close button
 * are the accessible equivalents and are always present, so keyboard and screen
 * reader users are never dependent on the gesture.
 *
 * Deliberately bottom-anchored only. A drawer that enters from the side with no
 * gesture is a Sheet, and having two components that differ by nothing but a
 * name is worse than having one. Snap points are not supported in this version.
 */

interface DrawerContextValue {
  close: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext(component: string): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <Drawer>.`);
  }
  return context;
}

export interface DrawerProps extends Omit<
  ComponentPropsWithRef<typeof DrawerPrimitive.Root>,
  "onOpenChange"
> {
  /**
   * Redeclared as a property rather than inherited as a method signature. The
   * inherited shorthand reads as a method, which makes destructuring it look
   * like an unbound `this` hazard to static analysis; a plain function property
   * says what this actually is.
   */
  onOpenChange?: (open: boolean) => void;
}

export function Drawer({ open, defaultOpen, onOpenChange, children, ...props }: DrawerProps) {
  // State is owned here (while still supporting the controlled form) because
  // dismissing by drag has to close the drawer, and the primitive exposes no
  // imperative close.
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = useMemo<DrawerContextValue>(
    () => ({ close: () => setOpen(false) }),
    [setOpen],
  );

  return (
    <DrawerPrimitive.Root open={isOpen} onOpenChange={setOpen} {...props}>
      <DrawerContext.Provider value={contextValue}>{children}</DrawerContext.Provider>
    </DrawerPrimitive.Root>
  );
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;
export const DrawerClose = DrawerPrimitive.Close;

export function DrawerOverlay({
  className,
  ...props
}: ComponentPropsWithRef<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] bg-overlay",
        "data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in",
        className,
      )}
      {...props}
    />
  );
}

/** Fraction of the drawer's height past which release dismisses it. */
const DISMISS_DISTANCE_RATIO = 0.25;
/** Downward speed (px/ms) that dismisses a short but deliberate flick. */
const DISMISS_VELOCITY = 0.5;
/**
 * Travel below which nothing dismisses, however fast.
 *
 * A tap on the handle registers as a few pixels of movement over a couple of
 * milliseconds, which is an enormous velocity. Without a floor, touching the
 * drawer would close it.
 */
const MIN_FLICK_DISTANCE = 24;

export interface DrawerContentProps extends ComponentPropsWithRef<
  typeof DrawerPrimitive.Content
> {
  /** Shows the grab handle. Turn off only if the drawer cannot be dragged. */
  showHandle?: boolean;
}

export function DrawerContent({
  className,
  children,
  showHandle = true,
  ...props
}: DrawerContentProps) {
  const { close } = useDrawerContext("DrawerContent");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ startY: number; startTime: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    gesture.current = { startY: event.clientY, startTime: event.timeStamp };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!gesture.current) return;
    // Downward only: dragging up must not detach the drawer from the edge.
    setOffset(Math.max(0, event.clientY - gesture.current.startY));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!gesture.current) return;

    const distance = Math.max(0, event.clientY - gesture.current.startY);
    const elapsed = Math.max(1, event.timeStamp - gesture.current.startTime);
    const velocity = distance / elapsed;
    const height = contentRef.current?.getBoundingClientRect().height ?? 0;

    gesture.current = null;
    setIsDragging(false);
    setOffset(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const draggedPastThreshold = height > 0 && distance > height * DISMISS_DISTANCE_RATIO;
    const flicked = distance >= MIN_FLICK_DISTANCE && velocity > DISMISS_VELOCITY;

    if (draggedPastThreshold || flicked) {
      close();
    }
  };

  const dragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={contentRef}
        data-slot="drawer-content"
        data-dragging={isDragging || undefined}
        style={offset > 0 ? { transform: `translate3d(0, ${String(offset)}px, 0)` } : undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[var(--z-drawer)] flex max-h-[92svh] flex-col",
          "rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-xl",
          "[--slide-y:100%]",
          "data-[state=closed]:animate-slide-out data-[state=open]:animate-slide-in",
          // While a finger is down the transform is driven directly; afterwards
          // it springs back. Suppressing the entry animation mid-drag stops the
          // two from fighting over the same property.
          "data-[dragging]:animate-none data-[dragging]:transition-none",
          "transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          className,
        )}
        {...props}
      >
        {showHandle ? (
          <div
            data-slot="drawer-handle"
            aria-hidden="true"
            className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
            {...dragHandlers}
          >
            <div className="h-1.5 w-10 rounded-full bg-border-strong" />
          </div>
        ) : null}
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

export function DrawerHeader({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex shrink-0 flex-col gap-1.5 px-6 pt-4 pb-2 text-start", className)}
      {...props}
    />
  );
}

export function DrawerBody({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("overflow-y-auto overscroll-contain px-6 py-2", className)}
      {...props}
    />
  );
}

export function DrawerFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("flex shrink-0 flex-col gap-2 px-6 pt-2 pb-6", className)}
      {...props}
    />
  );
}

export function DrawerTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-lg leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DrawerDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Close control for the drawer footer, styled as a full-width secondary action. */
export function DrawerCancel({
  className,
  ...props
}: ComponentPropsWithRef<typeof DrawerPrimitive.Close>) {
  return (
    <DrawerPrimitive.Close
      data-slot="drawer-cancel"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium",
        "transition-colors duration-[var(--duration-fast)] hover:bg-accent hover:text-accent-foreground",
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
