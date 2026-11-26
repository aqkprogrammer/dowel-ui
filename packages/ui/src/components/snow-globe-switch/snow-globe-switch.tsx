"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, useState, type ComponentPropsWithRef, type CSSProperties } from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as a pixel-art cottage under a glass globe. Off, it is day:
 * blue sky, sun, clouds. On, the globe rolls across the valley and the scene
 * turns to night: moon, stars, lit windows, and the frame darkens with it.
 *
 * The globe is the thumb. It magnifies whatever it passes over: inside it is a
 * second copy of the scene (a <use>), scaled up and slid the opposite way so
 * the lens stays registered with the valley beneath it.
 *
 * Day and night are one scene. Every colour is a custom property
 * (`--snow-globe-*`) that the checked state swaps, and fills transition, so the
 * valley fades to night as the globe travels. Opacities ride on custom
 * properties too, so the magnified copy follows. Built on the Radix switch
 * primitive (switch role, Space/Enter, hidden input in forms). Durations scale
 * with --motion-scale; the twinkle and the snow stop under reduced motion.
 */

const P = "dowel-snow-globe";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const ROLL = 1;
const EASE = "cubic-bezier(.65,0,.3,1)";
/** How much the glass magnifies. */
const ZOOM = 1.3;
const OFF_X = 96;
const ON_X = 304;
const CY = 95;

const STYLES = `
.${P}{direction:ltr;
--snow-globe-frame-hi:#fbf9f5;--snow-globe-frame:#e7e2da;--snow-globe-frame-lo:#c8c1b6;--snow-globe-lip:#b9b1a5;
--snow-globe-sky-top:#5f9de0;--snow-globe-sky-bottom:#b8d6f1;--snow-globe-mountain:#8d9fd8;--snow-globe-mountain-far:#a9b6e3;
--snow-globe-hill:#86b85c;--snow-globe-grass:#62a145;--snow-globe-grass-dark:#4c8636;--snow-globe-path:#d8c08a;
--snow-globe-wall:#f3e9d6;--snow-globe-wall-line:#d7c8a9;--snow-globe-roof:#34509e;--snow-globe-roof-hi:#4d6fc4;
--snow-globe-chimney:#a6552f;--snow-globe-window:#2f4a95;--snow-globe-door:#25407e;
--snow-globe-fence:#b07440;--snow-globe-trunk:#6e4428;--snow-globe-leaf:#3d8a3a;--snow-globe-leaf-hi:#66b04f;
--snow-globe-cloud:#ffffff;--snow-globe-sun:#ffd65e;--snow-globe-sun-hi:#fff1b0;--snow-globe-moon:#f6eec8;--snow-globe-moon-dark:#d9cf9f;
--snow-globe-star:#fff7d8;--snow-globe-skin:#e9b68e;--snow-globe-shirt:#ffffff;--snow-globe-pants:#283a6e;--snow-globe-flower:#ffd84a;
--snow-globe-glow:#ffb547;
--snow-globe-day:1;--snow-globe-night:0}
.${P}[data-state=checked]{
--snow-globe-frame-hi:#444855;--snow-globe-frame:#2c2f39;--snow-globe-frame-lo:#1b1d24;--snow-globe-lip:#14161b;
--snow-globe-sky-top:#191d4c;--snow-globe-sky-bottom:#40407d;--snow-globe-mountain:#2e3466;--snow-globe-mountain-far:#3a3f75;
--snow-globe-hill:#2b3658;--snow-globe-grass:#222e4e;--snow-globe-grass-dark:#1a2440;--snow-globe-path:#3d4466;
--snow-globe-wall:#5a6189;--snow-globe-wall-line:#4a5078;--snow-globe-roof:#2b3466;--snow-globe-roof-hi:#3a4580;
--snow-globe-chimney:#5d3c45;--snow-globe-window:#ffcf5a;--snow-globe-door:#1f2550;
--snow-globe-fence:#4e4b6a;--snow-globe-trunk:#3a3049;--snow-globe-leaf:#2a3d5c;--snow-globe-leaf-hi:#36506f;
--snow-globe-skin:#8f7a86;--snow-globe-shirt:#a6a9c6;--snow-globe-pants:#1a2348;--snow-globe-flower:#47517a;
--snow-globe-day:0;--snow-globe-night:1}
.${P} svg *{transition:fill ${s(ROLL)} ease-in-out,stop-color ${s(ROLL)} ease-in-out,opacity ${s(ROLL)} ease-in-out}
.${P} [data-part=globe]{transform:translate(${String(OFF_X)}px,${String(CY)}px);transition:transform ${s(ROLL)} ${EASE}}
.${P}[data-state=checked] [data-part=globe]{transform:translate(${String(ON_X)}px,${String(CY)}px)}
.${P} [data-part=lens]{transform:scale(${String(ZOOM)}) translate(-${String(OFF_X)}px,-${String(CY)}px);transition:transform ${s(ROLL)} ${EASE}}
.${P}[data-state=checked] [data-part=lens]{transform:scale(${String(ZOOM)}) translate(-${String(ON_X)}px,-${String(CY)}px)}
.${P} [data-part=globe-shadow]{transform:translate(${String(OFF_X)}px,152px);transition:transform ${s(ROLL)} ${EASE}}
.${P}[data-state=checked] [data-part=globe-shadow]{transform:translate(${String(ON_X)}px,152px)}
.${P} [data-part=star]{animation:${P}-twinkle ${s(1.6)} ease-in-out infinite alternate;animation-delay:var(--d)}
.${P} [data-part=flake]{animation:${P}-snow ${s(5)} linear infinite;animation-delay:var(--d)}
.${P}[data-moved] [data-part=flakes]{animation:${P}-shake ${s(ROLL)} ease-in-out}
.${P}[data-moved][data-state=checked] [data-part=flakes]{animation-name:${P}-shake-b}
@keyframes ${P}-twinkle{from{opacity:.35}to{opacity:1}}
@keyframes ${P}-snow{0%{transform:translate(0,-60px);opacity:0}10%{opacity:.9}90%{opacity:.9}100%{transform:translate(var(--x),58px);opacity:0}}
@keyframes ${P}-shake{0%,100%{transform:translate(0,0)}30%{transform:translate(10px,-8px)}65%{transform:translate(-6px,4px)}}
@keyframes ${P}-shake-b{0%,100%{transform:translate(0,0)}30%{transform:translate(-10px,-8px)}65%{transform:translate(6px,4px)}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const snowGlobeSwitchVariants = cva(
  cn(
    "relative inline-block shrink-0 overflow-hidden rounded-full select-none",
    "aspect-[400/190] cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-55",
    focusRing,
  ),
  {
    variants: {
      size: { sm: "w-36", md: "w-56", lg: "w-80" },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SnowGlobeSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof snowGlobeSwitchVariants> {}

const v = (name: string) => `var(--snow-globe-${name})`;
const fill = (name: string): CSSProperties => ({ fill: v(name) });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: v(name),
  stopOpacity: opacity,
});

/** A list of pixel rects, [x, y, w, h], all in one paint. */
function Px({
  rects,
  paint,
  style,
}: {
  rects: number[][];
  paint: string;
  style?: CSSProperties;
}) {
  return (
    <g style={{ ...fill(paint), ...style }}>
      {rects.map(([x, y, w, h]) => (
        <rect
          key={`${String(x)}-${String(y)}-${String(w)}-${String(h)}`}
          x={x}
          y={y}
          width={w}
          height={h}
        />
      ))}
    </g>
  );
}

/** A circle built from three overlapping rects, so it reads as pixels. */
const pixelDisc = (cx: number, cy: number, r: number) => [
  [cx - r, cy - r * 0.6, r * 2, r * 1.2],
  [cx - r * 0.6, cy - r, r * 1.2, r * 2],
  [cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7],
];

const STARS = [
  [140, 34, 0],
  [176, 52, 0.4],
  [214, 30, 0.9],
  [250, 46, 0.2],
  [292, 28, 0.7],
  [330, 50, 1.1],
  [356, 72, 0.5],
  [112, 62, 1.3],
  [196, 70, 0.8],
  [272, 66, 1.5],
] as const;

const FLAKES = [
  [-30, 0, 6],
  [-12, 1.2, -4],
  [4, 2.5, 8],
  [20, 0.6, -6],
  [34, 3.4, 4],
  [-22, 4.1, 5],
  [12, 1.8, -3],
] as const;

function Scene({ id }: { id: string }) {
  return (
    <g id={`${id}-scene`} shapeRendering="crispEdges">
      <rect x="0" y="0" width="400" height="190" fill={`url(#${id}-sky)`} />

      {/* Sun and clouds by day; moon and stars by night. */}
      <g style={{ opacity: v("day") }}>
        <Px rects={pixelDisc(344, 46, 15)} paint="sun" style={{ opacity: 0.35 }} />
        <Px rects={pixelDisc(344, 46, 11)} paint="sun" />
        <Px rects={[[338, 40, 6, 4]]} paint="sun-hi" />
        <Px
          rects={[
            [236, 56, 22, 6],
            [230, 60, 34, 6],
            [70, 44, 18, 4],
            [64, 48, 30, 4],
          ]}
          paint="cloud"
        />
      </g>
      <g style={{ opacity: v("night") }}>
        <Px rects={pixelDisc(70, 44, 13)} paint="glow" style={{ opacity: 0.18 }} />
        <Px rects={pixelDisc(70, 44, 10)} paint="moon" />
        <Px
          rects={[
            [64, 40, 4, 4],
            [72, 46, 4, 4],
            [66, 50, 3, 3],
          ]}
          paint="moon-dark"
        />
        {STARS.map(([x, y, d]) => (
          <rect
            key={`${String(x)}-${String(y)}`}
            data-part="star"
            x={x}
            y={y}
            width="2"
            height="2"
            style={{ ...fill("star"), ["--d" as string]: `${String(d)}s` }}
          />
        ))}
      </g>

      {/* Mountains, hills, grass. */}
      <path
        d="M0 116 H40 V108 H70 V100 H96 V106 H128 V96 H160 V104 H196 V94 H236 V102 H268 V92 H300 V100 H336 V94 H370 V104 H400 V190 H0 Z"
        style={fill("mountain-far")}
      />
      <path
        d="M0 124 H52 V118 H88 V112 H124 V118 H168 V110 H214 V116 H262 V108 H306 V114 H350 V110 H400 V190 H0 Z"
        style={fill("mountain")}
      />
      <path
        d="M0 138 H60 V134 H120 V130 H200 V132 H260 V128 H330 V132 H400 V190 H0 Z"
        style={fill("hill")}
      />
      <rect x="0" y="144" width="400" height="46" style={fill("grass")} />
      <Px
        rects={[
          [30, 150, 6, 2],
          [64, 156, 4, 2],
          [150, 152, 6, 2],
          [196, 160, 4, 2],
          [236, 150, 6, 2],
          [282, 158, 4, 2],
          [336, 152, 6, 2],
          [360, 162, 4, 2],
        ]}
        paint="grass-dark"
      />
      <Px
        rects={[
          [44, 152, 2, 2],
          [168, 158, 2, 2],
          [214, 154, 2, 2],
          [256, 162, 2, 2],
          [318, 150, 2, 2],
          [348, 158, 2, 2],
        ]}
        paint="flower"
      />
      <Px
        rects={[
          [80, 144, 12, 4],
          [86, 148, 40, 4],
          [120, 144, 46, 4],
        ]}
        paint="path"
      />

      {/* Cottage. */}
      <rect x="50" y="102" width="68" height="42" style={fill("wall")} />
      <Px
        rects={[
          [50, 110, 68, 1],
          [50, 118, 68, 1],
          [50, 126, 68, 1],
          [50, 134, 68, 1],
        ]}
        paint="wall-line"
      />
      <rect x="100" y="70" width="10" height="20" style={fill("chimney")} />
      <Px
        rects={[
          [42, 98, 84, 6],
          [48, 92, 72, 6],
          [56, 86, 56, 6],
          [64, 80, 40, 6],
          [72, 74, 24, 6],
        ]}
        paint="roof"
      />
      <Px
        rects={[
          [48, 98, 72, 2],
          [56, 92, 56, 2],
          [64, 86, 40, 2],
          [72, 80, 24, 2],
        ]}
        paint="roof-hi"
      />
      <Px
        rects={[
          [56, 112, 16, 14],
          [96, 112, 16, 14],
          [80, 86, 8, 8],
        ]}
        paint="roof"
      />
      <Px
        rects={[
          [58, 114, 5, 4],
          [65, 114, 5, 4],
          [58, 120, 5, 4],
          [65, 120, 5, 4],
          [98, 114, 5, 4],
          [105, 114, 5, 4],
          [98, 120, 5, 4],
          [105, 120, 5, 4],
          [82, 88, 4, 4],
        ]}
        paint="window"
      />
      <rect x="77" y="122" width="14" height="22" style={fill("door")} />
      <rect x="87" y="132" width="2" height="2" style={fill("window")} />

      {/* Fence, and someone sitting by it. */}
      <Px
        rects={[
          [168, 128, 4, 18],
          [184, 128, 4, 18],
          [200, 128, 4, 18],
          [216, 128, 4, 18],
          [232, 128, 4, 18],
          [248, 128, 4, 18],
          [168, 132, 84, 3],
          [168, 140, 84, 3],
        ]}
        paint="fence"
      />
      <rect x="230" y="116" width="6" height="6" style={fill("skin")} />
      <rect x="229" y="122" width="8" height="10" style={fill("shirt")} />
      <rect x="229" y="132" width="10" height="4" style={fill("pants")} />
      <rect x="236" y="136" width="4" height="10" style={fill("pants")} />

      {/* Tree. */}
      <rect x="304" y="114" width="8" height="32" style={fill("trunk")} />
      <Px
        rects={[
          [284, 100, 48, 18],
          [288, 92, 40, 8],
          [294, 84, 28, 8],
          [300, 78, 16, 6],
          [290, 118, 36, 4],
        ]}
        paint="leaf"
      />
      <Px
        rects={[
          [294, 88, 8, 4],
          [290, 98, 10, 4],
          [302, 104, 8, 4],
          [314, 94, 8, 4],
          [318, 108, 8, 4],
          [296, 112, 6, 2],
        ]}
        paint="leaf-hi"
      />
    </g>
  );
}

export function SnowGlobeSwitch({
  className,
  size,
  onCheckedChange,
  ...props
}: SnowGlobeSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [moved, setMoved] = useState(false);
  const url = (name: string) => `url(#${id}-${name})`;

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      <SwitchPrimitive.Root
        data-slot="snow-globe-switch"
        data-moved={moved ? "" : undefined}
        className={cn(P, snowGlobeSwitchVariants({ size }), className)}
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
            <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("frame-hi")} />
              <stop offset=".55" style={stop("frame")} />
              <stop offset="1" style={stop("frame-lo")} />
            </linearGradient>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={stop("sky-top")} />
              <stop offset=".7" style={stop("sky-bottom")} />
            </linearGradient>
            <radialGradient id={`${id}-glass`} cx=".5" cy=".5" r=".5">
              <stop offset=".6" style={stop("cloud", 0)} />
              <stop offset=".93" style={stop("cloud", 0.22)} />
              <stop offset="1" style={stop("cloud", 0.5)} />
            </radialGradient>
            <radialGradient id={`${id}-under`} cx=".5" cy=".5" r=".5">
              <stop offset="0" style={stop("glow", 0.55)} />
              <stop offset="1" style={stop("glow", 0)} />
            </radialGradient>
            <clipPath id={`${id}-inside`}>
              <rect x="18" y="18" width="364" height="154" rx="77" />
            </clipPath>
            <clipPath id={`${id}-lens`}>
              <circle r="57" />
            </clipPath>
          </defs>

          {/* Warm light spilling under the frame at night. */}
          <ellipse
            cx="200"
            cy="176"
            rx="170"
            ry="16"
            fill={url("under")}
            style={{ opacity: v("night") }}
          />

          <rect x="2" y="2" width="396" height="186" rx="93" fill={url("frame")} />
          <rect
            x="3"
            y="3"
            width="394"
            height="184"
            rx="92"
            fill="none"
            strokeWidth="1.5"
            style={{ stroke: v("frame-hi") }}
          />
          <rect x="15" y="15" width="370" height="160" rx="80" style={fill("lip")} />

          <g clipPath={url("inside")}>
            <Scene id={id} />
            <ellipse
              data-part="globe-shadow"
              rx="46"
              ry="4"
              style={{ fill: v("pants"), opacity: 0.35 }}
            />
          </g>

          {/* The globe: the thumb, magnifying the valley beneath it. */}
          <g data-part="globe">
            <g clipPath={url("lens")}>
              <use data-part="lens" href={`#${id}-scene`} />
              <g data-part="flakes">
                {FLAKES.map(([x, d, dx]) => (
                  <circle
                    key={`${String(x)}-${String(d)}`}
                    data-part="flake"
                    cx={x}
                    cy="0"
                    r="1.6"
                    opacity="0"
                    style={
                      {
                        ...fill("cloud"),
                        "--d": `${String(d)}s`,
                        "--x": `${String(dx)}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </g>
            </g>
            <circle r="57" fill={url("glass")} />
            <circle
              r="57"
              fill="none"
              strokeWidth="2.2"
              style={{ stroke: v("cloud"), strokeOpacity: 0.85 }}
            />
            <path
              d="M-44 -18 A 47 47 0 0 1 -14 -45"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ stroke: v("cloud"), strokeOpacity: 0.9 }}
            />
            <circle cx="-8" cy="-47" r="2.6" style={{ ...fill("cloud"), opacity: 0.9 }} />
            <path
              d="M20 46 A 50 50 0 0 0 46 22"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ stroke: v("cloud"), strokeOpacity: 0.55 }}
            />
          </g>
        </svg>
      </SwitchPrimitive.Root>
    </>
  );
}

export { snowGlobeSwitchVariants };
