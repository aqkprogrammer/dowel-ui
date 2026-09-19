"use client";

// Ported from SmoothUI "Shader Reveal Transition" (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import {
  createShaderRenderer,
  easeRun,
  markWebGLUnavailable,
  motionScale,
  prefersReducedMotion,
  resolveRgb,
  supportsWebGL,
  type Rgb,
  type ShaderRenderer,
} from "./shader-transition-engine";
import {
  getShaderTransitionPreset,
  type ShaderTransitionPresetName,
} from "./shader-transition-presets";

/*
 * A frame-level transition between two states, both of them real DOM.
 *
 * State machine (data-state on the root): idle → running → done, and running
 * again whenever the shown state changes. While running:
 *
 * - shader mode: a canvas over the frame grows a cover in the surface colour
 *   over the outgoing state (data-phase="cover"), the states swap under the
 *   full cover at the midpoint (data-phase="reveal") and the cover recedes over
 *   the incoming state. One WebGL context per run, created when the run starts
 *   on a fresh canvas and released when it ends — an idle instance holds none.
 * - fade mode: no WebGL (or the context was lost mid-run) — a CSS cross-fade.
 * - reduced motion (OS setting or --motion-scale 0), or the frame off-screen:
 *   the states swap instantly.
 *
 * Throughout, the outgoing layer is aria-hidden and inert, so assistive
 * technology and the keyboard only ever meet the incoming state; if focus was
 * inside the outgoing layer it moves to the incoming one.
 */

export type ShaderTransitionStatus = "idle" | "running" | "done";

export interface ShaderTransitionProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The reveal pattern. Default "noise". */
  preset?: ShaderTransitionPresetName;
  /** Two-state API: shown while `active` is false. */
  from?: ReactNode;
  /** Two-state API: shown while `active` is true. */
  to?: ReactNode;
  /** Two-state API: which state is shown. Changing it runs the transition. */
  active?: boolean;
  /** Keyed API: changing the key runs the transition to the new children. */
  transitionKey?: string | number;
  children?: ReactNode;
  /** Run length in ms at --motion-scale 1. Defaults to the preset's. */
  duration?: number;
  /** Colour token of the cover — the surface behind the content. Default "background". */
  surface?: string;
  /** Colour token of the glow on the moving front. Default "primary". */
  accent?: string;
  /** Colour token the preset's sheen tints the cover with. Default: accent mixed into surface. */
  accentSecondary?: string;
  /** Called when a run starts. */
  onStart?: () => void;
  /** Called when the incoming state becomes visible (the midpoint, or at once without motion). */
  onSwap?: () => void;
  /** Called when a run settles, however it ran. */
  onRest?: () => void;
}

interface Slot {
  key: string;
  node: ReactNode;
}

interface MachineState {
  shown: Slot;
  leaving: Slot | null;
  status: ShaderTransitionStatus;
  phase: "cover" | "reveal";
  mode: "shader" | "fade";
  /** Increments per run; keys the run effect. */
  run: number;
}

const FADE_SHARE = 0.5;

const STYLES = `
@keyframes dowel-shader-transition-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes dowel-shader-transition-out { from { opacity: 1; } to { opacity: 0; } }
[data-slot="shader-transition"][data-mode="shader"][data-phase="cover"] > [data-slot="shader-transition-layer"][data-state="entering"] {
  opacity: 0;
  pointer-events: none;
}
[data-slot="shader-transition"][data-phase="reveal"] > [data-slot="shader-transition-layer"][data-state="leaving"] {
  visibility: hidden;
}
[data-slot="shader-transition"][data-mode="fade"] > [data-slot="shader-transition-layer"][data-state="leaving"] {
  animation: dowel-shader-transition-out var(--shader-transition-fade) var(--ease-in-out-quint) both;
  pointer-events: none;
}
[data-slot="shader-transition"][data-mode="fade"] > [data-slot="shader-transition-layer"][data-state="entering"] {
  animation: dowel-shader-transition-in var(--shader-transition-fade) var(--ease-in-out-quint) both;
}
`;

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function ShaderTransition({
  preset = "noise",
  from,
  to,
  active = false,
  transitionKey,
  children,
  duration,
  surface = "background",
  accent = "primary",
  accentSecondary,
  onStart,
  onSwap,
  onRest,
  className,
  style,
  ref,
  ...props
}: ShaderTransitionProps) {
  const pair = transitionKey === undefined && (from !== undefined || to !== undefined);
  const incoming: Slot = pair
    ? { key: active ? "to" : "from", node: active ? to : from }
    : { key: `key:${String(transitionKey ?? "")}`, node: children };

  const [state, setState] = useState<MachineState>(() => ({
    shown: incoming,
    leaving: null,
    status: "idle",
    phase: "cover",
    mode: "shader",
    run: 0,
  }));

  // Derive the machine from props during render (React's "adjust state on prop
  // change" pattern), so the outgoing state is never missing for a frame.
  if (incoming.key !== state.shown.key) {
    if (state.leaving && incoming.key === state.leaving.key) {
      // Back to where the run started: cancel it.
      setState({
        ...state,
        shown: incoming,
        leaving: null,
        status: "done",
        run: state.run + 1,
      });
    } else if (
      state.status === "running" &&
      state.mode === "shader" &&
      state.phase === "cover"
    ) {
      // Retarget under the cover: the same run carries on to the newer state.
      setState({ ...state, shown: incoming });
    } else {
      setState({
        shown: incoming,
        leaving: state.shown,
        status: "running",
        phase: "cover",
        mode: "shader",
        run: state.run + 1,
      });
    }
  } else if (incoming.node !== state.shown.node) {
    setState({ ...state, shown: incoming });
  }

  const rootRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const settledRun = useRef(0);
  const enteringRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useRef(true);
  const latest = useRef({
    preset,
    duration,
    surface,
    accent,
    accentSecondary,
    onStart,
    onSwap,
    onRest,
  });
  // A layout effect, declared before the run's, so a run starting in this
  // commit already sees this render's preset and callbacks.
  useLayoutEffect(() => {
    latest.current = {
      preset,
      duration,
      surface,
      accent,
      accentSecondary,
      onStart,
      onSwap,
      onRest,
    };
  });

  // Know whether the frame is visible, so a run nobody can see is skipped.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) onScreen.current = entry.isIntersecting;
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, []);

  const { run, status } = state;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const options = latest.current;
    if (!root) return;
    if (status !== "running") {
      // A run that ended in the render phase (a cancel) still settles.
      if (run > 0 && settledRun.current !== run) {
        settledRun.current = run;
        options.onSwap?.();
        options.onRest?.();
      }
      return;
    }

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let renderer: ShaderRenderer | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        renderer?.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    let swapped = false;
    let settled = false;
    let canvas: HTMLCanvasElement | null = null;

    const swap = () => {
      if (swapped) return;
      swapped = true;
      latest.current.onSwap?.();
    };

    const teardown = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (timer) clearTimeout(timer);
      timer = undefined;
      resizeObserver.disconnect();
      canvas?.removeEventListener("webglcontextlost", onLost);
      renderer?.destroy();
      renderer = null;
      canvas?.remove();
      canvas = null;
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      settledRun.current = run;
      teardown();
      swap();
      setState((current) =>
        current.run === run
          ? { ...current, leaving: null, status: "done", phase: "cover", mode: "shader" }
          : current,
      );
      latest.current.onRest?.();
    };

    const fade = (ms: number) => {
      teardown();
      setState((current) => (current.run === run ? { ...current, mode: "fade" } : current));
      swap();
      timer = setTimeout(finish, ms);
    };

    function onLost(event: Event) {
      // Let the browser restore the context; this run finishes as a fade and
      // the next run builds a fresh context on a fresh canvas.
      event.preventDefault();
      fade(remaining * FADE_SHARE);
    }

    options.onStart?.();

    // Keep keyboard focus out of the outgoing layer once it goes inert.
    const leavingLayer = root.querySelector(
      '[data-slot="shader-transition-layer"][data-state="leaving"]',
    );
    if (leavingLayer?.contains(document.activeElement)) {
      enteringRef.current?.focus({ preventScroll: true });
    }

    const scale = motionScale(root);
    const presetData = getShaderTransitionPreset(options.preset);
    const total = Math.max(0, (options.duration ?? presetData.duration) * scale);
    let remaining = total;

    if (prefersReducedMotion(root) || total <= 0 || !onScreen.current) {
      finish();
      return teardown;
    }

    // A fresh canvas per run (and per effect pass, so StrictMode's double
    // invocation never meets a context the first pass already released).
    const host = hostRef.current;
    if (host && supportsWebGL()) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-slot", "shader-transition-canvas");
      canvas.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(canvas);
      const surfaceRgb = resolveRgb(root, options.surface, [1, 1, 1]);
      const accentRgb = resolveRgb(root, options.accent);
      renderer = createShaderRenderer(canvas, presetData, {
        colors: {
          surface: surfaceRgb,
          accent: accentRgb,
          accentSecondary: options.accentSecondary
            ? resolveRgb(root, options.accentSecondary)
            : mix(surfaceRgb, accentRgb, 0.4),
        },
        flip: window.getComputedStyle(root).direction === "rtl",
      });
      if (!renderer && !canvas.getContext("webgl")) markWebGLUnavailable();
    }

    if (!renderer || !canvas) {
      fade(total * FADE_SHARE);
      return teardown;
    }

    const active = renderer;
    const box = root.getBoundingClientRect();
    active.resize(box.width, box.height);
    resizeObserver.observe(root);
    canvas.addEventListener("webglcontextlost", onLost);

    let elapsed = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      raf = 0;
      if (!onScreen.current) {
        finish();
        return;
      }
      // Deltas are clamped, so a hidden tab (no frames) resumes where it left off.
      const delta = last === null ? 0 : Math.min(now - last, 1000 / 15);
      last = now;
      elapsed += delta;
      remaining = Math.max(0, total - elapsed);
      const t = elapsed / total;
      let progress = easeRun(t);
      if (progress >= 0.5 && !swapped) {
        // Draw this frame fully covered; the states swap underneath it.
        progress = 0.5;
        swap();
        setState((current) =>
          current.run === run ? { ...current, phase: "reveal" } : current,
        );
      }
      active.draw(progress, elapsed / 1000);
      if (t >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      last = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      teardown();
    };
  }, [run, status]);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );

  const running = state.status === "running";
  const baseDuration = duration ?? getShaderTransitionPreset(preset).duration;
  const rootStyle = {
    "--shader-transition-fade": `calc(${String(Math.round(baseDuration * FADE_SHARE))}ms * var(--motion-scale, 1))`,
    ...style,
  } as CSSProperties;

  return (
    <>
      <style href="dowel-shader-transition" precedence="dowel">
        {STYLES}
      </style>
      <div
        data-slot="shader-transition"
        data-state={state.status}
        data-preset={preset}
        data-mode={running ? state.mode : undefined}
        data-phase={running && state.mode === "shader" ? state.phase : undefined}
        aria-busy={running || undefined}
        {...props}
        ref={setRootRef}
        style={rootStyle}
        className={cn("relative isolate grid overflow-hidden", className)}
      >
        {state.leaving ? (
          <div
            key={`layer-${state.leaving.key}`}
            data-slot="shader-transition-layer"
            data-state="leaving"
            aria-hidden="true"
            inert
            className="col-start-1 row-start-1 min-w-0"
          >
            {state.leaving.node}
          </div>
        ) : null}
        <div
          key={`layer-${state.shown.key}`}
          ref={enteringRef}
          data-slot="shader-transition-layer"
          data-state={running ? "entering" : "current"}
          tabIndex={running ? -1 : undefined}
          className="col-start-1 row-start-1 min-w-0 outline-none"
        >
          {state.shown.node}
        </div>
        {running && state.mode === "shader" ? (
          <div
            ref={hostRef}
            aria-hidden="true"
            data-slot="shader-transition-overlay"
            className="pointer-events-none absolute inset-0 z-10"
          />
        ) : null}
      </div>
    </>
  );
}
