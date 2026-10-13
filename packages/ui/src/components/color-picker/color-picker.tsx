"use client";

// Original design.
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Input } from "@/components/input";
import { Slider } from "@/components/slider";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  alphaGradient,
  areaBackground,
  COLOR_EXAMPLES,
  contrastLevel,
  contrastRatio,
  DEFAULT_COLOR,
  formatColor,
  HUE_GRADIENT,
  hsvaToRgba,
  parseColor,
  rgbaToHsva,
  type ColorFormat,
  type Hsva,
  type Rgba,
} from "./color-picker-math";

// Installed, this file is what `@/components/ui/color-picker` resolves to, so it
// exports everything the folder's index does.
export {
  alphaGradient,
  areaBackground,
  COLOR_EXAMPLES,
  contrastLevel,
  contrastRatio,
  DEFAULT_COLOR,
  formatColor,
  HUE_GRADIENT,
  hsvaToRgba,
  oklchToRgba,
  parseColor,
  relativeLuminance,
  rgbaToHsva,
  rgbaToOklch,
  type ColorFormat,
  type Hsva,
  type Rgba,
} from "./color-picker-math";

/*
 * A colour picker for a design tool or a theme setting: a saturation and
 * brightness square, a hue slider, an optional alpha slider, a text field that
 * takes hex, RGB or OKLCH notation, swatches, the browser's eyedropper where it has
 * one, and a live contrast reading against a colour you name.
 *
 * Editing happens in HSV, so the hue survives when a colour goes grey or black
 * and the square does not jump; `value` is written in `format` on every change.
 * Everything is operable by keyboard: the square is a slider whose arrows move
 * saturation (left/right) and brightness (up/down), Shift for steps of ten.
 */

/** Resolves a theme token or any CSS colour to RGB, through the browser. */
function resolveCssColor(element: Element, color: string): Rgba | undefined {
  const direct = parseColor(color);
  if (direct) return direct;
  const css = /^[a-z][a-z0-9-]*$/.test(color) ? `var(--color-${color})` : color;
  const probe = element.ownerDocument.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  element.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return parseColor(computed);
}

export interface ColorPickerProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange"
> {
  /** The colour, controlled, in any format the field accepts. */
  value?: string;
  /** The colour it starts on, uncontrolled. */
  defaultValue?: string;
  /** Called with the colour written in `format` whenever it changes. */
  onValueChange?: (value: string) => void;
  /** How `onValueChange` and the field write the colour. Default "hex". */
  format?: ColorFormat;
  /** Offer an alpha slider. Default false. */
  alpha?: boolean;
  /** Colours offered as one-click swatches. */
  swatches?: readonly string[];
  /**
   * A colour to measure contrast against — a background, usually. A theme
   * token ("background") or any CSS colour. Shows the WCAG ratio and level.
   */
  contrastWith?: string;
  /** Show the eyedropper button where the browser supports it. Default true. */
  eyeDropper?: boolean;
  /** Names the picker's controls, e.g. "Brand colour". Default "Colour". */
  label?: string;
  disabled?: boolean;
}

interface EyeDropperConstructor {
  new (): { open: () => Promise<{ sRGBHex: string }> };
}

function eyeDropperApi(): EyeDropperConstructor | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
    : undefined;
}

const noSubscription = () => () => {};
const hasEyeDropper = () => eyeDropperApi() !== undefined;
const serverHasNoEyeDropper = () => false;

/** Pick a colour from a square, sliders, a text field, swatches or the screen. */
export function ColorPicker({
  value: valueProp,
  defaultValue = DEFAULT_COLOR,
  onValueChange,
  format = "hex",
  alpha = false,
  swatches,
  contrastWith,
  eyeDropper = true,
  label = "Colour",
  disabled = false,
  className,
  ref,
  ...props
}: ColorPickerProps) {
  const id = useId();
  const [hsva, setHsva] = useState<Hsva>(() =>
    rgbaToHsva(parseColor(valueProp ?? defaultValue) ?? parseColor(DEFAULT_COLOR) ?? FALLBACK),
  );
  const rgba = hsvaToRgba(hsva);
  const written = formatColor(alpha ? rgba : { ...rgba, a: 1 }, format);

  // A controlled value from outside moves the picker — unless it is the
  // colour already showing, which would lose the hue of a grey. Adjusted
  // during render, as React recommends for state derived from a prop.
  const [seenValue, setSeenValue] = useState(valueProp);
  if (valueProp !== seenValue) {
    setSeenValue(valueProp);
    const parsed = valueProp === undefined ? undefined : parseColor(valueProp);
    if (parsed && !sameColor(parsed, { ...rgba, a: alpha ? rgba.a : 1 })) {
      setHsva(rgbaToHsva(parsed));
    }
  }

  const update = useCallback(
    (next: Hsva) => {
      if (disabled) return;
      setHsva(next);
      const nextRgba = hsvaToRgba(next);
      onValueChange?.(formatColor(alpha ? nextRgba : { ...nextRgba, a: 1 }, format));
    },
    [alpha, disabled, format, onValueChange],
  );

  // The text field edits a draft; it commits when it parses.
  const [draft, setDraft] = useState<string | null>(null);
  const draftInvalid = draft !== null && parseColor(draft) === undefined;
  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseColor(draft);
    if (parsed) update(rgbaToHsva(alpha ? parsed : { ...parsed, a: 1 }));
    setDraft(null);
  };

  // Contrast against a named colour, resolved through the page once it is
  // mounted, so a theme token works; before that only a literal colour can be.
  const [root, setRootState] = useState<HTMLDivElement | null>(null);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      setRootState(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const against = useMemo(() => {
    if (!contrastWith) return undefined;
    return root ? resolveCssColor(root, contrastWith) : parseColor(contrastWith);
  }, [contrastWith, root]);
  const ratio = against ? contrastRatio({ ...rgba, a: 1 }, against) : undefined;

  const dropperSupported =
    useSyncExternalStore(noSubscription, hasEyeDropper, serverHasNoEyeDropper) && eyeDropper;

  const pickFromScreen = async () => {
    const Api = eyeDropperApi();
    if (!Api) return;
    try {
      const { sRGBHex } = await new Api().open();
      const parsed = parseColor(sRGBHex);
      if (parsed) update({ ...rgbaToHsva(parsed), a: hsva.a });
    } catch {
      // Dismissed with Escape: nothing to do.
    }
  };

  return (
    <div
      ref={setRoot}
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-slot="color-picker"
      className={cn(
        "grid w-64 gap-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      <SaturationArea hsva={hsva} label={label} disabled={disabled} onChange={update} />

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          data-slot="color-picker-preview"
          className="size-8 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: written }}
        />
        <div className="grid flex-1 gap-2.5">
          <Slider
            aria-label={`${label} hue`}
            thumbValueTexts={[`${String(Math.round(hsva.h))} degrees`]}
            min={0}
            max={360}
            step={1}
            disabled={disabled}
            value={[Math.round(hsva.h)]}
            onValueChange={([h]) => {
              update({ ...hsva, h: h ?? 0 });
            }}
            className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-(image:--color-picker-hue)"
            style={{ "--color-picker-hue": HUE_GRADIENT } as CSSProperties}
          />
          {alpha ? (
            <Slider
              aria-label={`${label} opacity`}
              thumbValueTexts={[`${String(Math.round(hsva.a * 100))}%`]}
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              value={[Math.round(hsva.a * 100)]}
              onValueChange={([a]) => {
                update({ ...hsva, a: (a ?? 100) / 100 });
              }}
              className={cn(
                "[&_[data-slot=slider-range]]:bg-transparent",
                // A checkerboard of the theme's own two tones under the ramp.
                "[&_[data-slot=slider-track]]:bg-[image:var(--color-picker-alpha),repeating-conic-gradient(var(--color-muted)_0_25%,var(--color-background)_0_50%)] [&_[data-slot=slider-track]]:[background-size:auto,8px_8px]",
              )}
              style={{ "--color-picker-alpha": alphaGradient(rgba) } as CSSProperties}
            />
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-text`} className="sr-only">
          {label} value
        </label>
        <Input
          id={`${id}-text`}
          inputSize="sm"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={draftInvalid || undefined}
          aria-describedby={draftInvalid ? `${id}-error` : undefined}
          className="font-mono"
          value={draft ?? written}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
            if (event.key === "Escape") setDraft(null);
          }}
        />
        {dropperSupported ? (
          <button
            type="button"
            aria-label="Pick a colour from the screen"
            disabled={disabled}
            onClick={() => {
              void pickFromScreen();
            }}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M15 6l3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3z" />
            </svg>
          </button>
        ) : null}
      </div>
      {draftInvalid ? (
        <p id={`${id}-error`} className="-mt-1.5 text-xs text-destructive">
          Not a colour. Try {COLOR_EXAMPLES}.
        </p>
      ) : null}

      {swatches && swatches.length > 0 ? (
        <div
          role="group"
          aria-label={`${label} swatches`}
          data-slot="color-picker-swatches"
          className="flex flex-wrap gap-1.5"
        >
          {swatches.map((swatch) => {
            const parsed = parseColor(swatch);
            const selected = parsed !== undefined && sameColor(parsed, rgba);
            return (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={selected}
                disabled={disabled || parsed === undefined}
                onClick={() => {
                  if (parsed) update(rgbaToHsva(alpha ? parsed : { ...parsed, a: 1 }));
                }}
                className={cn(
                  "size-6 rounded-md border border-border",
                  selected && "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
                  focusRing,
                )}
                style={{ backgroundColor: swatch }}
              />
            );
          })}
        </div>
      ) : null}

      {ratio !== undefined ? (
        <ContrastReadout ratio={ratio} color={written} against={contrastWith ?? ""} />
      ) : null}
    </div>
  );
}

const FALLBACK: Rgba = { r: 91, g: 91, b: 214, a: 1 };

function sameColor(a: Rgba, b: Rgba): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 0.005;
}

function SaturationArea({
  hsva,
  label,
  disabled,
  onChange,
}: {
  hsva: Hsva;
  label: string;
  disabled: boolean;
  onChange: (next: Hsva) => void;
}) {
  const dragging = useRef<number | null>(null);

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const s = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const v = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height));
    onChange({ ...hsva, s, v });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowRight: [step, 0],
      ArrowLeft: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (event.key === "Home") {
      event.preventDefault();
      onChange({ ...hsva, s: 0 });
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      onChange({ ...hsva, s: 1 });
      return;
    }
    if (!move) return;
    event.preventDefault();
    onChange({
      ...hsva,
      s: Math.min(1, Math.max(0, hsva.s + move[0])),
      v: Math.min(1, Math.max(0, hsva.v + move[1])),
    });
  };

  const saturation = Math.round(hsva.s * 100);
  const brightness = Math.round(hsva.v * 100);

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${label} saturation and brightness`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={saturation}
      aria-valuetext={`Saturation ${String(saturation)}%, brightness ${String(brightness)}%`}
      aria-disabled={disabled || undefined}
      data-slot="color-picker-area"
      className={cn("relative h-36 cursor-crosshair touch-none rounded-lg", focusRing)}
      style={{ backgroundImage: areaBackground(hsva.h) }}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current === event.pointerId) fromPointer(event);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
    >
      <span
        aria-hidden="true"
        data-slot="color-picker-area-thumb"
        className="pointer-events-none absolute size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-background shadow-[0_0_0_1px_var(--color-foreground)]"
        style={{ left: `${String(hsva.s * 100)}%`, bottom: `${String(hsva.v * 100)}%` }}
      />
    </div>
  );
}

function ContrastReadout({
  ratio,
  color,
  against,
}: {
  ratio: number;
  color: string;
  against: string;
}) {
  const level = contrastLevel(ratio);
  const background = /^[a-z][a-z0-9-]*$/.test(against) ? `var(--color-${against})` : against;
  return (
    <div
      data-slot="color-picker-contrast"
      className="flex items-center gap-3 rounded-lg border border-border p-2"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-sm font-semibold"
        style={{ backgroundColor: background, color }}
      >
        Aa
      </span>
      <p className="text-xs text-muted-foreground">
        <span className="font-mono text-foreground tabular-nums">{ratio.toFixed(2)}:1</span>{" "}
        against {against} ·{" "}
        <span
          className={cn(
            "font-medium",
            level === "fail" ? "text-destructive" : "text-foreground",
          )}
        >
          {level === "fail"
            ? "Fails AA"
            : level === "AA large"
              ? "AA for large text"
              : `Passes ${level}`}
        </span>
      </p>
    </div>
  );
}
