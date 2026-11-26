"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/*
 * A Face ID glyph that tells a biometric check's story.
 *
 * - idle: four corner brackets around a resting face.
 * - scanning: a scan line sweeps up and down the frame while the face shifts
 *   its expression (the smile flattens, the eyes narrow), so it reads as
 *   being looked at rather than merely waiting.
 * - success: the face shrinks away, the brackets draw in a little and a
 *   check mark strokes itself into the middle.
 * - error: the brackets shake once and the mouth turns down, in the
 *   destructive colour.
 *
 * Every keyframe and transition is hoisted CSS on --motion-scale. Under
 * reduced motion the scan line stops and each state change lands on its
 * final frame; the label still changes, so nothing is lost.
 *
 * The root is role="status", so the label ("Scanning", "Unlocked") is
 * announced politely as `status` changes. The glyph is aria-hidden. With
 * `hideLabel` the label is visually hidden but still announced.
 */

export type FaceIdStatus = "idle" | "scanning" | "success" | "error";

const PREFIX = "dowel-face-id";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
.${PREFIX} svg [data-part]{transform-box:view-box;transform-origin:24px 24px}
.${PREFIX} [data-part=frame]{transition:transform ${scaled(420)} var(--ease-overshoot)}
.${PREFIX} [data-part=face]{transition:opacity ${scaled(220)} var(--ease-out-quint),transform ${scaled(360)} var(--ease-out-quint)}
.${PREFIX} [data-part=check]{stroke-dasharray:1;stroke-dashoffset:1;opacity:0;transition:stroke-dashoffset ${scaled(420)} var(--ease-out-quint) ${scaled(140)},opacity ${scaled(120)} linear ${scaled(140)}}
.${PREFIX} [data-part=smile],.${PREFIX} [data-part=flat],.${PREFIX} [data-part=frown]{transition:opacity ${scaled(200)} var(--ease-out-quint)}
.${PREFIX} [data-part=flat],.${PREFIX} [data-part=frown],.${PREFIX} [data-part=scan]{opacity:0}
.${PREFIX}[data-status=scanning] [data-part=scan]{opacity:1;animation:${PREFIX}-scan ${scaled(1400)} var(--ease-in-out-quint) infinite alternate}
.${PREFIX}[data-status=scanning] [data-part=smile]{animation:${PREFIX}-smile ${scaled(1400)} var(--ease-in-out-quint) infinite alternate}
.${PREFIX}[data-status=scanning] [data-part=flat]{animation:${PREFIX}-flat ${scaled(1400)} var(--ease-in-out-quint) infinite alternate}
.${PREFIX}[data-status=scanning] [data-part=eyes]{animation:${PREFIX}-squint ${scaled(1400)} var(--ease-in-out-quint) infinite alternate}
.${PREFIX}[data-status=success] [data-part=frame]{transform:scale(.9)}
.${PREFIX}[data-status=success] [data-part=face]{opacity:0;transform:scale(.6)}
.${PREFIX}[data-status=success] [data-part=check]{stroke-dashoffset:0;opacity:1}
.${PREFIX}[data-status=error] [data-part=frame]{animation:${PREFIX}-shake ${scaled(420)} var(--ease-out-quint)}
.${PREFIX}[data-status=error] [data-part=smile]{opacity:0}
.${PREFIX}[data-status=error] [data-part=frown]{opacity:1}
.${PREFIX} [data-part=label]{animation:${PREFIX}-label ${scaled(240)} var(--ease-out-quint)}
@keyframes ${PREFIX}-scan{from{transform:translateY(9px)}to{transform:translateY(39px)}}
@keyframes ${PREFIX}-smile{0%,30%{opacity:1}60%,100%{opacity:0}}
@keyframes ${PREFIX}-flat{0%,30%{opacity:0}60%,100%{opacity:1}}
@keyframes ${PREFIX}-squint{0%,40%{transform:scaleY(1)}100%{transform:scaleY(.55)}}
@keyframes ${PREFIX}-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(1px)}}
@keyframes ${PREFIX}-label{from{opacity:0;transform:translateY(.25em)}to{opacity:1;transform:none}}
`;

const faceIdVariants = cva(
  cn(
    PREFIX,
    "inline-flex flex-col items-center text-foreground select-none",
    "transition-colors duration-[var(--duration-normal)] data-[status=error]:text-destructive",
  ),
  {
    variants: {
      size: {
        sm: "gap-1.5 text-2xs [&_svg]:size-10",
        md: "gap-2 text-xs [&_svg]:size-16",
        lg: "gap-3 text-sm [&_svg]:size-24",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const DEFAULT_LABELS: Record<FaceIdStatus, string> = {
  idle: "Face ID",
  scanning: "Scanning",
  success: "Unlocked",
  error: "Not recognized",
};

export interface FaceIdProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, VariantProps<typeof faceIdVariants> {
  /** Where the check is. Drive it from your authentication flow. */
  status?: FaceIdStatus;
  /** Override the caption for any state, e.g. `{ success: "Welcome back" }`. */
  labels?: Partial<Record<FaceIdStatus, string>>;
  /** Hide the caption visually. It is still announced. */
  hideLabel?: boolean;
}

/** A Face ID glyph that scans, morphs into a check on success and shakes on error. */
export function FaceId({
  className,
  status = "idle",
  labels,
  hideLabel = false,
  size,
  ...props
}: FaceIdProps) {
  const label = labels?.[status] ?? DEFAULT_LABELS[status];

  return (
    <div
      role="status"
      data-slot="face-id"
      data-status={status}
      className={cn(faceIdVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <g data-part="frame">
          <path d="M4 14V9a5 5 0 0 1 5-5h5" />
          <path d="M34 4h5a5 5 0 0 1 5 5v5" />
          <path d="M44 34v5a5 5 0 0 1-5 5h-5" />
          <path d="M14 44H9a5 5 0 0 1-5-5v-5" />
        </g>
        <g data-part="face">
          <g data-part="eyes">
            <path d="M17 17v3.5" />
            <path d="M31 17v3.5" />
          </g>
          <path d="M24 17v8h-2" />
          <path data-part="smile" d="M17 31.5c4 3.5 10 3.5 14 0" />
          <path data-part="flat" d="M18.5 32.5h11" />
          <path data-part="frown" d="M17.5 34c4-3 9-3 13 0" />
        </g>
        <path data-part="check" pathLength={1} strokeWidth="2.75" d="M15 24.5l6 6 12-13" />
        <path data-part="scan" strokeWidth="1.5" strokeOpacity=".85" d="M7 0h34" />
      </svg>
      <span
        key={status}
        data-part="label"
        className={cn("font-medium text-muted-foreground", hideLabel && "sr-only")}
      >
        {label}
      </span>
    </div>
  );
}

export { faceIdVariants };
