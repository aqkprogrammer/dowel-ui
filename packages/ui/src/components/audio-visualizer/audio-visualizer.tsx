"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, type ComponentPropsWithRef } from "react";

import { useDitherCanvas, type DitherDraw } from "@/components/dither-canvas";
import { cn } from "@/lib/utils";

/*
 * What a microphone is hearing, drawn live: bars, a wave, or a breathing orb.
 *
 * Feed it a MediaStream and it listens through a Web Audio analyser; or give
 * it `level` (0–1) from your own pipeline — a speech SDK's input level, a
 * server's VAD. Drawn through the dither engine (useDitherCanvas): DPR capped,
 * paused off-screen and in hidden tabs. It reports state, so like a loader it
 * keeps updating under reduced motion while there is input; with none it
 * rests. The analyser and its audio context close when the stream does or
 * the component goes.
 */

const audioVisualizerVariants = cva("relative block", {
  variants: {
    /** Bars across, a wave, or an orb that swells with the level. */
    variant: {
      bars: "h-10 w-40",
      wave: "h-10 w-40",
      orb: "size-16",
    },
  },
  defaultVariants: { variant: "bars" },
});

/** Averages `bins` into `count` bands, 0–1, writing into `out`. Loudness is perceived roughly logarithmically, so higher bands take wider slices. */
export function audioBands(
  bins: ArrayLike<number>,
  count: number,
  out: Float32Array,
): Float32Array {
  const usable = Math.floor(bins.length * 0.7);
  for (let band = 0; band < count; band += 1) {
    const from = Math.floor((band / count) ** 1.6 * usable);
    const to = Math.max(from + 1, Math.floor(((band + 1) / count) ** 1.6 * usable));
    let sum = 0;
    for (let i = from; i < to; i += 1) sum += bins[i] ?? 0;
    out[band] = Math.min(1, sum / (to - from) / 255);
  }
  return out;
}

interface Listener {
  context: AudioContext;
  analyser: AnalyserNode;
  data: Uint8Array<ArrayBuffer>;
}

export interface AudioVisualizerProps
  extends
    Omit<ComponentPropsWithRef<"div">, "color">,
    VariantProps<typeof audioVisualizerVariants> {
  /** A live audio stream to listen to — usually from getUserMedia. */
  stream?: MediaStream | null;
  /** A level from elsewhere, 0–1, when there is no stream. */
  level?: number;
  /** Bars, or points along the wave. Default 24. */
  bands?: number;
  /** Colour: a token or any CSS colour. Default "primary". */
  color?: string;
  /** Names it for screen readers; without one it is decoration. */
  label?: string;
}

/** Live audio levels from a stream or a value, as bars, a wave or an orb. */
export function AudioVisualizer({
  stream,
  level,
  bands = 24,
  color = "primary",
  label,
  variant,
  className,
  ...props
}: AudioVisualizerProps) {
  const look = variant ?? "bars";
  const listener = useRef<Listener | null>(null);
  const levels = useRef(new Float32Array(64));
  const smoothed = useRef(new Float32Array(64));
  const count = Math.max(3, Math.min(64, Math.round(bands)));

  // Listen to the stream while there is one.
  useEffect(() => {
    if (!stream || typeof window === "undefined") return;
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    listener.current = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    return () => {
      source.disconnect();
      listener.current = null;
      void context.close();
    };
  }, [stream]);

  const draw: DitherDraw = (ctx, frame) => {
    const { width, height } = frame;
    const live = listener.current;
    const target = levels.current;
    if (live) {
      live.analyser.getByteFrequencyData(live.data);
      audioBands(live.data, count, target);
    } else {
      const value = Math.min(1, Math.max(0, level ?? 0));
      for (let i = 0; i < count; i += 1) {
        // One level, shaped into a gentle hump so it still reads as voice.
        const centre = 1 - Math.abs(i / (count - 1) - 0.5) * 1.2;
        target[i] = value * Math.max(0.15, centre);
      }
    }
    const shown = smoothed.current;
    let moving = false;
    for (let i = 0; i < count; i += 1) {
      const next = frame.reducedMotion
        ? (target[i] ?? 0)
        : (shown[i] ?? 0) + ((target[i] ?? 0) - (shown[i] ?? 0)) * 0.35;
      if (Math.abs(next - (shown[i] ?? 0)) > 0.002) moving = true;
      shown[i] = next;
    }

    ctx.fillStyle = frame.color(color);
    ctx.strokeStyle = ctx.fillStyle;
    if (look === "orb") {
      let sum = 0;
      for (let i = 0; i < count; i += 1) sum += shown[i] ?? 0;
      const amount = sum / count;
      const base = Math.min(width, height) * 0.28;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, base * (1.35 + amount * 0.9), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, base * (1 + amount * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (look === "wave") {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const x = (i / (count - 1)) * width;
        const swing = (shown[i] ?? 0) * height * 0.45 * (i % 2 === 0 ? 1 : -1);
        if (i === 0) ctx.moveTo(x, height / 2 + swing);
        else ctx.lineTo(x, height / 2 + swing);
      }
      ctx.stroke();
    } else {
      const gap = Math.max(1, width / count / 3);
      const bar = Math.max(1, width / count - gap);
      for (let i = 0; i < count; i += 1) {
        const h = Math.max(2, (shown[i] ?? 0) * height);
        const x = i * (bar + gap) + gap / 2;
        ctx.beginPath();
        ctx.roundRect(x, (height - h) / 2, bar, h, bar / 2);
        ctx.fill();
      }
    }
    // While listening, keep going; otherwise only while easing to rest.
    return Boolean(live) || moving;
  };

  const { canvasRef } = useDitherCanvas(draw, { animate: false });

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-slot="audio-visualizer"
      data-variant={look}
      data-live={stream ? true : undefined}
      className={cn(audioVisualizerVariants({ variant: look }), className)}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
    </div>
  );
}

export { audioVisualizerVariants };
