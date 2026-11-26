"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type PointerEvent,
} from "react";

import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pad to sign on with a pointer, a finger or a pen.
 *
 * Ink is drawn on a canvas as smoothed quadratic curves whose width follows
 * the pen's speed — fast strokes thin out, slow ones pool — so a signature
 * reads as handwriting rather than a polyline. Strokes are kept as points in
 * CSS pixels, not as pixels, so the drawing is redrawn crisply whenever the
 * pad is resized or moved to a screen with a different pixel ratio, and Undo
 * simply drops the last stroke and redraws.
 *
 * Drawing is a pointer-only act, so the pad offers a typed alternative: the
 * name is set in a script face on the same canvas and produces the same kind
 * of image. The result goes out as a PNG data URL through `onChange` and,
 * with `name`, a hidden input, so the pad drops into a plain form.
 */

interface Point {
  x: number;
  y: number;
  /** Stroke width arriving at this point, in CSS px. */
  w: number;
  t: number;
}

const signaturePadVariants = cva(
  cn(
    "relative w-full touch-none overflow-hidden rounded-lg border border-input bg-card text-foreground",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
  ),
  {
    variants: {
      size: {
        sm: "h-28",
        md: "h-40",
        lg: "h-56",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SignaturePadProps
  extends
    Omit<ComponentPropsWithRef<"div">, "onChange" | "defaultValue">,
    VariantProps<typeof signaturePadVariants> {
  /** Controlled signature, as an image URL (a PNG data URL); `null` clears it. */
  value?: string | null;
  /** A signature to start from, as an image URL. */
  defaultValue?: string | null;
  /** Called after each stroke, undo, clear or typed change with a PNG data URL, or `null` when empty. */
  onChange?: (dataUrl: string | null) => void;
  /** Submits the data URL under this name in a surrounding form. */
  name?: string;
  /** The pad's accessible name and visible caption. */
  label?: string;
  /** Hint drawn on the empty pad. */
  placeholder?: string;
  disabled?: boolean;
  /** Offer "Type instead", a keyboard way to sign. On by default. */
  allowTyped?: boolean;
  /** Thinnest stroke, in px, reached at speed. */
  minWidth?: number;
  /** Thickest stroke, in px, reached when the pen is slow. */
  maxWidth?: number;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** The script face for typed signatures, falling back to any cursive. */
const SCRIPT_FONT = '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive';

export function SignaturePad({
  className,
  size,
  value: valueProp,
  defaultValue = null,
  onChange,
  name,
  label = "Signature",
  placeholder = "Sign here",
  disabled = false,
  allowTyped = true,
  minWidth = 0.8,
  maxWidth = 3.2,
  ...props
}: SignaturePadProps) {
  const id = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const active = useRef<Point[] | null>(null);
  const base = useRef<HTMLImageElement | null>(null);
  const lastEmitted = useRef<string | null>(null);

  const [empty, setEmpty] = useState(true);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [output, setOutput] = useState<string | null>(valueProp ?? defaultValue);

  /** The canvas context scaled to CSS pixels, sized to the pad. */
  const context = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }, []);

  const ink = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? getComputedStyle(canvas).color : "currentColor";
  }, []);

  /** Draws one segment of a stroke: a curve from midpoint to midpoint. */
  const segment = useCallback((ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point) => {
    const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(b.x, b.y, m2.x, m2.y);
    ctx.lineWidth = (b.w + c.w) / 2;
    ctx.stroke();
  }, []);

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[]) => {
      const [first] = points;
      if (!first) return;
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(first.x, first.y, first.w / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[Math.max(0, i - 1)] ?? first;
        const b = points[i] ?? first;
        const c = points[i + 1] ?? b;
        segment(ctx, i === 0 ? b : a, b, c);
      }
    },
    [segment],
  );

  const typedText = typing ? typed.trim() : "";

  /** Redraws everything: base image, typed name or strokes. */
  const redraw = useCallback(() => {
    const surface = context();
    if (!surface) return;
    const { ctx, width, height } = surface;
    ctx.clearRect(0, 0, width, height);
    const colour = ink();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (typedText) {
      const fontSize = Math.min(height * 0.42, (width * 1.6) / Math.max(4, typedText.length));
      ctx.font = `${String(fontSize)}px ${SCRIPT_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(typedText, width / 2, height * 0.66, width * 0.9);
      return;
    }
    if (base.current?.complete) ctx.drawImage(base.current, 0, 0, width, height);
    for (const points of strokes.current) drawStroke(ctx, points);
  }, [context, ink, drawStroke, typedText]);

  /** Publishes the current drawing, or `null` when the pad is empty. */
  const emit = useCallback(() => {
    const hasInk = typedText !== "" || strokes.current.length > 0 || base.current !== null;
    setEmpty(!hasInk);
    let next: string | null = null;
    if (hasInk) {
      try {
        next = canvasRef.current?.toDataURL("image/png") ?? null;
      } catch {
        next = null;
      }
    }
    lastEmitted.current = next;
    setOutput(next);
    onChange?.(next);
  }, [onChange, typedText]);

  /** Loads an image URL as the pad's base layer; `null` clears it. */
  const loadBase = useCallback(
    (url: string | null) => {
      strokes.current = [];
      if (!url) {
        base.current = null;
        setEmpty(true);
        redraw();
        return;
      }
      const image = new Image();
      image.onload = () => redraw();
      image.src = url;
      base.current = image;
      setEmpty(false);
      redraw();
    },
    [redraw],
  );

  // The starting signature, once.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const initial = valueProp ?? defaultValue;
    lastEmitted.current = initial;
    loadBase(initial);
  }, [valueProp, defaultValue, loadBase]);

  // A controlled value that did not come from this pad replaces the drawing.
  useEffect(() => {
    if (valueProp === undefined || valueProp === lastEmitted.current) return;
    lastEmitted.current = valueProp;
    setOutput(valueProp);
    loadBase(valueProp);
  }, [valueProp, loadBase]);

  // Redraw crisply whenever the pad changes size or pixel ratio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function point(event: PointerEvent<HTMLCanvasElement>, previous?: Point): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const t = event.timeStamp;
    if (!previous) return { x, y, t, w: (minWidth + maxWidth) / 2 };
    const distance = Math.hypot(x - previous.x, y - previous.y);
    const speed = distance / Math.max(1, t - previous.t);
    // Fast strokes thin out; slow ones pool. Smoothed so width never jumps.
    const target = clamp(maxWidth - speed * (maxWidth - minWidth) * 0.9, minWidth, maxWidth);
    const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure * 2 : 1;
    return { x, y, t, w: previous.w * 0.65 + target * pressure * 0.35 };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || typing || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = [point(event)];
    strokes.current.push(active.current);
    redraw();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const stroke = active.current;
    if (!stroke) return;
    const previous = stroke[stroke.length - 1];
    const next = point(event, previous);
    if (previous && Math.hypot(next.x - previous.x, next.y - previous.y) < 1) return;
    stroke.push(next);
    const surface = context();
    if (!surface || stroke.length < 2) return;
    const { ctx } = surface;
    ctx.strokeStyle = ink();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const n = stroke.length;
    const a = stroke[Math.max(0, n - 3)];
    const b = stroke[n - 2];
    if (a && b) segment(ctx, n === 2 ? b : a, b, next);
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!active.current) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    redraw();
    emit();
  }

  function undo() {
    if (strokes.current.length > 0) strokes.current.pop();
    else base.current = null;
    redraw();
    emit();
  }

  function clear() {
    strokes.current = [];
    base.current = null;
    // Typed text clears through state; the effect below then redraws and emits.
    if (typing && typed !== "") setTyped("");
    else {
      redraw();
      emit();
    }
  }

  // Switching modes or typing redraws, then publishes what was drawn. Skipped
  // on mount, so a pad that has not been touched never reports a change.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    redraw();
    emit();
    // redraw and emit are rebuilt whenever typed changes, and onChange may be
    // a new function every render; typed and typing are what trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, typing]);

  const hint = `${id}-hint`;
  const captionId = `${id}-label`;
  const canUndo = !empty && !typing;

  return (
    <div
      data-slot="signature-pad-root"
      data-disabled={disabled ? "" : undefined}
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span id={captionId} className="text-sm font-medium">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {allowTyped ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-pressed={typing}
              data-slot="signature-pad-type-toggle"
              onClick={() => {
                strokes.current = [];
                base.current = null;
                setTyped("");
                setTyping((t) => !t);
              }}
            >
              {typing ? "Draw instead" : "Type instead"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !canUndo}
            data-slot="signature-pad-undo"
            onClick={undo}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || empty}
            data-slot="signature-pad-clear"
            onClick={clear}
          >
            Clear
          </Button>
        </div>
      </div>

      <div
        data-slot="signature-pad"
        data-disabled={disabled ? "" : undefined}
        data-empty={empty ? "" : undefined}
        className={signaturePadVariants({ size })}
      >
        <canvas
          ref={canvasRef}
          data-slot="signature-pad-canvas"
          role="img"
          aria-labelledby={captionId}
          aria-describedby={hint}
          className={cn(
            "absolute inset-0 size-full text-foreground",
            !disabled && !typing && "cursor-crosshair",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {/* Signing line and hint, behind the ink. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-[30%] border-b border-dashed border-border"
        />
        {empty && !typing ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[34%] text-center text-sm text-muted-foreground"
          >
            {placeholder}
          </span>
        ) : null}
      </div>

      {typing ? (
        <input
          type="text"
          data-slot="signature-pad-input"
          aria-label={`${label}, typed`}
          placeholder="Type your full name"
          autoComplete="name"
          disabled={disabled}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed",
            focusRing,
          )}
        />
      ) : null}

      <p id={hint} className="sr-only">
        {typing
          ? "Your typed name is drawn as the signature."
          : allowTyped
            ? "Draw with a mouse, finger or pen. To sign with the keyboard, choose Type instead."
            : "Draw with a mouse, finger or pen."}
      </p>
      <p className="sr-only" aria-live="polite">
        {empty ? "" : "Signed."}
      </p>
      {name ? <input type="hidden" name={name} value={output ?? ""} /> : null}
    </div>
  );
}

export { signaturePadVariants };
