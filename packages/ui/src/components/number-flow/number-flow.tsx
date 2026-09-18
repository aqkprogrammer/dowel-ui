"use client";

// Ported from SmoothUI Number Flow and Price Flow (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type TransitionEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A number whose digits roll to their next value (ADR 0014).
 *
 * Each digit is a vertical reel of three 0–9 bands, translated by a CSS
 * transition. It rests in the middle band; a change travels to the nearest
 * copy of the new digit in the direction the value moved (up for a rise, as in
 * the source: the old digit leaves upward and the new one arrives from below),
 * wrapping into the outer band when it has to — 9 → 0 on a rise keeps rolling
 * up. When the transition ends the reel snaps back to the middle band with
 * transitions off, so the next change has room either way.
 *
 * Only the active cell is opaque, so the outgoing digit fades as it leaves and
 * the incoming one fades in, as the source's slide-out/slide-in pair does.
 *
 * Formatting is Intl.NumberFormat's `formatToParts`. Digits are keyed by their
 * place (ones, tens, … and fraction positions), so 99 → 100 keeps the two
 * existing reels and adds a hundreds reel rather than shifting every digit.
 * New characters — a new leading digit, a minus sign, a changed compact
 * suffix — fade in from the direction of change through @starting-style.
 *
 * Everything is a transition on token durations, so the reduced-motion rule in
 * base.css makes every change a snap. This is decoration, never an indicator.
 */

const PREFIX = "dowel-number-flow";

const STYLES = `
[data-slot=number-flow-display][data-ready]>[data-slot=number-flow-token]{transition:opacity var(--duration-slow) var(--ease-out-quint),translate var(--duration-slow) var(--ease-out-quint)}
@starting-style{[data-slot=number-flow-display][data-ready]>[data-slot=number-flow-token]{opacity:0;translate:0 var(--${PREFIX}-enter,100%)}}
`;

/** Resting band: positions 10–19. Bands 0–9 and 20–29 absorb wrap-around. */
const BAND = 10;
const CELLS = Array.from({ length: BAND * 3 }, (_, index) => index);

/** The row of characters. The root itself stays a plain inline box. */
const numberFlowVariants = cva("inline-flex items-baseline whitespace-nowrap", {
  variants: {
    variant: {
      plain: "",
      tiles: "items-center gap-1",
    },
  },
  defaultVariants: { variant: "plain" },
});

/** One digit's window onto its reel. `tiles` is the source Number Flow's boxed counter. */
const numberFlowDigitVariants = cva("relative inline-flex justify-center overflow-hidden", {
  variants: {
    variant: {
      plain: "",
      tiles:
        "h-[2.667em] w-[2em] items-center rounded-lg border border-border bg-primary font-semibold text-primary-foreground",
    },
  },
  defaultVariants: { variant: "plain" },
});

export type NumberFlowElement = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** Which way the reels roll. `auto` follows the change in value. */
export type NumberFlowTrend = "auto" | "up" | "down";

export interface NumberFlowProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof numberFlowVariants> {
  /** The number to show. */
  value: number;
  /** Passed to Intl.NumberFormat. Defaults to the user's locale. */
  locales?: Intl.LocalesArgument;
  /**
   * Intl.NumberFormat options: `style: "currency" | "percent"`,
   * `notation: "compact"`, `signDisplay`, `minimumFractionDigits`, …
   */
  format?: Intl.NumberFormatOptions;
  /** Which way the reels roll. `auto` (default) rolls up on a rise, down on a fall. */
  trend?: NumberFlowTrend;
  /**
   * Milliseconds between one digit starting to roll and the next, from the
   * leading digit. Price Flow uses 50.
   */
  stagger?: number;
  /** The element rendered as the root. */
  as?: NumberFlowElement;
}

type Token =
  { kind: "digit"; key: string; digit: number } | { kind: "symbol"; key: string; text: string };

const formatters = new Map<string, { format: Intl.NumberFormat; glyphs: string[] }>();

/** A formatter and the ten digit glyphs of its numbering system, cached per options. */
function formatterFor(locales: Intl.LocalesArgument, options: Intl.NumberFormatOptions) {
  const id = JSON.stringify([locales, options]);
  let cached = formatters.get(id);
  if (!cached) {
    const format = new Intl.NumberFormat(locales, options);
    const { locale, numberingSystem } = format.resolvedOptions();
    const plain = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false });
    cached = { format, glyphs: CELLS.slice(0, BAND).map((digit) => plain.format(digit)) };
    formatters.set(id, cached);
  }
  return cached;
}

/** Splits a formatted number into keyed digits and symbols. */
function tokenize(parts: Intl.NumberFormatPart[], glyphs: string[]): Token[] {
  const integerDigits = parts
    .filter((part) => part.type === "integer")
    .reduce((count, part) => count + [...part.value].length, 0);

  let place = integerDigits;
  let fraction = 0;
  const seen = new Map<string, number>();
  const tokens: Token[] = [];

  for (const part of parts) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const char of part.value) {
        const key = part.type === "integer" ? `i${String(--place)}` : `f${String(fraction++)}`;
        const digit = glyphs.indexOf(char);
        tokens.push(
          digit === -1 ? { kind: "symbol", key, text: char } : { kind: "digit", key, digit },
        );
      }
    } else if (part.type === "group") {
      tokens.push({ kind: "symbol", key: `g${String(place)}`, text: part.value });
    } else {
      // Keyed by its text too: a changed symbol ($ → €, K → M) remounts and
      // fades in rather than swapping in place.
      const count = seen.get(part.type) ?? 0;
      seen.set(part.type, count + 1);
      tokens.push({
        kind: "symbol",
        key: `${part.type}${String(count)}:${part.value}`,
        text: part.value,
      });
    }
  }
  return tokens;
}

interface Reel {
  digit: number;
  position: number;
  snapping: boolean;
}

/** The reel position of `digit` nearest `from` in the direction of travel. */
function travel(from: number, digit: number, up: boolean): number {
  const copies = [digit, digit + BAND, digit + BAND * 2];
  if (up) return copies.find((position) => position > from) ?? digit + BAND * 2;
  return copies.reverse().find((position) => position < from) ?? digit;
}

interface DigitProps {
  digit: number;
  up: boolean;
  index: number;
  stagger: number;
  glyphs: string[];
  variant: NumberFlowProps["variant"];
}

function Digit({ digit, up, index, stagger, glyphs, variant }: DigitProps) {
  const [reel, setReel] = useState<Reel>({ digit, position: BAND + digit, snapping: false });

  // Derived during render, so the reel starts moving in the same commit as the
  // value changes rather than one frame later.
  if (reel.digit !== digit) {
    setReel({ digit, position: travel(reel.position, digit, up), snapping: false });
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLSpanElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    const rest = BAND + reel.digit;
    if (reel.position !== rest) setReel({ ...reel, position: rest, snapping: true });
  }

  const motion = reel.snapping
    ? "transition-none"
    : "duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]";

  return (
    <span
      data-slot="number-flow-digit"
      data-digit={digit}
      className={numberFlowDigitVariants({ variant })}
    >
      {/* Sizes the window: in-flow, invisible, one glyph wide and one line tall. */}
      <span className="invisible">{glyphs[digit]}</span>
      <span
        data-slot="number-flow-reel"
        data-position={reel.position}
        data-snapping={reel.snapping ? "" : undefined}
        onTransitionEnd={handleTransitionEnd}
        className={cn("absolute inset-0 transition-transform", motion)}
        style={{
          transform: `translateY(${String(-reel.position * 100)}%)`,
          transitionDelay: `calc(${String(index * stagger)}ms * var(--motion-scale, 1))`,
        }}
      >
        {CELLS.map((cell) => (
          <span
            key={cell}
            data-active={cell === reel.position ? "" : undefined}
            className={cn(
              "absolute inset-x-0 flex h-full items-center justify-center opacity-0 transition-opacity data-active:opacity-100",
              motion,
            )}
            style={{ top: `${String(cell * 100)}%`, transitionDelay: "inherit" }}
          >
            {glyphs[cell % BAND]}
          </span>
        ))}
      </span>
    </span>
  );
}

/** A number whose digits roll to each new value. */
export function NumberFlow({
  className,
  style,
  value,
  locales,
  format,
  trend = "auto",
  stagger = 0,
  variant = "plain",
  as = "span",
  ...props
}: NumberFlowProps) {
  // Every allowed element takes the same attributes as a span; only the ref's
  // element type differs, which TypeScript cannot reconcile across the union.
  const Root = as as "span";
  // Cached by content, so an inline `format` object costs nothing per render.
  const { format: formatter, glyphs } = formatterFor(locales, format ?? {});
  const text = formatter.format(value);
  const tokens = tokenize(formatter.formatToParts(value), glyphs);

  // Direction of the most recent change, derived during render.
  const [last, setLast] = useState({ value, up: true });
  if (last.value !== value) setLast({ value, up: value > last.value });
  const up = trend === "auto" ? last.up : trend === "up";

  // Characters present on first paint should not fade in; later ones should.
  // Marked on the DOM directly: it is a styling hook, not render state.
  const display = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    display.current?.setAttribute("data-ready", "");
  }, []);

  let digitIndex = 0;

  return (
    <Root
      data-slot="number-flow"
      data-variant={variant}
      data-trend={up ? "up" : "down"}
      aria-atomic={props["aria-live"] ? true : undefined}
      className={cn("inline-block tabular-nums", className)}
      style={{ [`--${PREFIX}-enter`]: up ? "100%" : "-100%", ...style } as CSSProperties}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {/* The settled value, once, for assistive technology. The reels below are
          hidden: read cell by cell they would be thirty digits per place. */}
      <span className="sr-only">{text}</span>
      {/* Left to right whatever the page direction: the tokens are flex items,
          and an RTL row would reverse the digits. */}
      <span
        ref={display}
        aria-hidden="true"
        dir="ltr"
        data-slot="number-flow-display"
        className={numberFlowVariants({ variant })}
      >
        {tokens.map((token) => (
          <span key={token.key} data-slot="number-flow-token" className="inline-flex">
            {token.kind === "digit" ? (
              <Digit
                digit={token.digit}
                up={up}
                index={digitIndex++}
                stagger={stagger}
                glyphs={glyphs}
                variant={variant}
              />
            ) : (
              <span className="whitespace-pre">{token.text}</span>
            )}
          </span>
        ))}
      </span>
    </Root>
  );
}

export type PriceFlowProps = NumberFlowProps;

/**
 * The source's Price Flow: two-digit minimum and a 50ms stagger from the
 * leading digit. Pass `format` for a currency; the stagger is kept.
 */
export function PriceFlow({ format, stagger = 50, ...props }: PriceFlowProps) {
  return (
    <NumberFlow format={format ?? { minimumIntegerDigits: 2 }} stagger={stagger} {...props} />
  );
}

export { numberFlowDigitVariants, numberFlowVariants };
