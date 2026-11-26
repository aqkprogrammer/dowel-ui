"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useState,
  type AnimationEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type MouseEvent,
  type TransitionEvent,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pill that becomes its own progress ring.
 *
 * Idle, it is a pill with an arrow and a label. Pressed, the pill draws in to
 * a circle (its width eases down to its height), the label fades, and a ring
 * fills around the circle's edge. When the ring closes, a check mark draws
 * itself, holds for a beat, and the circle opens back out into the pill.
 *
 * The whole sequence is driven by CSS and its own events, not by timers: the
 * simulated fill is a keyframe whose `animationend` reports "done", and the
 * check's hold is a keyframe whose `animationend` reports "idle". Every
 * duration and delay runs through --motion-scale, so under reduced motion the
 * sequence still happens — the states and announcements are the same — but
 * each step lands at once instead of animating. Pass `progress` (0–1) to show
 * real progress instead of the simulated fill; the ring then follows it.
 *
 * It stays a <button> throughout, named by its label. While working it is
 * aria-busy and aria-disabled (still focusable, so focus is not lost), and a
 * visually hidden polite live region beside it says "Uploading" and
 * "Uploaded" once each — never the percentage, which would chatter.
 *
 * The working colour is `--upload-button-accent`, set by the `accent` prop or
 * a class, and defaults to the foreground so the circle reads as the pill it
 * came from.
 */

const PREFIX = "dowel-upload-button";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const ACCENT = "--upload-button-accent";
const FILL = "--upload-button-fill";

const STYLES = `
@keyframes ${PREFIX}-fill{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes ${PREFIX}-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes ${PREFIX}-hold{from{opacity:1}to{opacity:1}}
@keyframes ${PREFIX}-pop{0%{scale:.6}60%{scale:1.12}100%{scale:1}}
[data-slot=upload-button-track][data-simulated]{animation:${PREFIX}-fill var(${FILL}) cubic-bezier(.45,.05,.35,1) ${scaled(260)} both}
[data-slot=upload-button-check]{animation:${PREFIX}-pop ${scaled(360)} var(--ease-overshoot) both}
[data-slot=upload-button-check] path{stroke-dasharray:24;animation:${PREFIX}-draw ${scaled(280)} var(--ease-out-quint) ${scaled(80)} both,${PREFIX}-hold ${scaled(520)} linear ${scaled(360)} both}
`;

const uploadButtonVariants = cva(
  cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold whitespace-nowrap select-none",
    "bg-foreground text-background",
    "transition-[width,background-color,scale,box-shadow] duration-[calc(420ms*var(--motion-scale,1)),var(--duration-normal),var(--duration-fast),var(--duration-normal)] ease-[var(--ease-out-quint)]",
    "motion-safe:active:scale-95",
    "data-[status=done]:bg-[var(--upload-button-accent)] data-[status=uploading]:bg-[var(--upload-button-accent)]",
    "data-[status=uploading]:cursor-progress",
    "disabled:pointer-events-none disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "h-9 w-28 gap-1.5 text-xs data-[status=done]:w-9 data-[status=uploading]:w-9 [&_svg]:size-3.5",
        md: "h-11 w-36 gap-2 text-sm data-[status=done]:w-11 data-[status=uploading]:w-11 [&_svg]:size-4",
        lg: "h-14 w-44 gap-2.5 text-base data-[status=done]:w-14 data-[status=uploading]:w-14 [&_svg]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type UploadButtonStatus = "idle" | "uploading" | "done";

export interface UploadButtonProps
  extends
    Omit<ComponentPropsWithRef<"button">, "children">,
    VariantProps<typeof uploadButtonVariants> {
  /** Controlled status. */
  status?: UploadButtonStatus;
  /** Initial status when uncontrolled. */
  defaultStatus?: UploadButtonStatus;
  /** Called when the button moves to a new status: on press, when the ring closes, and when it reopens. */
  onStatusChange?: (status: UploadButtonStatus) => void;
  /** Real progress, 0–1. Omit it and the ring fills on its own over `duration`. */
  progress?: number;
  /** How long the simulated fill takes, in milliseconds. Scaled by --motion-scale. */
  duration?: number;
  /** The visible label and accessible name. */
  label?: string;
  /** Announced while working. */
  uploadingLabel?: string;
  /** Announced when finished. */
  doneLabel?: string;
  /** Colour of the working circle. Defaults to the foreground. */
  accent?: string;
}

function ArrowUp() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}

/** A pill upload button that shrinks into a progress ring, draws a check, and opens back out. */
export function UploadButton({
  className,
  size,
  status: statusProp,
  defaultStatus = "idle",
  onStatusChange,
  progress,
  duration = 1200,
  label = "Upload",
  uploadingLabel = "Uploading",
  doneLabel = "Uploaded",
  accent,
  style,
  onClick,
  onAnimationEnd,
  onTransitionEnd,
  ...props
}: UploadButtonProps) {
  const [uncontrolled, setUncontrolled] = useState<UploadButtonStatus>(defaultStatus);
  const status = statusProp ?? uncontrolled;
  const working = status !== "idle";
  const simulated = progress === undefined;
  const clamped = Math.min(1, Math.max(0, progress ?? 0));

  // Only announce changes that happened here, not the status it mounted with.
  const [announced, setAnnounced] = useState("");
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    setAnnounced(status === "uploading" ? uploadingLabel : status === "done" ? doneLabel : "");
  }

  function request(next: UploadButtonStatus) {
    if (next === status) return;
    if (statusProp === undefined) setUncontrolled(next);
    onStatusChange?.(next);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented || working) return;
    request("uploading");
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLButtonElement>) {
    onAnimationEnd?.(event);
    if (event.animationName === `${PREFIX}-fill` && status === "uploading") request("done");
    if (event.animationName === `${PREFIX}-hold` && status === "done") request("idle");
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLButtonElement>) {
    onTransitionEnd?.(event);
    // Real progress reaching the end closes the ring the same way.
    const target = event.target as Element;
    if (
      !simulated &&
      clamped >= 1 &&
      status === "uploading" &&
      target.getAttribute("data-slot") === "upload-button-track"
    ) {
      request("done");
    }
  }

  return (
    <>
      <button
        type="button"
        data-slot="upload-button"
        data-status={status}
        aria-busy={status === "uploading" || undefined}
        aria-disabled={working || undefined}
        className={cn(uploadButtonVariants({ size }), className)}
        style={
          {
            [ACCENT]: accent ?? "var(--color-foreground)",
            [FILL]: scaled(duration),
            ...style,
          } as CSSProperties
        }
        onClick={handleClick}
        onAnimationEnd={handleAnimationEnd}
        onTransitionEnd={handleTransitionEnd}
        {...props}
      >
        <style href={PREFIX} precedence="dowel">
          {STYLES}
        </style>
        <span
          data-slot="upload-button-label"
          className={cn(
            "inline-flex items-center gap-[inherit] transition-[opacity,filter] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
            working && "opacity-0 blur-[2px]",
          )}
        >
          <ArrowUp />
          {label}
        </span>
        {status === "uploading" ? (
          <svg
            viewBox="0 0 40 40"
            aria-hidden="true"
            data-slot="upload-button-ring"
            className="absolute inset-0 m-auto size-[72%]! -rotate-90"
          >
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="4"
            />
            <circle
              data-slot="upload-button-track"
              data-simulated={simulated || undefined}
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={simulated ? undefined : 100 * (1 - clamped)}
              className="transition-[stroke-dashoffset] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]"
            />
          </svg>
        ) : null}
        {status === "done" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            data-slot="upload-button-check"
            className="absolute inset-0 m-auto size-[46%]!"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announced}
      </span>
    </>
  );
}

export { uploadButtonVariants };
