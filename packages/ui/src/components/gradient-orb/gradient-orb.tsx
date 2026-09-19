// Ported from SmoothUI Siri Orb (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import type { ComponentPropsWithRef, CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * A mesh of rotating conic gradients, blurred and contrast-boosted into a
 * glowing orb, with a dot screen, a drifting specular sheen and a lit rim on
 * top.
 *
 * All of it is CSS. The rotation animates a registered custom property
 * (`@property`), so the gradients turn without the element turning — nothing
 * here needs JavaScript per frame, and the component renders on the server.
 *
 * It is decoration. It is aria-hidden unless named, carries no
 * data-motion="indicator", and under reduced motion the global blanket stops
 * every loop, leaving the settled first frame. An orb that is meant to report
 * that an assistant is busy should sit beside a text status, never replace one.
 */

const PREFIX = "dowel-gradient-orb";

/** A duration in milliseconds, scaled so reduced motion collapses it. */
function scaled(ms: number): string {
  return `calc(${ms.toFixed(0)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
@property --${PREFIX}-angle{syntax:"<angle>";inherits:false;initial-value:0deg}
.${PREFIX}{position:relative;display:inline-block;flex-shrink:0;width:var(--orb-size);height:var(--orb-size)}
.${PREFIX}[data-state=idle]{animation:${PREFIX}-breathe var(--orb-breathe) var(--ease-in-out-quint) infinite}
.${PREFIX}[data-state=error]{animation:${PREFIX}-shake var(--orb-shake) var(--ease-in-out-quint) 1}
.${PREFIX} [data-slot=gradient-orb-glow]{position:absolute;inset:-12%;border-radius:9999px;pointer-events:none;background:radial-gradient(circle at 50% 50%,var(--orb-c2) 0%,transparent 64%);filter:blur(calc(var(--orb-size) * .28));opacity:var(--orb-glow);transition:opacity var(--duration-slow) var(--ease-out-quint)}
.${PREFIX} [data-slot=gradient-orb-disc]{position:relative;display:grid;width:100%;height:100%;overflow:hidden;border-radius:9999px;isolation:isolate;filter:saturate(var(--orb-saturation)) hue-rotate(var(--orb-hue));scale:calc(var(--orb-scale) + var(--orb-amplitude) * var(--orb-reactivity) * .12);transition:scale var(--duration-slow) var(--ease-out-quint),filter var(--duration-slow) var(--ease-out-quint)}
.${PREFIX} [data-slot=gradient-orb-disc]::before,.${PREFIX} [data-slot=gradient-orb-disc]::after,.${PREFIX} [data-slot=gradient-orb-disc]>span{content:"";display:block;grid-area:1/1;width:100%;height:100%;border-radius:9999px}
.${PREFIX} [data-slot=gradient-orb-disc]::before{background:conic-gradient(from calc(var(--${PREFIX}-angle) * 2) at 25% 70%,var(--orb-c3),transparent 20% 80%,var(--orb-c3)),conic-gradient(from calc(var(--${PREFIX}-angle) * 2) at 45% 75%,var(--orb-c2),transparent 30% 60%,var(--orb-c2)),conic-gradient(from calc(var(--${PREFIX}-angle) * -3) at 80% 20%,var(--orb-c1),transparent 40% 60%,var(--orb-c1)),conic-gradient(from calc(var(--${PREFIX}-angle) * 1.5) at 60% 35%,var(--orb-c4),transparent 25% 75%,var(--orb-c4)),conic-gradient(from calc(var(--${PREFIX}-angle) * 2) at 15% 5%,var(--orb-c2),transparent 10% 90%,var(--orb-c2)),conic-gradient(from calc(var(--${PREFIX}-angle) * 1) at 20% 80%,var(--orb-c1),transparent 10% 90%,var(--orb-c1)),conic-gradient(from calc(var(--${PREFIX}-angle) * -2) at 85% 10%,var(--orb-c3),transparent 20% 80%,var(--orb-c3));box-shadow:inset var(--orb-bg) 0 0 var(--orb-shadow) calc(var(--orb-shadow) * .2);filter:blur(calc(var(--orb-blur) * (1 - var(--orb-amplitude) * var(--orb-reactivity) * .45))) contrast(var(--orb-contrast)) saturate(1.4);animation:${PREFIX}-rotate var(--orb-period) linear infinite}
.${PREFIX} [data-slot=gradient-orb-disc]::after{background-image:radial-gradient(circle at center,var(--orb-bg) var(--orb-dot),transparent var(--orb-dot));background-size:calc(var(--orb-dot) * 2) calc(var(--orb-dot) * 2);backdrop-filter:blur(calc(var(--orb-blur) * 2)) contrast(calc(var(--orb-contrast) * 2));mix-blend-mode:overlay;mask-image:radial-gradient(var(--orb-c1) var(--orb-mask),transparent 75%)}
.${PREFIX}[data-tiny] [data-slot=gradient-orb-disc]::after{mask-image:none}
.${PREFIX} [data-slot=gradient-orb-sheen]{background:radial-gradient(circle at 30% 24%,color-mix(in oklab,var(--orb-highlight) 32%,transparent),transparent 34%),radial-gradient(circle at 72% 80%,color-mix(in oklab,var(--orb-highlight) 7%,transparent),transparent 48%);mix-blend-mode:screen;animation:${PREFIX}-drift var(--orb-drift) var(--ease-in-out-quint) infinite alternate}
.${PREFIX} [data-slot=gradient-orb-rim]{pointer-events:none;box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--orb-highlight) 16%,transparent),inset 0 var(--orb-rim) calc(var(--orb-rim) * 2) color-mix(in oklab,var(--orb-highlight) 22%,transparent),inset 0 calc(var(--orb-rim) * -1.2) calc(var(--orb-rim) * 2.4) color-mix(in oklab,var(--color-overlay) 40%,transparent)}
@keyframes ${PREFIX}-rotate{to{--${PREFIX}-angle:360deg}}
@keyframes ${PREFIX}-drift{0%{transform:translate(-6%,-4%) scale(1.05)}100%{transform:translate(7%,6%) scale(1.12)}}
@keyframes ${PREFIX}-breathe{0%,100%{scale:1}50%{scale:1.035}}
@keyframes ${PREFIX}-shake{0%,100%{translate:0}33%{translate:-3px}66%{translate:3px}}
`;

export type GradientOrbState =
  "idle" | "listening" | "thinking" | "streaming" | "speaking" | "done" | "error";

interface StatePreset {
  /** Loop speed multiplier. */
  speed: number;
  /** Resting scale of the disc. Thinking stays at 1 so layout stays calm. */
  scale: number;
  saturation: number;
  /** Degrees of hue rotation, a mood shift rather than a new palette. */
  hue: number;
  /** Bloom opacity, 0–1. */
  glow: number;
  /** How much `amplitude` reaches the surface. */
  reactivity: number;
}

/** No state: plain decoration at its base tempo, with no bloom. */
const AMBIENT: StatePreset = {
  speed: 1,
  scale: 1,
  saturation: 1,
  hue: 0,
  glow: 0,
  reactivity: 0.6,
};

/** SmoothUI's shared AI state presets, as the orb reads them. */
const STATES: Record<GradientOrbState, StatePreset> = {
  idle: { speed: 0.6, scale: 0.94, saturation: 0.75, hue: 0, glow: 0.15, reactivity: 0 },
  listening: { speed: 1, scale: 1.06, saturation: 1.05, hue: 0, glow: 0.6, reactivity: 1 },
  thinking: { speed: 2.4, scale: 1, saturation: 1, hue: 18, glow: 0.35, reactivity: 0.15 },
  streaming: { speed: 1.4, scale: 1.02, saturation: 1, hue: -10, glow: 0.45, reactivity: 0.6 },
  speaking: { speed: 1.4, scale: 1.02, saturation: 1, hue: -10, glow: 0.45, reactivity: 0.6 },
  done: { speed: 0.8, scale: 1.1, saturation: 1, hue: 0, glow: 0.7, reactivity: 0 },
  // Error desaturates rather than growing: a state change, not an alarm.
  error: { speed: 1, scale: 0.96, saturation: 0.3, hue: 0, glow: 0.25, reactivity: 0 },
};

export interface GradientOrbColors {
  /** The field behind the mesh, and the dot screen over it. */
  bg?: string;
  c1?: string;
  c2?: string;
  c3?: string;
  /** Fourth mesh stop. More stops means fewer visible repeats per turn. */
  c4?: string;
  /** Specular sheen and the lit top edge. */
  highlight?: string;
}

/** Theme tokens, so the orb follows the palette and dark mode. */
const DEFAULT_COLORS: Required<GradientOrbColors> = {
  bg: "color-mix(in oklab, var(--color-primary) 12%, var(--color-background))",
  c1: "var(--color-primary)",
  c2: "var(--color-info)",
  c3: "color-mix(in oklab, var(--color-primary) 55%, var(--color-info))",
  c4: "color-mix(in oklab, var(--color-info) 60%, var(--color-success))",
  // Screen-blended, so any hue lightens: a light token would vanish in dark mode.
  highlight: "var(--color-info)",
};

type Geometry = Record<
  "--orb-blur" | "--orb-contrast" | "--orb-dot" | "--orb-shadow" | "--orb-mask" | "--orb-rim",
  string
> & { tiny: boolean };

/**
 * Size-dependent tuning. At 24px the large-orb blur and dot screen turn it to
 * mud, so small sizes get less of each — exact when `size` is a number.
 */
function geometry(size: number | string): Geometry {
  if (typeof size === "string") {
    return {
      "--orb-blur": "max(calc(var(--orb-size) * .015), 4px)",
      "--orb-contrast": "1.5",
      "--orb-dot": "max(calc(var(--orb-size) * .008), .1px)",
      "--orb-shadow": "max(calc(var(--orb-size) * .008), 2px)",
      "--orb-mask": "25%",
      "--orb-rim": "max(calc(var(--orb-size) * .06), 1.5px)",
      tiny: false,
    };
  }
  const small = size < 50;
  const contrast = small ? Math.max(size * 0.004, 1.2) : Math.max(size * 0.008, 1.5);
  const px = (value: number) => `${value.toFixed(2)}px`;
  return {
    "--orb-blur": px(small ? Math.max(size * 0.008, 1) : Math.max(size * 0.015, 4)),
    "--orb-contrast": (size < 30
      ? 1.1
      : small
        ? Math.max(contrast * 1.2, 1.3)
        : contrast
    ).toFixed(3),
    "--orb-dot": px(small ? Math.max(size * 0.004, 0.05) : Math.max(size * 0.008, 0.1)),
    "--orb-shadow": px(small ? Math.max(size * 0.004, 0.5) : Math.max(size * 0.008, 2)),
    "--orb-mask": size < 30 ? "0%" : small ? "5%" : size < 100 ? "15%" : "25%",
    "--orb-rim": px(Math.max(size * 0.06, 1.5)),
    tiny: size < 30,
  };
}

export interface GradientOrbProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Diameter. A number is pixels; a string is any CSS length. */
  size?: number | string;
  /**
   * Shared AI state: changes tempo, scale, saturation and bloom. Omit it for
   * plain decoration at the base tempo.
   */
  state?: GradientOrbState;
  /**
   * Live audio level, 0–1. Tightens the blur and swells the disc while the
   * state listens (`listening`, `streaming`, `speaking`, and — faintly —
   * `thinking`). For a 60fps signal, skip the re-render: set the
   * `--orb-amplitude` custom property on the element through its ref.
   */
  amplitude?: number;
  /** Seconds per rotation of the mesh at the base tempo. */
  duration?: number;
  /** Any CSS colours — tokens by default. */
  colors?: GradientOrbColors;
}

/** An animated gradient orb — the voice-assistant blob. Decorative. */
export function GradientOrb({
  className,
  size = 192,
  state,
  amplitude = 0,
  duration = 20,
  colors,
  style,
  ...props
}: GradientOrbProps) {
  const preset = state ? STATES[state] : AMBIENT;
  const palette = { ...DEFAULT_COLORS, ...colors };
  const { tiny, ...tuning } = geometry(size);
  const named = props["aria-label"] != null || props["aria-labelledby"] != null;

  const variables = {
    "--orb-size": typeof size === "number" ? `${String(size)}px` : size,
    "--orb-bg": palette.bg,
    "--orb-c1": palette.c1,
    "--orb-c2": palette.c2,
    "--orb-c3": palette.c3,
    "--orb-c4": palette.c4,
    "--orb-highlight": palette.highlight,
    "--orb-period": scaled((duration * 1000) / preset.speed),
    "--orb-drift": scaled((12 / (1 + preset.speed)) * 2 * 1000),
    "--orb-breathe": scaled(5500),
    "--orb-shake": scaled(180),
    "--orb-scale": String(preset.scale),
    "--orb-saturation": String(preset.saturation),
    "--orb-hue": `${String(preset.hue)}deg`,
    "--orb-glow": String(preset.glow),
    "--orb-reactivity": String(preset.reactivity),
    "--orb-amplitude": String(Math.min(1, Math.max(0, amplitude))),
    ...tuning,
  } as CSSProperties;

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="gradient-orb"
        data-state={state}
        data-tiny={tiny ? "" : undefined}
        role={named ? "img" : undefined}
        aria-hidden={named ? undefined : true}
        className={cn(PREFIX, className)}
        style={{ ...variables, ...style }}
        {...props}
      >
        <span data-slot="gradient-orb-glow" />
        <span data-slot="gradient-orb-disc">
          <span data-slot="gradient-orb-sheen" />
          <span data-slot="gradient-orb-rim" />
        </span>
      </div>
    </>
  );
}
