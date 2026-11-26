"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";

import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/*
 * A live pulse monitor: an ECG trace that a write-head sweeps across, beside a
 * heart that beats on every R wave and the rate in beats per minute.
 *
 * The waveform is a sum of five Gaussians — P, Q, R, S and T — on a phase that
 * advances by dt / (60 / bpm), so changing `bpm` changes the rhythm on the
 * next frame without a jump. Each canvas column keeps the last value written
 * to it, the way a monitor's phosphor does; the trace is drawn in bands whose
 * opacity falls with their distance behind the head, with a short gap ahead of
 * it, so old signal fades out as new signal overwrites it.
 *
 * Colour comes from `currentColor`, which the `status` variant sets to a
 * semantic token, so it follows the theme. The loop stops while the monitor is
 * off screen or the tab is hidden. Under reduced motion there is no sweep and
 * no beat: a still trace of the current rhythm is drawn once.
 *
 * The rate is real text; changes are announced politely, at most once per
 * `announceEvery` ms, since a monitor that spoke on every beat would be noise.
 */

const heartRateVariants = cva(
  "inline-flex items-center gap-4 rounded-xl border bg-card px-4 py-3 text-card-foreground",
  {
    variants: {
      status: {
        normal: "[--heart-rate-tone:var(--color-success)]",
        warning: "[--heart-rate-tone:var(--color-warning)]",
        critical: "[--heart-rate-tone:var(--color-destructive)]",
      },
      size: {
        sm: "text-sm [--heart-rate-trace-h:2.5rem] [--heart-rate-trace-w:9rem]",
        md: "[--heart-rate-trace-h:3.5rem] [--heart-rate-trace-w:14rem]",
      },
    },
    defaultVariants: { status: "normal", size: "md" },
  },
);

const STATUS_TEXT = { normal: "", warning: "Elevated", critical: "Critical" } as const;

export interface HeartRateProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children">,
    VariantProps<typeof heartRateVariants> {
  /** Beats per minute. */
  bpm: number;
  /** What is being measured, used in the accessible name. Default "Heart rate". */
  label?: string;
  /** Text shown and read beside a warning or critical status. Defaults "Elevated" / "Critical". */
  statusLabel?: string;
  /** Minimum time between spoken updates, in ms. Default 5000. */
  announceEvery?: number;
  /** Seconds of signal across the trace. Default 3. */
  sweep?: number;
}

/** Height of the trace, -1..1, at a point in the beat (0..1). */
function ecg(phase: number): number {
  const wave = (centre: number, width: number, height: number) =>
    height * Math.exp(-(((phase - centre) / width) ** 2));
  return (
    wave(0.12, 0.035, 0.12) + // P
    wave(0.235, 0.008, -0.14) + // Q
    wave(0.255, 0.011, 1) + // R
    wave(0.28, 0.012, -0.3) + // S
    wave(0.5, 0.055, 0.28) // T
  );
}

const BANDS = 16;
const GAP = 0.04;

export function HeartRate({
  bpm,
  label = "Heart rate",
  statusLabel,
  announceEvery = 5000,
  sweep: seconds = 3,
  status,
  size,
  className,
  ref,
  ...props
}: HeartRateProps) {
  const reduced = useReducedMotion();
  const { ref: viewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "50px" });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heartRef = useRef<SVGSVGElement | null>(null);
  const bpmRef = useRef(bpm);
  const [announced, setAnnounced] = useState("");
  const lastSpoken = useRef({ at: 0, bpm });
  const rate = Math.max(1, Math.round(bpm));

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Speak a changed rate, throttled.
  useEffect(() => {
    const spoken = lastSpoken.current;
    if (rate === spoken.bpm) return;
    const wait = Math.max(0, spoken.at + announceEvery - Date.now());
    const timer = setTimeout(() => {
      lastSpoken.current = { at: Date.now(), bpm: rate };
      setAnnounced(`${label} ${String(rate)} beats per minute`);
    }, wait);
    return () => {
      clearTimeout(timer);
    };
  }, [rate, label, announceEvery]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let values = new Float32Array(0);
    let written = 0;
    let head = 0;
    let phase = 0;
    let frame = 0;
    let last = 0;
    let colour = "currentColor";
    let carry = 0;

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(canvas.clientWidth));
      height = Math.max(1, Math.round(canvas.clientHeight));
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      values = new Float32Array(width).fill(Number.NaN);
      written = 0;
      head = 0;
      colour = window.getComputedStyle(canvas).color || colour;
    };

    const y = (value: number) => height * (0.62 - value * 0.5);

    const draw = (fading: boolean) => {
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1.75;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.strokeStyle = colour;
      const gap = Math.ceil(width * GAP);
      const band = Math.ceil(width / BANDS);

      for (let b = 0; b < BANDS; b++) {
        // Band 0 is just behind the head; older bands are dimmer.
        const end = head - b * band;
        const start = end - band;
        context.globalAlpha = fading ? Math.max(0.08, 1 - b / BANDS) : 1;
        context.beginPath();
        let open = false;
        for (let i = start; i <= end; i++) {
          const x = ((i % width) + width) % width;
          const ahead = (x - head + width) % width;
          const value = values[x] ?? Number.NaN;
          if (
            Number.isNaN(value) ||
            (fading && ahead > 0 && ahead < gap) ||
            (open && x === 0)
          ) {
            open = false;
            continue;
          }
          if (open) context.lineTo(x, y(value));
          else context.moveTo(x, y(value));
          open = true;
        }
        context.stroke();
      }

      if (fading && written > 0) {
        context.globalAlpha = 1;
        context.fillStyle = colour;
        context.shadowColor = colour;
        context.shadowBlur = 8;
        context.beginPath();
        context.arc(head, y(values[head] ?? 0), 2.5, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
    };

    const beat = () => {
      const heart = heartRef.current;
      if (!heart || typeof heart.animate !== "function") return;
      heart.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }],
        { duration: 260, easing: "cubic-bezier(.3,.7,.4,1)" },
      );
    };

    resize();

    if (reduced) {
      // A still trace: the current rhythm across the full width.
      const period = 60 / Math.max(1, bpmRef.current);
      for (let x = 0; x < width; x++) {
        values[x] = ecg((((x / width) * seconds) / period) % 1);
      }
      head = width - 1;
      draw(false);
      return;
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      // Each column is a fixed slice of time, so the sweep keeps real time
      // whatever the frame rate; fractions of a column carry to the next frame.
      carry += (dt / seconds) * width;
      const steps = Math.floor(carry);
      carry -= steps;
      const period = 60 / Math.max(1, bpmRef.current);
      const perColumn = seconds / width / period;
      for (let s = 0; s < steps; s++) {
        const before = phase;
        phase = (phase + perColumn) % 1;
        if (before < 0.255 && phase >= 0.255) beat();
        head = (head + 1) % width;
        values[head] = ecg(phase);
        written++;
      }
      draw(true);
      frame = requestAnimationFrame(tick);
    };

    const running = () => inView && document.visibilityState !== "hidden";
    const start = () => {
      if (frame || !running()) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (running()) start();
      else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [reduced, inView, seconds, status]);

  const tone = status ?? "normal";
  const word = statusLabel ?? STATUS_TEXT[tone];

  return (
    <div
      ref={(node) => {
        viewRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="group"
      aria-label={label}
      data-slot="heart-rate"
      data-status={tone}
      className={cn(heartRateVariants({ status, size }), className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-slot="heart-rate-trace"
        className="block h-[var(--heart-rate-trace-h)] w-[var(--heart-rate-trace-w)] text-[var(--heart-rate-tone)]"
      />
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <svg
            ref={heartRef}
            aria-hidden="true"
            data-slot="heart-rate-heart"
            viewBox="0 0 24 24"
            className="size-4 fill-[var(--heart-rate-tone)]"
          >
            <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.2 1.7-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" />
          </svg>
          <span
            data-slot="heart-rate-value"
            className="text-2xl leading-none font-semibold tabular-nums"
          >
            {rate}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          bpm
          {word ? (
            <span className="ms-1.5 font-medium text-[var(--heart-rate-tone)]">· {word}</span>
          ) : null}
        </span>
      </div>
      <span role="status" className="sr-only">
        {announced}
      </span>
    </div>
  );
}

export { heartRateVariants };
