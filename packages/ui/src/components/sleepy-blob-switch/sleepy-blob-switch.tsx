"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch with a sleepy blob for a knob. Off, the blob is slumped at the
 * start of a lavender track, eyes shut, a "z" drifting up. On, it wakes, hops
 * across with a squash and a stretch, and lands round and smiling with pink
 * cheeks while the track warms to peach. Off again, it hops back and dozes.
 *
 * The blob is the thumb: its position is the state. Built on the Radix switch
 * primitive (switch role, Space/Enter, hidden input in forms). The hop only
 * plays after a toggle, every duration scales with --motion-scale, and the
 * breathing and the drifting "z" stop under reduced motion.
 *
 * The blob has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--sleepy-blob-*`), so it can be re-tinted from
 * a class without touching this file.
 */

const P = "dowel-sleepy-blob";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const TRAVEL = 0.7;

const STYLES = `
.${P}{direction:ltr;
--sleepy-blob-rim-hi:#ffffff;--sleepy-blob-rim:#f1e8fb;--sleepy-blob-rim-lo:#d7c6ec;
--sleepy-blob-track-off:#e3a9d2;--sleepy-blob-track-off-lo:#c98cc0;--sleepy-blob-track-on:#fbb58c;--sleepy-blob-track-on-lo:#ef9a72;
--sleepy-blob-body-hi:#ffffff;--sleepy-blob-body:#f7f2f6;--sleepy-blob-body-lo:#d9cfe0;
--sleepy-blob-ink:#2c2230;--sleepy-blob-mouth:#b2394f;--sleepy-blob-cheek:#ff8fa3;--sleepy-blob-z:#8a6aa6}
.${P} [data-part=track-on]{opacity:0;transition:opacity ${s(0.6)} ease-out}
.${P}[data-state=checked] [data-part=track-on]{opacity:1}
.${P} [data-part=blob]{transform:translate(122px,0);transition:transform ${s(TRAVEL)} cubic-bezier(.6,0,.3,1)}
.${P}[data-state=checked] [data-part=blob]{transform:translate(278px,0)}
.${P} [data-part=pose]{transform-origin:0 160px;transform:scale(1.1,.86);transition:transform ${s(0.4)} cubic-bezier(.34,1.5,.5,1)}
.${P}[data-state=checked] [data-part=pose]{transform:scale(1,1)}
.${P} [data-part=awake]{opacity:0;transition:opacity ${s(0.15)} ease-out}
.${P} [data-part=asleep]{opacity:1;transition:opacity ${s(0.15)} ease-out ${s(TRAVEL)}}
.${P}[data-state=checked] [data-part=awake]{opacity:1;transition-delay:${s(0.2)}}
.${P}[data-state=checked] [data-part=asleep]{opacity:0;transition-delay:0s}
.${P} [data-part=z]{opacity:0}
.${P}[data-state=unchecked] [data-part=z]{animation:${P}-z ${s(3)} ease-out infinite;animation-delay:var(--d)}
.${P}[data-state=unchecked] [data-part=breathe]{animation:${P}-breathe ${s(3)} ease-in-out infinite}
.${P}[data-state=checked] [data-part=breathe]{animation:${P}-bob ${s(2.2)} ease-in-out infinite}
.${P} [data-part=breathe]{transform-origin:0 160px}
.${P} [data-part=hop]{transform-origin:0 160px}
.${P}[data-moved][data-state=checked] [data-part=hop]{animation:${P}-hop-a ${s(TRAVEL)} ease-in-out both}
.${P}[data-moved][data-state=unchecked] [data-part=hop]{animation:${P}-hop-b ${s(TRAVEL)} ease-in-out both}
@keyframes ${P}-hop-a{0%{transform:translateY(0) scale(1,1)}12%{transform:translateY(0) scale(1.18,.78)}40%{transform:translateY(-22px) scale(.86,1.16)}62%{transform:translateY(-14px) scale(.95,1.05)}84%{transform:translateY(0) scale(1.16,.82)}100%{transform:translateY(0) scale(1,1)}}
@keyframes ${P}-hop-b{0%{transform:translateY(0) scale(1,1)}12%{transform:translateY(0) scale(1.14,.82)}40%{transform:translateY(-14px) scale(.9,1.1)}84%{transform:translateY(0) scale(1.1,.86)}100%{transform:translateY(0) scale(1,1)}}
@keyframes ${P}-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.025,.975)}}
@keyframes ${P}-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes ${P}-z{0%{opacity:0;transform:translate(0,0) scale(.6)}25%{opacity:.9}100%{opacity:0;transform:translate(18px,-34px) scale(1.15)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const sleepyBlobSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: { size: { sm: "w-36", md: "w-56", lg: "w-80" } },
    defaultVariants: { size: "md" },
  },
);

export interface SleepyBlobSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof sleepyBlobSwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--sleepy-blob-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--sleepy-blob-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--sleepy-blob-${name})`,
  stopOpacity: opacity,
});

/** The blob's outline: an egg, wider at the base, feet on y=160. */
const BODY =
  "M0 32 C 38 32, 60 78, 60 118 C 60 148, 34 160, 0 160 C -34 160, -60 148, -60 118 C -60 78, -38 32, 0 32 Z";

/** Floating sleep marks: x, y, size, delay (s). */
const ZEDS = [
  [44, 46, 16, 0],
  [56, 34, 12, 1.5],
] as const;

export function SleepyBlobSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: SleepyBlobSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="sleepy-blob-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, sleepyBlobSwitchVariants({ size }), className)}
        onCheckedChange={(checked) => {
          setMoved(true);
          onCheckedChange?.(checked);
        }}
        {...props}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 400 190"
          className="block size-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("rim-hi")} />
              <stop offset=".5" style={stop("rim")} />
              <stop offset="1" style={stop("rim-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-track-off`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("track-off-lo")} />
              <stop offset=".35" style={stop("track-off")} />
              <stop offset="1" style={stop("track-off")} />
            </linearGradient>
            <linearGradient id={`${id}-track-on`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("track-on-lo")} />
              <stop offset=".35" style={stop("track-on")} />
              <stop offset="1" style={stop("track-on")} />
            </linearGradient>
            <radialGradient id={`${id}-body`} cx=".38" cy=".3" r=".85">
              <stop offset="0" style={stop("body-hi")} />
              <stop offset=".6" style={stop("body")} />
              <stop offset="1" style={stop("body-lo")} />
            </radialGradient>
            <radialGradient id={`${id}-cheek`}>
              <stop offset="0" style={stop("cheek", 0.85)} />
              <stop offset="1" style={stop("cheek", 0)} />
            </radialGradient>
            <filter id={`${id}-drop`} x="-40%" y="-30%" width="180%" height="170%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity=".22" />
            </filter>
            <clipPath id={`${id}-inside`}>
              <rect x="24" y="24" width="352" height="142" rx="71" />
            </clipPath>
          </defs>

          {/* Thick pearly rim. */}
          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("rim")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="2"
            style={{ ...stroke("rim-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="21" y="21" width="358" height="148" rx="74" style={fill("rim-lo")} />

          <g clipPath={url("inside")}>
            <rect x="0" y="0" width="400" height="190" fill={url("track-off")} />
            <rect
              data-part="track-on"
              x="0"
              y="0"
              width="400"
              height="190"
              fill={url("track-on")}
            />
          </g>

          {/* The blob: the thumb. Feet on y=160 so it squashes onto the floor. */}
          <g data-part="blob">
            <g data-part="hop">
              <g data-part="pose">
                <g data-part="breathe">
                  <g filter={url("drop")}>
                    <path d={BODY} fill={url("body")} />
                  </g>
                  <ellipse
                    cx="-22"
                    cy="58"
                    rx="14"
                    ry="8"
                    transform="rotate(-30 -22 58)"
                    style={{ ...fill("body-hi"), opacity: 0.9 }}
                  />

                  {/* Asleep: one eye shut, one a dash, a small mouth. */}
                  <g data-part="asleep" fill="none" strokeLinecap="round" strokeWidth="3">
                    <path d="M-30 110 h14" style={stroke("ink")} />
                    <path d="M6 106 q8 8 16 0" style={stroke("ink")} />
                    <ellipse
                      cx="-2"
                      cy="124"
                      rx="3.5"
                      ry="2.6"
                      style={{ ...fill("mouth"), stroke: "none" }}
                    />
                  </g>

                  {/* Awake: dot eyes with a shine, cheeks, a smile. */}
                  <g data-part="awake">
                    <ellipse cx="-24" cy="104" rx="15" ry="9" fill={url("cheek")} />
                    <ellipse cx="24" cy="104" rx="15" ry="9" fill={url("cheek")} />
                    <ellipse cx="-17" cy="92" rx="6" ry="7.5" style={fill("ink")} />
                    <ellipse cx="17" cy="92" rx="6" ry="7.5" style={fill("ink")} />
                    <circle cx="-15" cy="89" r="2.1" style={fill("body-hi")} />
                    <circle cx="19" cy="89" r="2.1" style={fill("body-hi")} />
                    <path
                      d="M-9 110 q9 8 18 0"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      style={stroke("ink")}
                    />
                  </g>
                </g>
              </g>
            </g>
            {ZEDS.map(([x, y, size, delay]) => (
              <text
                key={x}
                data-part="z"
                x={x}
                y={y + 40}
                fontSize={size}
                fontWeight="700"
                fontFamily="ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"
                style={
                  {
                    ...fill("z"),
                    transformOrigin: `${String(x)}px ${String(y + 40)}px`,
                    "--d": `${String(delay)}s`,
                  } as CSSProperties
                }
              >
                z
              </text>
            ))}
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { sleepyBlobSwitchVariants };
