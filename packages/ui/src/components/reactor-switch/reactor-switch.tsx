"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A switch drawn as an armoured power core. The reactor is the thumb: off, it
 * sits dark at the start of a red-plated track; on, it slides across, its
 * rotor turns, the ten cells light one after another around the ring, a gold
 * charge arc sweeps round it, and current crackles along the channel.
 *
 * Built on the Radix switch primitive: switch role, Space/Enter, hidden input
 * in forms. Motion is CSS and scales with --motion-scale; the crackle and the
 * core's pulse stop under reduced motion, where the cells simply light.
 *
 * `readout` adds a small "CHARGING 64%" line above the track that counts up as
 * the core charges. It is decoration (aria-hidden): the switch role already
 * announces the state.
 *
 * The plating has its own palette, as an illustration does. Each colour is a
 * custom property on the root (`--reactor-*`), so it can be re-tinted from a
 * class without touching this file.
 */

const P = "dowel-reactor";

const s = (seconds: number) => `calc(${String(seconds)}s * var(--motion-scale, 1))`;

const TRAVEL = 0.9;
const CELLS = 10;

const STYLES = `
.${P}{direction:ltr;
--reactor-metal-hi:#4a4e55;--reactor-metal:#25282c;--reactor-metal-lo:#0d0e10;--reactor-rivet:#8b9098;
--reactor-gold-hi:#ffe49a;--reactor-gold:#d9aa45;--reactor-gold-lo:#7c5a1a;
--reactor-plate-hi:#b0302a;--reactor-plate:#86201b;--reactor-plate-lo:#4f0e0b;--reactor-seam:#1c0504;
--reactor-channel:#0a0909;--reactor-grid:#2a2420;
--reactor-cell-off:#3e321d;--reactor-cell-on:#ffd65c;--reactor-core:#f4f1ea;--reactor-core-lo:#6c6a66;
--reactor-glow:#ffcf5a;--reactor-spark:#fff2bf;--reactor-readout:#d9a441}
.${P} [data-part=core]{transform:translate(104px,95px);transition:transform ${s(TRAVEL)} cubic-bezier(.7,0,.25,1)}
.${P}[data-state=checked] [data-part=core]{transform:translate(296px,95px)}
.${P} [data-part=rotor]{transform:rotate(0deg);transition:transform ${s(TRAVEL + 0.3)} cubic-bezier(.6,0,.2,1)}
.${P}[data-state=checked] [data-part=rotor]{transform:rotate(252deg)}
.${P} [data-part=cell]{fill:var(--reactor-cell-off);transition:fill ${s(0.18)} ease-out;transition-delay:0s}
.${P}[data-state=checked] [data-part=cell]{fill:var(--reactor-cell-on);transition-delay:calc(${s(0.35)} + var(--i) * ${s(0.06)})}
.${P} [data-part=halo]{opacity:0;transition:opacity ${s(0.5)} ease-out}
.${P}[data-state=checked] [data-part=halo]{opacity:1;transition-delay:${s(0.6)}}
.${P} [data-part=charge]{stroke-dashoffset:100;opacity:0;transition:stroke-dashoffset ${s(TRAVEL + 0.2)} cubic-bezier(.5,0,.3,1),opacity ${s(0.3)}}
.${P}[data-state=checked] [data-part=charge]{stroke-dashoffset:0;opacity:1;transition-delay:${s(0.15)},0s}
.${P} [data-part=ticks]{opacity:.18;transition:opacity ${s(0.4)}}
.${P}[data-state=checked] [data-part=ticks]{opacity:.7}
.${P} [data-part=core-light]{opacity:0;transition:opacity ${s(0.4)} ease-out}
.${P}[data-state=checked] [data-part=core-light]{opacity:1;transition-delay:${s(0.9)}}
.${P} [data-part=shutter]{transform-origin:200px 95px;transform:scaleY(1);transition:transform ${s(0.35)} cubic-bezier(.6,0,.3,1) ${s(0.25)}}
.${P}[data-state=checked] [data-part=shutter]{transform:scaleY(0);transition-delay:0s}
.${P} [data-part=arcs]{opacity:0;transition:opacity ${s(0.25)}}
.${P}[data-state=checked] [data-part=arcs]{opacity:1;transition-delay:${s(0.75)}}
.${P} [data-part=arc-a]{animation:${P}-zap ${s(0.24)} steps(1,end) infinite}
.${P} [data-part=arc-b]{animation:${P}-zap ${s(0.24)} steps(1,end) infinite reverse}
.${P} [data-part=spark]{animation:${P}-spark ${s(0.9)} ease-out infinite;animation-delay:var(--d)}
.${P}[data-state=checked] [data-part=core-light]{animation:${P}-pulse ${s(2.2)} ease-in-out infinite alternate}
.${P}[data-state=unchecked] [data-part=arcs],.${P}[data-state=unchecked] [data-part=spark]{animation-play-state:paused}
@keyframes ${P}-zap{0%{opacity:1}50%{opacity:0}}
@keyframes ${P}-spark{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y))}}
@keyframes ${P}-pulse{from{opacity:.75}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.${P} [data-part]{animation:none!important}}
`;

const reactorSwitchVariants = cva(
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

export interface ReactorSwitchProps
  extends
    Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">,
    VariantProps<typeof reactorSwitchVariants> {
  /** Show a "CHARGING 64%" line above the track that counts as the core charges. */
  readout?: boolean;
}

const fill = (name: string): CSSProperties => ({ fill: `var(--reactor-${name})` });
const stroke = (name: string): CSSProperties => ({ stroke: `var(--reactor-${name})` });
const stop = (name: string, opacity?: number): CSSProperties => ({
  stopColor: `var(--reactor-${name})`,
  stopOpacity: opacity,
});

/** A point `r` from the centre at `deg` clockwise from twelve o'clock. */
const xy = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [Number((r * Math.cos(a)).toFixed(2)), Number((r * Math.sin(a)).toFixed(2))];
};
const polar = (r: number, deg: number) => xy(r, deg).join(" ");

/** One cell of the ring: an annular wedge between two radii. */
function cellPath(index: number) {
  const span = 360 / CELLS;
  const gap = 6;
  const a0 = index * span + gap / 2;
  const a1 = (index + 1) * span - gap / 2;
  const [r0, r1] = [37, 55];
  return `M${polar(r1, a0)} A${String(r1)} ${String(r1)} 0 0 1 ${polar(r1, a1)} L${polar(r0, a1)} A${String(r0)} ${String(r0)} 0 0 0 ${polar(r0, a0)} Z`;
}

const CELL_PATHS = Array.from({ length: CELLS }, (_, i) => cellPath(i));

/** Bezel rivets, in degrees round the ring. */
const BEZEL_RIVETS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Tick marks round the charge arc. */
const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);

/** Plate columns across the track. */
const COLUMNS = [18, 78, 140, 200, 260, 322, 382];

/** Current along the channel: two jagged paths that alternate. */
const ARC_A =
  "M24 92 L44 90 L61 102 L74 86 L93 95 L113 92 L128 102 L148 104 L167 100 L181 92 L195 104 L213 86 L226 95";
const ARC_B =
  "M24 102 L44 102 L63 104 L78 90 L98 102 L112 88 L131 95 L145 88 L165 86 L183 102 L197 86 L217 88 L226 95";

/** Sparks thrown off the core: angle, distance, delay. */
const SPARKS = [
  [-60, 18, 0],
  [40, 22, 0.3],
  [150, 16, 0.55],
  [230, 20, 0.15],
  [300, 14, 0.7],
] as const;

function usePercent(on: boolean) {
  const [percent, setPercent] = useState(on ? 100 : 0);
  const value = useRef(percent);

  useEffect(() => {
    const target = on ? 100 : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = value.current;
    // Under reduced motion one frame lands it on the target.
    const duration = reduced ? 0 : on ? 1300 : 500;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      value.current = from + (target - from) * eased;
      setPercent(Math.round(value.current));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [on]);

  return percent;
}

export function ReactorSwitch({
  className,
  size,
  readout = false,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: ReactorSwitchProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const url = (name: string) => `url(#${id}-${name})`;
  const [uncontrolled, setUncontrolled] = useState(defaultChecked ?? false);
  const on = checked ?? uncontrolled;
  const percent = usePercent(on);

  const root = (
    <SwitchPrimitive.Root
      data-slot="reactor-switch"
      className={cn(P, reactorSwitchVariants({ size }), className)}
      checked={on}
      onCheckedChange={(next) => {
        setUncontrolled(next);
        onCheckedChange?.(next);
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
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop("metal-hi")} />
            <stop offset=".5" style={stop("metal")} />
            <stop offset="1" style={stop("metal-lo")} />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={stop("gold-hi")} />
            <stop offset=".45" style={stop("gold")} />
            <stop offset="1" style={stop("gold-lo")} />
          </linearGradient>
          <linearGradient id={`${id}-rail`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop("gold-hi")} />
            <stop offset="1" style={stop("gold-lo")} />
          </linearGradient>
          <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop("plate-hi")} />
            <stop offset=".6" style={stop("plate")} />
            <stop offset="1" style={stop("plate-lo")} />
          </linearGradient>
          <radialGradient id={`${id}-rivet`} cx=".35" cy=".35" r=".7">
            <stop offset="0" style={stop("rivet")} />
            <stop offset="1" style={stop("metal-lo")} />
          </radialGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset=".35" style={stop("glow", 0.55)} />
            <stop offset="1" style={stop("glow", 0)} />
          </radialGradient>
          <radialGradient id={`${id}-core`} cx=".4" cy=".35" r=".7">
            <stop offset="0" style={stop("core")} />
            <stop offset="1" style={stop("core-lo")} />
          </radialGradient>
          <radialGradient id={`${id}-core-light`}>
            <stop offset="0" style={stop("core")} />
            <stop offset=".4" style={stop("spark", 0.9)} />
            <stop offset="1" style={stop("glow", 0)} />
          </radialGradient>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop("core", 0.16)} />
            <stop offset=".5" style={stop("core", 0)} />
          </linearGradient>
          <clipPath id={`${id}-inside`}>
            <rect x="18" y="18" width="364" height="154" rx="77" />
          </clipPath>
        </defs>

        {/* Gunmetal housing, riveted. */}
        <rect x="2" y="2" width="396" height="186" rx="93" fill={url("metal")} />
        <rect
          x="3"
          y="3"
          width="394"
          height="184"
          rx="92"
          fill="none"
          strokeWidth="1.2"
          style={{ ...stroke("metal-hi"), strokeOpacity: 0.9 }}
        />
        {[
          [100, 10],
          [200, 10],
          [300, 10],
          [100, 180],
          [200, 180],
          [300, 180],
          [10, 95],
          [390, 95],
        ].map(([x, y]) => (
          <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r="3" fill={url("rivet")} />
        ))}
        <rect x="15" y="15" width="370" height="160" rx="80" fill={url("gold")} />

        <g clipPath={url("inside")}>
          <rect x="0" y="0" width="400" height="190" style={fill("seam")} />

          {/* Red plating, above and below the channel. */}
          {COLUMNS.slice(0, -1).map((x, i) => {
            const w = (COLUMNS[i + 1] ?? 382) - x;
            return (
              <g key={x}>
                <rect x={x + 1.5} y="17" width={w - 3} height="57" rx="2" fill={url("plate")} />
                <rect
                  x={x + 1.5}
                  y="116"
                  width={w - 3}
                  height="57"
                  rx="2"
                  fill={url("plate")}
                />
                <rect
                  x={x + 6}
                  y="23"
                  width={w - 12}
                  height="45"
                  rx="1.5"
                  fill="none"
                  strokeWidth="1"
                  style={{ ...stroke("seam"), strokeOpacity: 0.5 }}
                />
                <rect
                  x={x + 6}
                  y="122"
                  width={w - 12}
                  height="45"
                  rx="1.5"
                  fill="none"
                  strokeWidth="1"
                  style={{ ...stroke("seam"), strokeOpacity: 0.5 }}
                />
                <line
                  x1={x + 3}
                  y1="18.5"
                  x2={x + w - 3}
                  y2="18.5"
                  strokeWidth="1"
                  style={{ ...stroke("plate-hi"), strokeOpacity: 0.8 }}
                />
              </g>
            );
          })}

          {/* Gold rails and the dark channel between them. */}
          <rect x="0" y="74" width="400" height="6" fill={url("rail")} />
          <rect x="0" y="110" width="400" height="6" fill={url("rail")} />
          <rect x="0" y="80" width="400" height="30" style={fill("channel")} />
          <g strokeWidth=".8" style={stroke("grid")}>
            {Array.from({ length: 33 }, (_, i) => (
              <line key={i} x1={i * 12 + 6} y1="81" x2={i * 12 + 6} y2="109" />
            ))}
            <line x1="0" y1="95" x2="400" y2="95" />
          </g>

          {/* Off, the plates close over the channel and meet on a gold seam. */}
          <g data-part="shutter">
            <rect x="0" y="74" width="400" height="21" fill={url("plate")} />
            <rect x="0" y="95" width="400" height="21" fill={url("plate")} />
            <g strokeWidth="1.2" style={{ ...stroke("seam"), strokeOpacity: 0.7 }}>
              {COLUMNS.map((x) => (
                <line key={x} x1={x} y1="74" x2={x} y2="116" />
              ))}
            </g>
            <rect x="0" y="92.5" width="400" height="5" fill={url("rail")} />
          </g>

          {/* Current: a soft glow under two jagged strokes that alternate. */}
          <g data-part="arcs" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path
              d={ARC_A}
              strokeWidth="5"
              style={{ ...stroke("glow"), strokeOpacity: 0.25 }}
            />
            <path data-part="arc-a" d={ARC_A} strokeWidth="1.6" style={stroke("spark")} />
            <path data-part="arc-b" d={ARC_B} strokeWidth="1.6" style={stroke("spark")} />
          </g>

          <rect x="0" y="0" width="400" height="190" fill={url("sheen")} />
        </g>
        <rect
          x="18"
          y="18"
          width="364"
          height="154"
          rx="77"
          fill="none"
          strokeWidth="2"
          style={{ ...stroke("metal-lo"), strokeOpacity: 0.7 }}
        />

        {/* The reactor: the thumb. */}
        <g data-part="core">
          <circle data-part="halo" r="96" fill={url("halo")} />
          <g data-part="ticks" strokeWidth="1.2" style={stroke("gold-hi")}>
            {TICKS.map((deg) => {
              const [x1, y1] = xy(84, deg);
              const [x2, y2] = xy(deg % 45 === 0 ? 90 : 87, deg);
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
          <circle
            data-part="charge"
            r="79"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            transform="rotate(-90)"
            style={stroke("gold-hi")}
          />
          <circle r="73" cy="3" style={{ ...fill("metal-lo"), opacity: 0.6 }} />
          <circle r="71" fill={url("gold")} />
          <circle
            r="70"
            fill="none"
            strokeWidth="1"
            style={{ ...stroke("gold-hi"), strokeOpacity: 0.8 }}
          />
          {BEZEL_RIVETS.map((deg) => {
            const [x, y] = xy(65, deg);
            return <circle key={deg} cx={x} cy={y} r="2.4" fill={url("rivet")} />;
          })}
          <circle r="59" style={fill("metal-lo")} />
          <g data-part="rotor">
            {CELL_PATHS.map((d, i) => (
              <path key={d} data-part="cell" d={d} style={{ "--i": i } as CSSProperties} />
            ))}
            <circle
              r="33"
              strokeWidth="2.5"
              style={{ ...fill("metal-lo"), ...stroke("gold") }}
            />
            <path
              d={`M${polar(24, 0)} L${polar(24, 120)} L${polar(24, 240)} Z`}
              fill="none"
              strokeWidth="3.5"
              strokeLinejoin="round"
              style={stroke("gold-hi")}
            />
          </g>
          <circle r="11" fill={url("core")} />
          <circle data-part="core-light" r="22" fill={url("core-light")} />
          {SPARKS.map(([deg, dist, delay]) => {
            const [x, y] = xy(60, deg);
            const [dx, dy] = xy(dist, deg);
            return (
              <circle
                key={deg}
                data-part="spark"
                cx={x}
                cy={y}
                r="1.5"
                opacity="0"
                style={
                  {
                    ...fill("spark"),
                    "--d": `${String(delay)}s`,
                    "--x": `${String(dx)}px`,
                    "--y": `${String(dy)}px`,
                  } as CSSProperties
                }
              />
            );
          })}
        </g>
      </svg>
    </SwitchPrimitive.Root>
  );

  const label =
    percent === 0 ? "Offline" : percent === 100 ? "Online" : on ? "Charging" : "Power down";

  return (
    <>
      <style href={P} precedence="dowel">
        {STYLES}
      </style>
      {readout ? (
        <span
          data-slot="reactor-switch-group"
          className="inline-flex flex-col items-center gap-2"
        >
          <span
            aria-hidden="true"
            data-slot="reactor-switch-readout"
            className={cn(
              "font-mono text-xs tracking-[0.3em] uppercase tabular-nums transition-colors",
              on || percent === 0 ? "text-warning" : "text-destructive",
            )}
          >
            {label}&nbsp;&nbsp;{percent}%
          </span>
          {root}
        </span>
      ) : (
        root
      )}
    </>
  );
}

export { reactorSwitchVariants };
