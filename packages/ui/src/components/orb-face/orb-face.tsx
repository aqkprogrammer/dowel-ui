"use client";

// Ported from SmoothUI AI Orb Face (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { MotionConfig, motion, useSpring } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A little character rather than an indicator: status is carried by
 * expression. It squints while it thinks and glances away, widens its eyes
 * while it listens, talks while it speaks, grins and hops when it is done, and
 * goes spiral-eyed when it breaks — and keeps the spirals for as long as the
 * state lasts, because a broken assistant must not recover to a neutral face
 * on its own.
 *
 * `motion` is used for one thing only: the gaze, a spring that follows the
 * pointer continuously (ADR 0014). Blinks, hops, wobbles and the talking mouth
 * are CSS keyframes. Under reduced motion the gaze, blinking and saccades are
 * switched off and the global blanket stops the keyframes, leaving each state's
 * settled face — which still says everything the animation did.
 */

const PREFIX = "dowel-orb-face";

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const EYE_OFFSET = 16;
const EYE_Y = 44;
const EYE_WIDTH = 11;
const EYE_HEIGHT = 26;
const EYE_RADIUS = 5.5;
/** How far the pupils travel from centre, in viewBox units. */
const GAZE_RANGE = 5.5;
/** Pointer distance, in px, at which the gaze reaches full deflection. */
const GAZE_FALLOFF = 220;
const BLINK_MIN_MS = 3200;
const BLINK_EXTRA_MS = 2600;
const BLINK_MS = 230;
const DOUBLE_BLINK_CHANCE = 0.25;
/** Thinking saccades: the eyes look away and up, the way people search. */
const SACCADE_MIN_MS = 700;
const SACCADE_EXTRA_MS = 700;
const SACCADES = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -0.6, y: -0.4 },
  { x: 0.8, y: -0.9 },
] as const;
/** A ~1.25-turn swirl; spun in place it reads as dizzy. */
const SPIRAL = "M0 0C-0.6 -4 5 -5 6 -0.6C7 4.5 1 8 -4 6C-9 4.5 -9.5 -2 -6 -6";

function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const STYLES = `
.${PREFIX}{display:block;overflow:visible;flex-shrink:0}
.${PREFIX} [data-slot=orb-face-body]{transform-box:fill-box;transform-origin:center;scale:calc(1 + var(--face-amplitude, 0) * .07);translate:0 calc(var(--face-amplitude, 0) * -2px)}
.${PREFIX}[data-state=done] [data-slot=orb-face-body]{animation:${PREFIX}-hop ${scaled(850)} ${EASE_OUT} 1}
.${PREFIX}[data-state=error] [data-slot=orb-face-body]{animation:${PREFIX}-wobble ${scaled(1050)} cubic-bezier(0.45, 0, 0.55, 1) 1}
.${PREFIX} [data-part=eye]{transform-box:fill-box;transform-origin:center}
.${PREFIX} [data-blink=single] [data-part=eye]{animation:${PREFIX}-blink ${scaled(BLINK_MS)} linear 1}
.${PREFIX} [data-blink=double] [data-part=eye]{animation:${PREFIX}-blink ${scaled(BLINK_MS)} linear 2}
.${PREFIX} [data-part=arc]{stroke-dasharray:1;stroke-dashoffset:0;animation:${PREFIX}-draw ${scaled(320)} ${EASE_OUT} 1 backwards}
.${PREFIX} [data-part=spiral]{animation:${PREFIX}-spin ${scaled(2400)} linear infinite}
.${PREFIX} [data-part=spiral][data-side=left]{animation-direction:reverse}
.${PREFIX} [data-part=hmm]{animation:${PREFIX}-hmm ${scaled(2400)} ${EASE_OUT} infinite}
.${PREFIX} [data-part=talk]{transform-box:fill-box;transform-origin:center;animation:${PREFIX}-talk ${scaled(280)} ease-in-out infinite alternate}
@keyframes ${PREFIX}-blink{0%,100%{transform:scaleY(1)}30%{transform:scaleY(.08)}}
@keyframes ${PREFIX}-hop{0%{transform:translateY(0) scale(1,1)}12%{transform:translateY(3px) scale(1.08,.9)}40%{transform:translateY(-9px) scale(.94,1.08)}62%{transform:translateY(0) scale(1.04,.95)}82%{transform:translateY(-3px) scale(.99,1.02)}100%{transform:translateY(0) scale(1,1)}}
@keyframes ${PREFIX}-wobble{0%,100%{transform:translateX(0) rotate(0)}17%{transform:translateX(-5px) rotate(-11deg)}33%{transform:translateX(4px) rotate(9deg)}50%{transform:translateX(-3px) rotate(-7deg)}67%{transform:translateX(2px) rotate(5deg)}83%{transform:translateX(-1px) rotate(-3deg)}}
@keyframes ${PREFIX}-draw{from{stroke-dashoffset:1}}
@keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-hmm{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
@keyframes ${PREFIX}-talk{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
`;

export type OrbFaceState =
  "idle" | "listening" | "thinking" | "streaming" | "speaking" | "done" | "error";

/** How open the eyes rest in each state. Drives height; the blink owns scale. */
const EYE_OPENNESS: Partial<Record<OrbFaceState, number>> = {
  listening: 1.15,
  thinking: 0.62,
  streaming: 0.88,
  speaking: 0.92,
};

export interface OrbFaceColors {
  body?: string;
  bodyEdge?: string;
  /** Eyes and mouth. */
  feature?: string;
}

/** Features in primary-foreground on a primary body contrast in every theme. */
const DEFAULT_COLORS: Required<OrbFaceColors> = {
  body: "var(--color-primary)",
  bodyEdge: "color-mix(in oklab, var(--color-primary) 72%, var(--color-foreground))",
  feature: "var(--color-primary-foreground)",
};

export interface OrbFaceProps extends Omit<ComponentPropsWithRef<"svg">, "children" | "color"> {
  /** What the assistant is doing, told by expression. */
  state?: OrbFaceState;
  /**
   * Follow the pointer with its gaze. Turn it off in dense UI, where a dozen
   * faces tracking the cursor would be noise.
   */
  gaze?: boolean;
  /** Live audio level, 0–1: while listening, the body swells with the voice. */
  amplitude?: number;
  /** Rendered size. A number is pixels; a string is any CSS length. */
  size?: number | string;
  /** Any CSS colours — theme tokens by default. */
  colors?: OrbFaceColors;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Read live, not cached, so the face follows the setting as it changes. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Random blinking — occasionally a double — while the eyes are open. */
function useBlink(enabled: boolean) {
  const [blink, setBlink] = useState<"single" | "double" | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let schedule: ReturnType<typeof setTimeout>;
    let reset: ReturnType<typeof setTimeout>;
    const next = () => {
      schedule = setTimeout(
        () => {
          const double = Math.random() < DOUBLE_BLINK_CHANCE;
          setBlink(double ? "double" : "single");
          // Cleared by timer rather than animationend, so a blink can replay
          // and a stopped animation cannot strand the attribute.
          reset = setTimeout(() => setBlink(null), BLINK_MS * (double ? 2 : 1) + 50);
          next();
        },
        BLINK_MIN_MS + Math.random() * BLINK_EXTRA_MS,
      );
    };
    next();
    return () => {
      clearTimeout(schedule);
      clearTimeout(reset);
      setBlink(null);
    };
  }, [enabled]);
  return blink;
}

/** A cartoon orb whose gaze follows the pointer and whose face tells its state. */
export function OrbFace({
  className,
  state = "idle",
  gaze = true,
  amplitude,
  size = 128,
  colors,
  style,
  ref,
  ...props
}: OrbFaceProps) {
  const reduced = usePrefersReducedMotion();
  const palette = { ...DEFAULT_COLORS, ...colors };
  const gradientId = `${PREFIX}-${useId().replace(/:/g, "")}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gazeX = useSpring(0, { damping: 26, stiffness: 220 });
  const gazeY = useSpring(0, { damping: 26, stiffness: 220 });

  const happy = state === "done";
  const broken = state === "error";
  const thinking = state === "thinking";
  const eyesOpen = !happy && !broken;
  const blink = useBlink(eyesOpen && !reduced);
  const named = props["aria-label"] != null || props["aria-labelledby"] != null;

  // The gaze follows the pointer — except while thinking, when it looks away,
  // which is exactly what makes "thinking" legible without a graphic.
  const tracking = gaze && !reduced && !thinking && eyesOpen;
  useEffect(() => {
    if (!tracking) {
      if (!thinking) {
        gazeX.set(0);
        gazeY.set(0);
      }
      return;
    }
    const handle = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const reach = Math.min(1, Math.hypot(dx, dy) / GAZE_FALLOFF) * GAZE_RANGE;
      const angle = Math.atan2(dy, dx);
      gazeX.set(Math.cos(angle) * reach);
      gazeY.set(Math.sin(angle) * reach);
    };
    window.addEventListener("pointermove", handle);
    return () => window.removeEventListener("pointermove", handle);
  }, [tracking, thinking, gazeX, gazeY]);

  // Thinking saccades.
  useEffect(() => {
    if (!thinking) return;
    if (reduced) {
      gazeX.set(0);
      gazeY.set(0);
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    let index = 0;
    const next = () => {
      timeout = setTimeout(
        () => {
          const target = SACCADES[index % SACCADES.length] ?? SACCADES[0];
          index += 1;
          gazeX.set(target.x * GAZE_RANGE);
          gazeY.set(target.y * GAZE_RANGE);
          next();
        },
        SACCADE_MIN_MS + Math.random() * SACCADE_EXTRA_MS,
      );
    };
    next();
    return () => clearTimeout(timeout);
  }, [thinking, reduced, gazeX, gazeY]);

  const openness = EYE_OPENNESS[state] ?? 1;
  const resolvedSize = typeof size === "number" ? `${String(size)}px` : size;
  const level = state === "listening" && amplitude != null && !reduced ? amplitude : 0;

  function eye(side: -1 | 1) {
    const height = EYE_HEIGHT * openness;
    return (
      <rect
        key={side}
        data-part="eye"
        x={CENTER + side * EYE_OFFSET - EYE_WIDTH / 2}
        // Centred as it opens and closes, so a squint reads as lids meeting
        // rather than the eye sliding up the face.
        y={EYE_Y + (EYE_HEIGHT - height) / 2}
        width={EYE_WIDTH}
        height={height}
        rx={Math.min(EYE_RADIUS, height / 2)}
        fill={palette.feature}
      />
    );
  }

  function arc(side: -1 | 1) {
    const cx = CENTER + side * EYE_OFFSET;
    const y = EYE_Y + EYE_HEIGHT / 2;
    return (
      <path
        key={side}
        data-part="arc"
        pathLength={1}
        d={`M${String(cx - 8)} ${String(y + 3)} Q${String(cx)} ${String(y - 11)} ${String(cx + 8)} ${String(y + 3)}`}
        fill="none"
        stroke={palette.feature}
        strokeLinecap="round"
        strokeWidth={7}
        style={{ animationDelay: side === 1 ? scaled(60) : undefined }}
      />
    );
  }

  function spiral(side: -1 | 1) {
    return (
      <g
        key={side}
        transform={`translate(${String(CENTER + side * EYE_OFFSET)} ${String(EYE_Y + EYE_HEIGHT / 2)}) scale(1.5)`}
      >
        <path
          data-part="spiral"
          data-side={side === -1 ? "left" : "right"}
          d={SPIRAL}
          fill="none"
          stroke={palette.feature}
          strokeLinecap="round"
          strokeWidth={3}
        />
      </g>
    );
  }

  function mouth() {
    const line = { stroke: palette.feature, strokeLinecap: "round" as const, strokeWidth: 4 };
    if (happy) {
      return (
        <path
          data-part="arc"
          data-slot="orb-face-mouth"
          pathLength={1}
          d={`M${String(CENTER - 11)} 76 Q${String(CENTER)} 88 ${String(CENTER + 11)} 76`}
          fill="none"
          {...line}
          strokeWidth={5}
        />
      );
    }
    if (broken) {
      // A woozy wave, not a frown: it is confused, not scolding anyone.
      return (
        <path
          data-slot="orb-face-mouth"
          d={`M${String(CENTER - 12)} 79 q6 -7 12 0 t12 0`}
          fill="none"
          {...line}
        />
      );
    }
    if (state === "speaking") {
      return (
        <ellipse
          data-slot="orb-face-mouth"
          data-part="talk"
          cx={CENTER}
          cy={78}
          rx={6}
          ry={4.5}
          fill={palette.feature}
        />
      );
    }
    return (
      <line
        data-slot="orb-face-mouth"
        data-part={thinking ? "hmm" : undefined}
        // Off-centre while thinking: the universal "hmm".
        x1={thinking ? CENTER - 6 : CENTER - 7}
        x2={thinking ? CENTER + 8 : CENTER + 7}
        y1={78}
        y2={78}
        {...line}
      />
    );
  }

  function setRefs(node: SVGSVGElement | null) {
    svgRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  return (
    <MotionConfig reducedMotion="user">
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <svg
        ref={setRefs}
        viewBox={`0 0 ${String(VIEWBOX)} ${String(VIEWBOX)}`}
        data-slot="orb-face"
        data-state={state}
        role={named ? "img" : undefined}
        aria-hidden={named ? undefined : true}
        className={cn(PREFIX, className)}
        style={
          {
            width: resolvedSize,
            height: resolvedSize,
            "--face-amplitude": String(Math.min(1, Math.max(0, level))),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <defs>
          <radialGradient id={gradientId} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor={palette.body} />
            <stop offset="100%" stopColor={palette.bodyEdge} />
          </radialGradient>
        </defs>
        <g data-slot="orb-face-body">
          <circle cx={CENTER} cy={CENTER} r={48} fill={`url(#${gradientId})`} />
          {/* Screen-blended body colour always lightens, in any theme. One
              highlight is what makes it a body rather than a flat disc. */}
          <ellipse
            cx={CENTER - 14}
            cy={CENTER - 22}
            rx={13}
            ry={8}
            fill={palette.body}
            opacity={0.7}
            style={{ mixBlendMode: "screen" }}
          />
          {eyesOpen ? (
            <motion.g
              data-slot="orb-face-eyes"
              data-blink={blink ?? undefined}
              style={{ x: gazeX, y: gazeY }}
            >
              {eye(-1)}
              {eye(1)}
            </motion.g>
          ) : null}
          {happy ? [arc(-1), arc(1)] : null}
          {broken ? [spiral(-1), spiral(1)] : null}
          {mouth()}
        </g>
      </svg>
    </MotionConfig>
  );
}
