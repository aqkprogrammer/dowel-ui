"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A day/night switch whose thumb squashes as it crosses and whose sun sets
 * into a moon on the way.
 *
 * Off is day: a muted track with the thumb at the start, carrying a sun. On,
 * the thumb travels to the end on an ease-in-out curve while an inner layer
 * plays a squash-and-stretch keyframe (wide and flat mid-flight, a small
 * rebound on landing), and the track floods to the foreground colour, so in a
 * dark theme it turns light around a dark thumb. Inside the thumb one SVG
 * draws both glyphs: the rays retract and twist away, the disc swells, and a
 * shadow circle slides across the disc's mask to cut it into a crescent.
 * Going back, every part reverses. Two keyframe names, one per direction,
 * restart the squash on each change; it is held off until the first change so
 * nothing bounces on first paint. All durations are tokens on --motion-scale,
 * so under reduced motion the switch simply changes state.
 *
 * Semantics: the Radix switch primitive, role="switch" with aria-checked,
 * toggled by click, Space or Enter, with a hidden input inside forms and a
 * visible focus ring. The artwork is aria-hidden, so name it ("Dark mode").
 * The thumb travels toward the inline end, so `--dir` mirrors it in
 * right-to-left layouts. It never touches the document theme: wire
 * `onCheckedChange` to whatever sets it.
 */

const PREFIX = "dowel-day-night-switch";
const ROOT = `.${PREFIX}`;
const ON = `${ROOT}[data-state=checked]`;

const STYLES = `
@keyframes ${PREFIX}-squash-on{0%{transform:scale(1,1)}40%{transform:scale(1.32,.8)}72%{transform:scale(.94,1.05)}100%{transform:scale(1,1)}}
@keyframes ${PREFIX}-squash-off{0%{transform:scale(1,1)}40%{transform:scale(1.32,.8)}72%{transform:scale(.94,1.05)}100%{transform:scale(1,1)}}
${ROOT}[data-moved] [data-part=body]{animation:${PREFIX}-squash-off var(--duration-slower) var(--ease-out-quint)}
${ON}[data-moved] [data-part=body]{animation-name:${PREFIX}-squash-on}
${ROOT} [data-part=glyph]{transform-box:view-box;transform-origin:center;transform:rotate(45deg);transition:transform var(--duration-slower) var(--ease-out-quint)}
${ON} [data-part=glyph]{transform:rotate(0deg)}
${ROOT} [data-part=disc]{transform-box:fill-box;transform-origin:center;transform:scale(1);transition:transform var(--duration-slow) var(--ease-out-quint)}
${ON} [data-part=disc]{transform:scale(1.55);transition-timing-function:var(--ease-overshoot)}
${ROOT} [data-part=shadow]{transform:translate(9px,-9px);transition:transform var(--duration-normal) var(--ease-in-quint)}
${ON} [data-part=shadow]{transform:translate(0,0);transition-duration:var(--duration-slow);transition-timing-function:var(--ease-out-quint);transition-delay:var(--duration-fast)}
${ROOT} [data-part=rays]{transform-box:fill-box;transform-origin:center;opacity:1;transform:scale(1) rotate(0deg);transition:transform var(--duration-slow) var(--ease-overshoot) var(--duration-fast),opacity var(--duration-normal) var(--ease-out-quint) var(--duration-fast)}
${ON} [data-part=rays]{opacity:0;transform:scale(.45) rotate(-45deg);transition-duration:var(--duration-normal),var(--duration-fast);transition-timing-function:var(--ease-in-quint);transition-delay:0s}
`;

const dayNightSwitchVariants = cva(
  cn(
    PREFIX,
    "group/dn relative inline-flex shrink-0 cursor-pointer items-center rounded-full select-none",
    "h-[2.75em] w-[5.5em] p-[0.25em] [--dir:1] rtl:[--dir:-1]",
    "bg-muted shadow-[inset_0_1px_3px_0_var(--color-overlay)]",
    "transition-[background-color] duration-[var(--duration-slower)] ease-[var(--ease-in-out-quint)]",
    "data-[state=checked]:bg-foreground",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "text-[0.625rem]",
        md: "text-base",
        lg: "text-2xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const RAYS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4;
  const point = (radius: number) =>
    [
      (12 + Math.cos(angle) * radius).toFixed(2),
      (12 + Math.sin(angle) * radius).toFixed(2),
    ] as const;
  const [x1, y1] = point(6.6);
  const [x2, y2] = point(9);
  return { x1, y1, x2, y2 };
});

export interface DayNightSwitchProps
  extends
    Omit<
      ComponentPropsWithRef<typeof SwitchPrimitive.Root>,
      "children" | "checked" | "defaultChecked" | "onCheckedChange"
    >,
    VariantProps<typeof dayNightSwitchVariants> {
  /** Controlled state: true is night. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** A day/night switch: the thumb squashes across and its sun becomes a moon. */
export function DayNightSwitch({
  className,
  size,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: DayNightSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;

  // Whether it has ever moved, so the squash never plays on first paint.
  const [previous, setPrevious] = useState(checked);
  const [moved, setMoved] = useState(false);
  if (previous !== checked) {
    setPrevious(checked);
    setMoved(true);
  }

  return (
    <SwitchPrimitive.Root
      data-slot="day-night-switch"
      data-moved={moved ? "" : undefined}
      checked={checked}
      onCheckedChange={(next) => {
        if (checkedProp === undefined) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
      className={cn(dayNightSwitchVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Thumb
        data-slot="day-night-switch-thumb"
        className={cn(
          "block size-[2.25em]",
          "transition-[translate] duration-[var(--duration-slower)] ease-[var(--ease-in-out-quint)]",
          "group-data-[state=checked]/dn:translate-x-[calc(2.75em*var(--dir))]",
        )}
      >
        <span
          data-part="body"
          className="grid size-full place-items-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.3em]">
            <defs>
              <mask id={`${id}-moon`}>
                <rect width="24" height="24" fill="white" />
                <circle data-part="shadow" cx="16" cy="8" r="5.5" fill="black" />
              </mask>
            </defs>
            <g data-part="glyph">
              <g data-part="rays" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                {RAYS.map((ray) => (
                  <line key={`${ray.x1},${ray.y1}`} {...ray} />
                ))}
              </g>
              <circle
                data-part="disc"
                cx="12"
                cy="12"
                r="4.4"
                fill="currentColor"
                mask={`url(#${id}-moon)`}
              />
            </g>
          </svg>
        </span>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { dayNightSwitchVariants };
