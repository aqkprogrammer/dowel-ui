"use client";

// Original design (pattern inspired by Animate UI Alert Dialog; no code referenced).
import { cva, type VariantProps } from "class-variance-authority";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { createContext, useContext, type ComponentPropsWithRef, type ReactNode } from "react";

import { buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";

/*
 * A modal that asks before something consequential happens.
 *
 * It keeps Dialog's shape — the same card, header, footer and type scale — and
 * gives the moment more weight:
 *
 * - The overlay fades in while its backdrop blur ramps up from nothing, so the
 *   page recedes rather than being covered.
 * - The card springs up from a little below, scaling from 94% and coming into
 *   focus from an 8px blur, on the overshoot curve. Its sections follow it in,
 *   one after another.
 * - Leaving is quicker and plainer: a short fade and settle on ease-in.
 *
 * The Dowel twist is `tone`. A destructive dialog colours its media tile and
 * defaults its action to the destructive button, and the icon gives one gentle
 * shake as the card lands — a nudge, not an alarm. The shake is decoration:
 * the words in the title and description carry the warning.
 *
 * Radix AlertDialog does the rest: role="alertdialog", focus trapped and moved
 * to Cancel (the safe choice) on open, restored to the trigger on close, and
 * no dismissal by clicking outside. Every keyframe is on the motion scale and
 * collapses under reduced motion.
 */

const PREFIX = "dowel-alert-dialog";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const CONTENT = "[data-slot=alert-dialog-content]";
const SECTION = `${CONTENT}[data-state=open]>*`;
const STAGGER_STEP_MS = 55;
const STAGGERED = 4;

const STYLES = `
@keyframes ${PREFIX}-overlay-in{from{opacity:0;backdrop-filter:blur(0)}to{opacity:1;backdrop-filter:blur(6px)}}
@keyframes ${PREFIX}-overlay-out{from{opacity:1;backdrop-filter:blur(6px)}to{opacity:0;backdrop-filter:blur(0)}}
@keyframes ${PREFIX}-rise{from{transform:translateY(1.25rem) scale(.94)}to{transform:none}}
@keyframes ${PREFIX}-focus{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:blur(0)}}
@keyframes ${PREFIX}-out{to{opacity:0;transform:translateY(.375rem) scale(.97)}}
@keyframes ${PREFIX}-section{from{opacity:0;transform:translateY(.5rem)}}
@keyframes ${PREFIX}-shake{0%,100%{rotate:0deg}18%{rotate:-11deg}36%{rotate:9deg}54%{rotate:-6deg}72%{rotate:3deg}86%{rotate:-1deg}}
[data-slot=alert-dialog-overlay][data-state=open]{animation:${PREFIX}-overlay-in ${scaled(320)} var(--ease-out-quint) both}
[data-slot=alert-dialog-overlay][data-state=closed]{animation:${PREFIX}-overlay-out ${scaled(160)} var(--ease-in-quint) both}
${CONTENT}[data-state=open]{animation:${PREFIX}-rise ${scaled(460)} var(--ease-overshoot) both,${PREFIX}-focus ${scaled(260)} var(--ease-out-quint) both}
${CONTENT}[data-state=closed]{animation:${PREFIX}-out ${scaled(150)} var(--ease-in-quint) both}
${SECTION}{animation:${PREFIX}-section ${scaled(320)} var(--ease-out-quint) ${scaled(60)} both}
${Array.from(
  { length: STAGGERED - 1 },
  (_, i) =>
    `${SECTION}:nth-child(${String(i + 2)}){animation-delay:${scaled(60 + (i + 1) * STAGGER_STEP_MS)}}`,
).join("\n")}
${SECTION}:nth-child(n+${String(STAGGERED + 1)}){animation-delay:${scaled(60 + STAGGERED * STAGGER_STEP_MS)}}
${CONTENT}[data-state=open][data-tone=destructive] [data-slot=alert-dialog-media]>*{animation:${PREFIX}-shake ${scaled(560)} var(--ease-in-out-quint) ${scaled(260)} both}
`;

type Tone = "default" | "destructive";

const ToneContext = createContext<Tone>("default");

const alertDialogVariants = cva(
  cn(
    "fixed top-1/2 left-1/2 z-[var(--z-modal)] grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4",
    "rounded-xl border bg-card p-6 text-card-foreground shadow-xl outline-none",
  ),
  {
    variants: {
      /** `destructive` tints the media, shakes its icon on open and defaults the action to destructive. */
      tone: {
        default: "border-border",
        destructive:
          "border-[color-mix(in_oklab,var(--color-destructive)_28%,var(--color-border))]",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

const alertDialogMediaVariants = cva(
  "mb-2 grid size-10 shrink-0 place-items-center rounded-full [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      tone: {
        default: "bg-muted text-foreground",
        destructive:
          "bg-[color-mix(in_oklab,var(--color-destructive)_14%,transparent)] text-destructive",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

/** The dialog. Open it from an AlertDialogTrigger, or control it with `open`. */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export type AlertDialogOverlayProps = ComponentPropsWithRef<
  typeof AlertDialogPrimitive.Overlay
>;

export function AlertDialogOverlay({ className, ...props }: AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-[var(--z-overlay)] bg-overlay backdrop-blur-[6px]",
        className,
      )}
      {...props}
    />
  );
}

export interface AlertDialogContentProps
  extends
    ComponentPropsWithRef<typeof AlertDialogPrimitive.Content>,
    VariantProps<typeof alertDialogVariants> {}

export function AlertDialogContent({
  className,
  tone,
  children,
  ...props
}: AlertDialogContentProps) {
  const resolved: Tone = tone ?? "default";
  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          data-tone={resolved}
          className={cn(alertDialogVariants({ tone }), className)}
          {...props}
        >
          <ToneContext value={resolved}>{children}</ToneContext>
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </>
  );
}

export interface AlertDialogHeaderProps extends ComponentPropsWithRef<"div"> {
  /** An icon shown in a tile above the title. In the destructive tone it shakes once on open. */
  icon?: ReactNode;
}

export function AlertDialogHeader({
  className,
  icon,
  children,
  ...props
}: AlertDialogHeaderProps) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5 text-start", className)}
      {...props}
    >
      {icon ? <AlertDialogMedia>{icon}</AlertDialogMedia> : null}
      {children}
    </div>
  );
}

/** A decorative icon tile. Use it in AlertDialogHeader, or pass `icon` to the header. */
export function AlertDialogMedia({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"div">) {
  const tone = useContext(ToneContext);
  return (
    <div
      data-slot="alert-dialog-media"
      aria-hidden="true"
      className={cn(alertDialogMediaVariants({ tone }), className)}
      {...props}
    >
      {/* The shake runs on this wrapper, so a consumer transform on the tile is kept. */}
      <span className="grid place-items-center">{children}</span>
    </div>
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export type AlertDialogTitleProps = ComponentPropsWithRef<typeof AlertDialogPrimitive.Title>;

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export type AlertDialogDescriptionProps = ComponentPropsWithRef<
  typeof AlertDialogPrimitive.Description
>;

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

type ButtonStyle = Pick<VariantProps<typeof buttonVariants>, "variant" | "size">;

export interface AlertDialogActionProps
  extends ComponentPropsWithRef<typeof AlertDialogPrimitive.Action>, ButtonStyle {}

/** Confirms. Styled as the destructive button in the destructive tone, primary otherwise. */
export function AlertDialogAction({
  className,
  variant,
  size,
  ...props
}: AlertDialogActionProps) {
  const tone = useContext(ToneContext);
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn(
        buttonVariants({
          variant: variant ?? (tone === "destructive" ? "destructive" : "primary"),
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

export interface AlertDialogCancelProps
  extends ComponentPropsWithRef<typeof AlertDialogPrimitive.Cancel>, ButtonStyle {}

/** Backs out. Receives focus when the dialog opens, because it is the safe choice. */
export function AlertDialogCancel({
  className,
  variant,
  size,
  ...props
}: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(buttonVariants({ variant: variant ?? "outline", size }), className)}
      {...props}
    />
  );
}

export { alertDialogMediaVariants, alertDialogVariants };
