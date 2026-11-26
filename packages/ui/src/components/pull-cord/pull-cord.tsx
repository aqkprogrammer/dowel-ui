"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A little pendant lamp with a pull cord. Pull it and the cord stretches down,
 * springs back past its rest, settles, and the bulb under the shade comes on
 * with a warm halo, or goes dark.
 *
 * The cord is a line and a knob. A toggle plays one keyframe pair: the line
 * scales down from its top while the knob travels with its end, overshooting
 * up and settling like a spring. To replay it on every toggle, the element
 * alternates between two identical keyframes (`-a` and `-b`); nothing plays on
 * first paint. The bulb and halo change a beat into the pull, as the cord
 * reaches the bottom of its travel. The lamp is drawn in `em`, so `size`
 * scales it by changing one font size.
 *
 * It is a Radix switch: role="switch" with aria-checked, Space or Enter
 * toggles, it has a focus ring and a hidden input inside forms. The drawing is
 * aria-hidden and the lamp has no visible text, so name it with aria-label
 * (it defaults to "Lamp"). Every duration runs through --motion-scale, so
 * under reduced motion the cord stays put and the light simply switches.
 *
 * The warm light is `glow`, any CSS colour, defaulting to the warning token.
 * The drawing never mirrors: a lamp has no reading direction.
 */

const P = "dowel-pull-cord";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

/** Cord length at rest, in em; the pull stretches it by the offsets below. */
const CORD = 3.3;
/** The knob's travel through one pull, in em: down, past rest, and settle. */
const PULL = [
  [0, 0],
  [22, 1],
  [46, -0.32],
  [64, 0.16],
  [80, -0.06],
  [100, 0],
] as const;

const lineFrames = PULL.map(
  ([at, offset]) => `${String(at)}%{transform:scaleY(${((CORD + offset) / CORD).toFixed(3)})}`,
).join("");
const knobFrames = PULL.map(
  ([at, offset]) => `${String(at)}%{transform:translateY(${String(offset)}em)}`,
).join("");

const STYLES = `
.${P}{direction:ltr;--pull-cord-light:var(--pull-cord-glow,var(--color-warning))}
.${P} [data-part=line]{transform-origin:top}
.${P}[data-pull=a] [data-part=line]{animation:${P}-line-a ${s(0.9)} cubic-bezier(.3,.7,.4,1)}
.${P}[data-pull=b] [data-part=line]{animation:${P}-line-b ${s(0.9)} cubic-bezier(.3,.7,.4,1)}
.${P}[data-pull=a] [data-part=knob]{animation:${P}-knob-a ${s(0.9)} cubic-bezier(.3,.7,.4,1)}
.${P}[data-pull=b] [data-part=knob]{animation:${P}-knob-b ${s(0.9)} cubic-bezier(.3,.7,.4,1)}
.${P} [data-part=bulb]{background:color-mix(in oklab,var(--color-muted-foreground) 45%,transparent);transition:background-color ${s(0.25)} ease ${s(0.18)},box-shadow ${s(0.3)} ease ${s(0.18)}}
.${P}[data-state=checked] [data-part=bulb]{background:var(--pull-cord-light);box-shadow:0 0 .5em .15em color-mix(in oklab,var(--pull-cord-light) 70%,transparent)}
.${P} [data-part=halo]{opacity:0;background:radial-gradient(closest-side,color-mix(in oklab,var(--pull-cord-light) 55%,transparent),transparent);transition:opacity ${s(0.35)} ease ${s(0.18)}}
.${P}[data-state=checked] [data-part=halo]{opacity:1}
@keyframes ${P}-line-a{${lineFrames}}
@keyframes ${P}-line-b{${lineFrames}}
@keyframes ${P}-knob-a{${knobFrames}}
@keyframes ${P}-knob-b{${knobFrames}}
`;

const pullCordVariants = cva(
  cn(
    "relative inline-block h-[6.25em] w-[4.5em] shrink-0 cursor-pointer rounded-2xl select-none",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "text-[0.75rem]",
        md: "text-base",
        lg: "text-[1.5rem]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface PullCordProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof pullCordVariants> {
  /** Colour of the light, any CSS colour. Defaults to the warning token. */
  glow?: string;
}

/** A lamp switch: pull the cord to turn the light on or off. */
export function PullCord({
  className,
  size,
  glow,
  checked,
  defaultChecked = false,
  onCheckedChange,
  style,
  "aria-label": ariaLabel = "Lamp",
  ...props
}: PullCordProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const on = checked ?? uncontrolled;

  // Count the toggles, however they arrive (a click, a key, or a controlled
  // prop), so each one replays the pull and the first paint does not.
  const [shown, setShown] = useState(on);
  const [pulls, setPulls] = useState(0);
  if (shown !== on) {
    setShown(on);
    setPulls(pulls + 1);
  }

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="pull-cord"
        data-pull={pulls === 0 ? undefined : pulls % 2 ? "a" : "b"}
        aria-label={ariaLabel}
        checked={on}
        onCheckedChange={(next) => {
          if (checked === undefined) setUncontrolled(next);
          onCheckedChange?.(next);
        }}
        className={cn(P, pullCordVariants({ size }), className)}
        style={{
          ...(glow ? ({ "--pull-cord-glow": glow } as CSSProperties) : null),
          ...style,
        }}
        {...props}
      >
        <span aria-hidden="true" className="absolute inset-0">
          {/* The light the bulb throws, behind everything. */}
          <span data-part="halo" className="absolute start-0 top-[0.2em] size-[3.75em]" />
          {/* The shade: a dome. */}
          <span className="absolute start-[0.5em] top-[0.35em] h-[1.4em] w-[2.75em] rounded-t-full bg-muted-foreground/35 shadow-[inset_0_0.06em_0_var(--color-border)]" />
          {/* The bulb, just under the shade's rim. */}
          <span
            data-part="bulb"
            className="absolute start-[1.43em] top-[1.4em] size-[0.9em] rounded-full"
          />
          {/* The cord, hanging from the shade's far shoulder. */}
          <span className="absolute start-[3.1em] top-[0.75em] flex flex-col items-center">
            <span
              data-part="line"
              className="block w-[0.09em] rounded-full bg-foreground/70"
              style={{ height: `${String(CORD)}em` }}
            />
            <span
              data-part="knob"
              className="-mt-[0.1em] block h-[0.8em] w-[0.55em] rounded-full bg-foreground"
            />
          </span>
        </span>
      </SwitchPrimitive.Root>
    </>
  );
}

export { pullCordVariants };
