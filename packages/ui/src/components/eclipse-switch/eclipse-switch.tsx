"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as a solar eclipse. Off, a blazing sun hangs in a dusky sky
 * with a black moon just touching its edge. On, the moon slides across while
 * the sun drifts to meet it, and they lock at the far end in totality: the sky
 * darkens, the stars come out, and a pale corona rings the black disc, with a
 * brief diamond-ring flash at the moment of contact.
 *
 * The moon is the thumb: its position is the state. Built on the Radix switch
 * primitive, so it has the switch role, Space/Enter and a hidden input inside
 * forms. Every duration scales with --motion-scale; the flash only plays after
 * a toggle, and the twinkle and corona shimmer stop under reduced motion.
 *
 * The artwork has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--eclipse-*`), so it can be re-tinted from a
 * class without touching this file.
 */

const P = "dowel-eclipse";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const STYLES = `
.${P}{direction:ltr;
--eclipse-case-hi:#4a4e5a;--eclipse-case:#262932;--eclipse-case-lo:#0f1014;
--eclipse-sky-top:#141733;--eclipse-sky-mid:#38335e;--eclipse-sky-low:#7a5470;--eclipse-horizon:#e48a4a;
--eclipse-star:#ffffff;--eclipse-sun-core:#fffbe8;--eclipse-sun:#ffd46a;--eclipse-sun-edge:#ff9a2e;--eclipse-sun-rim:#e2611a;
--eclipse-moon:#020204;--eclipse-moon-hi:#1d1d26;--eclipse-corona:#fff4d6;--eclipse-night:#05060d}
.${P} [data-part=moon]{transform:translate(104px,95px);transition:transform ${s(0.85)} cubic-bezier(.65,0,.25,1)}
.${P}[data-state=checked] [data-part=moon]{transform:translate(296px,95px)}
.${P} [data-part=sun]{transform:translate(212px,95px);transition:transform ${s(0.85)} cubic-bezier(.45,0,.35,1)}
.${P}[data-state=checked] [data-part=sun]{transform:translate(296px,95px)}
.${P} [data-part=sun-glow]{opacity:1;transition:opacity ${s(0.5)} ease-out}
.${P}[data-state=checked] [data-part=sun-glow]{opacity:.15;transition-delay:${s(0.45)}}
.${P} [data-part=night]{opacity:0;transition:opacity ${s(0.7)} ease-out}
.${P}[data-state=checked] [data-part=night]{opacity:.62;transition-delay:${s(0.35)}}
.${P} [data-part=stars]{opacity:.35;transition:opacity ${s(0.7)}}
.${P}[data-state=checked] [data-part=stars]{opacity:1;transition-delay:${s(0.4)}}
.${P} [data-part=corona]{opacity:0;transform:scale(.92);transform-origin:296px 95px;transition:opacity ${s(0.3)},transform ${s(0.3)}}
.${P}[data-state=checked] [data-part=corona]{opacity:1;transform:scale(1);transition:opacity ${s(0.6)} ease-out ${s(0.8)},transform ${s(0.8)} cubic-bezier(.2,1.3,.5,1) ${s(0.8)}}
.${P}[data-state=checked] [data-part=corona-pulse]{transform-origin:296px 95px;animation:${P}-shimmer ${s(3)} ease-in-out infinite alternate}
.${P} [data-part=star]{animation:${P}-twinkle ${s(2.4)} ease-in-out infinite alternate;animation-delay:var(--d)}
.${P} [data-part=flash]{opacity:0;transform-origin:250px 52px}
.${P}[data-moved][data-state=checked] [data-part=flash]{animation:${P}-flash ${s(0.55)} ease-out ${s(0.72)} both}
@keyframes ${P}-shimmer{from{transform:scale(1) rotate(0deg);opacity:.85}to{transform:scale(1.04) rotate(8deg);opacity:1}}
@keyframes ${P}-twinkle{from{opacity:.25}to{opacity:1}}
@keyframes ${P}-flash{0%{opacity:0;transform:scale(.3)}30%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(.6)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const eclipseSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: {
        sm: "w-36",
        md: "w-56",
        lg: "w-80",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface EclipseSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof eclipseSwitchVariants> {}

const fill = (name: string): CSSProperties => ({ fill: `var(--eclipse-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--eclipse-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--eclipse-${name})`,
  stopOpacity: opacity,
});

/** Stars: x, y, radius, twinkle delay (s). */
const STARS = [
  [48, 62, 1, 0],
  [74, 40, 1.4, 0.6],
  [96, 76, 0.8, 1.2],
  [128, 34, 1.1, 0.3],
  [150, 58, 0.7, 1.8],
  [172, 30, 1.3, 0.9],
  [246, 34, 0.9, 1.5],
  [268, 52, 1.2, 0.2],
  [300, 28, 0.8, 1.1],
  [336, 44, 1.3, 0.7],
  [358, 70, 0.9, 1.6],
  [60, 104, 0.8, 0.4],
  [352, 108, 1, 1.3],
  [140, 92, 0.6, 2],
  [190, 48, 0.7, 0.5],
  [320, 78, 0.6, 1.9],
  [226, 24, 1, 0.8],
  [110, 120, 0.6, 1.4],
] as const;

/** Corona streamers, in degrees. */
const STREAMERS = [10, 55, 100, 150, 200, 250, 300, 340];

export function EclipseSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: EclipseSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="eclipse-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, eclipseSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-case`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("case-hi")} />
              <stop offset=".5" style={stop("case")} />
              <stop offset="1" style={stop("case-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("sky-top")} />
              <stop offset=".5" style={stop("sky-mid")} />
              <stop offset=".8" style={stop("sky-low")} />
              <stop offset="1" style={stop("horizon")} />
            </linearGradient>
            <radialGradient id={`${id}-horizon`} cx=".5" cy="1" r=".7">
              <stop offset="0" style={stop("horizon", 0.85)} />
              <stop offset="1" style={stop("horizon", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-sun`} cx=".42" cy=".42" r=".6">
              <stop offset="0" style={stop("sun-core")} />
              <stop offset=".35" style={stop("sun")} />
              <stop offset=".8" style={stop("sun-edge")} />
              <stop offset="1" style={stop("sun-rim")} />
            </radialGradient>
            <radialGradient id={`${id}-sun-glow`}>
              <stop offset=".45" style={stop("sun", 0.6)} />
              <stop offset="1" style={stop("sun-edge", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-moon`} cx=".35" cy=".3" r=".8">
              <stop offset="0" style={stop("moon-hi")} />
              <stop offset=".6" style={stop("moon")} />
            </radialGradient>
            <radialGradient id={`${id}-corona`}>
              <stop offset=".6" style={stop("corona", 0.95)} />
              <stop offset=".7" style={stop("corona", 0.45)} />
              <stop offset="1" style={stop("corona", 0)} />
            </radialGradient>
            <radialGradient id={`${id}-flash`}>
              <stop offset="0" style={stop("corona", 1)} />
              <stop offset="1" style={stop("corona", 0)} />
            </radialGradient>
            <clipPath id={`${id}-inside`}>
              <rect x="20" y="20" width="360" height="150" rx="75" />
            </clipPath>
          </defs>

          {/* Dark bezel. */}
          <rect x="2" y="2" width="396" height="186" rx="93" style={fill("case-lo")} />
          <rect x="3" y="3" width="394" height="184" rx="92" fill={url("case")} />
          <rect
            x="3.5"
            y="3.5"
            width="393"
            height="183"
            rx="91.5"
            fill="none"
            strokeWidth="1.2"
            style={{ ...stroke("case-hi"), strokeOpacity: 0.9 }}
          />
          <rect x="17" y="17" width="366" height="156" rx="78" style={fill("case-lo")} />

          <g clipPath={url("inside")}>
            <rect x="0" y="0" width="400" height="190" fill={url("sky")} />
            <rect x="0" y="90" width="400" height="90" fill={url("horizon")} />
            <g data-part="stars">
              {STARS.map(([x, y, r, d]) => (
                <circle
                  key={`${String(x)}-${String(y)}`}
                  data-part="star"
                  cx={x}
                  cy={y}
                  r={r}
                  style={{ ...fill("star"), ["--d" as string]: `${String(d)}s` }}
                />
              ))}
            </g>

            <g data-part="sun">
              <circle data-part="sun-glow" r="112" fill={url("sun-glow")} />
              <circle r="60" fill={url("sun")} />
            </g>

            <rect
              data-part="night"
              x="0"
              y="0"
              width="400"
              height="190"
              style={fill("night")}
            />

            <g data-part="corona">
              <g data-part="corona-pulse">
                <circle cx="296" cy="95" r="96" fill={url("corona")} opacity=".55" />
                <g strokeLinecap="round" style={{ ...stroke("corona"), strokeOpacity: 0.55 }}>
                  {STREAMERS.map((deg, i) => {
                    const a = ((deg - 90) * Math.PI) / 180;
                    const r1 = 64;
                    const r2 = i % 2 === 0 ? 92 : 80;
                    return (
                      <line
                        key={deg}
                        x1={296 + r1 * Math.cos(a)}
                        y1={95 + r1 * Math.sin(a)}
                        x2={296 + r2 * Math.cos(a)}
                        y2={95 + r2 * Math.sin(a)}
                        strokeWidth={i % 2 === 0 ? 2.4 : 1.6}
                      />
                    );
                  })}
                </g>
                <circle
                  cx="296"
                  cy="95"
                  r="63.5"
                  fill="none"
                  strokeWidth="3"
                  style={{ ...stroke("corona"), strokeOpacity: 0.95 }}
                />
              </g>
            </g>

            <g data-part="moon">
              <circle r="62" fill={url("moon")} />
              <circle
                r="61.5"
                fill="none"
                strokeWidth="1"
                style={{ ...stroke("moon-hi"), strokeOpacity: 0.9 }}
              />
            </g>

            <circle data-part="flash" cx="250" cy="52" r="16" fill={url("flash")} />
          </g>
          <rect
            x="20"
            y="20"
            width="360"
            height="150"
            rx="75"
            fill="none"
            strokeWidth="2"
            style={{ ...stroke("case-lo"), strokeOpacity: 0.6 }}
          />
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { eclipseSwitchVariants };
