"use client";

// Ported from SmoothUI Number Flow and Price Flow (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from "react";

import { cn } from "@/lib/utils";

/*
 * A number whose digits roll to their next value (ADR 0014).
 *
 * Each digit is a vertical reel of cells, translated by a CSS transition. A
 * change travels to the nearest cell showing the new digit in the direction
 * the value moved (up for a rise, as in the source: the old digit leaves
 * upward and the new one arrives from below), so 9 → 0 on a rise keeps
 * rolling up. Positions are unbounded — the reel renders a window of cells
 * around wherever it is heading — so a value that changes faster than a roll
 * can finish keeps spinning the same way instead of running out of reel and
 * lurching back. A CSS transition retargeted mid-flight starts from where the
 * reel is on screen, so rapid updates read as one continuous spin. When a roll
 * does finish, the reel snaps home to the middle band with transitions off.
 *
 * Only the active cell is opaque, so the outgoing digit fades as it leaves and
 * the incoming one fades in, as the source's slide-out/slide-in pair does. The
 * window each reel shows through bleeds a little above and below the line and
 * is masked with a gradient, so a digit fades out at the edge instead of being
 * sliced off by it. (The masked edge was inspired by the Rare UI Animated
 * counter pattern; no code referenced.)
 *
 * Formatting is Intl.NumberFormat's `formatToParts`. Digits are keyed by their
 * place (ones, tens, … and fraction positions), so 99 → 100 keeps the two
 * existing reels and adds a hundreds reel rather than shifting every digit.
 * Every character is a one-column grid whose track animates between 0fr and
 * 1fr, so the number's width follows its content: a gained place slides in
 * from the direction of change as it opens its column (@starting-style), a lost
 * place fades out as its column closes, and the separators glide along with
 * them. A lost place is kept, frozen on its last glyph, until its fade ends.
 *
 * Everything is a transition on token durations, so the reduced-motion rule in
 * base.css makes every change a snap. This is decoration, never an indicator.
 */

const PREFIX = "dowel-number-flow";
const DURATION = `var(--${PREFIX}-duration,var(--duration-slow))`;
const DISPLAY = `[data-slot=number-flow-display][data-ready]`;
const EASE = `${DURATION} var(--ease-out-quint)`;

const STYLES = `
${DISPLAY}>[data-slot=number-flow-token],${DISPLAY}>[data-slot=number-flow-exit]{transition:opacity ${EASE},translate ${EASE},grid-template-columns ${EASE}}
@starting-style{${DISPLAY}>[data-slot=number-flow-token]{opacity:0;translate:0 var(--${PREFIX}-enter,100%);grid-template-columns:0fr}}
${DISPLAY}>[data-slot=number-flow-exit]{opacity:0;translate:0 calc(var(--${PREFIX}-enter,100%) * -1);grid-template-columns:0fr;transition-duration:calc(${DURATION} * .7)}
[data-slot=number-flow-window]{mask-image:linear-gradient(to bottom,transparent,var(--color-foreground) var(--${PREFIX}-fade),var(--color-foreground) calc(100% - var(--${PREFIX}-fade)),transparent)}
[data-slot=number-flow][data-duration] [data-slot=number-flow-reel]:not([data-snapping]),[data-slot=number-flow][data-duration] [data-slot=number-flow-reel]:not([data-snapping])>*{transition-duration:var(--${PREFIX}-duration)}
`;

/** Resting band: positions 10–19. A roll may travel anywhere; it snaps back here. */
const BAND = 10;
/** Cells rendered either side of the reel's destination. Covers any single roll. */
const REACH = 15;

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

/**
 * One digit's window onto its reel. `tiles` is the source Number Flow's boxed
 * counter. The bleed is how far the masked window reaches past the digit's
 * box, and the fade how deep its soft edge is.
 */
const numberFlowDigitVariants = cva("relative inline-flex justify-center", {
  variants: {
    variant: {
      plain: "[--dowel-number-flow-bleed:0.25em] [--dowel-number-flow-fade:0.25em]",
      tiles: cn(
        "h-[2.667em] w-[2em] items-center overflow-hidden rounded-lg border border-border bg-primary font-semibold text-primary-foreground",
        "[--dowel-number-flow-bleed:0em] [--dowel-number-flow-fade:0.6em]",
      ),
    },
  },
  defaultVariants: { variant: "plain" },
});

export type NumberFlowElement = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** Which way the reels roll. `auto` follows the change in value. */
export type NumberFlowTrend = "auto" | "up" | "down";

export interface NumberFlowProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children" | "prefix">,
    VariantProps<typeof numberFlowVariants> {
  /** The number to show. Update it as often as you like; each change rolls from what is on screen. */
  value: number;
  /** Passed to Intl.NumberFormat. Defaults to the user's locale. */
  locales?: Intl.LocalesArgument;
  /**
   * Intl.NumberFormat options: `style: "currency" | "percent"`,
   * `notation: "compact"`, `signDisplay`, `minimumFractionDigits`,
   * `minimumIntegerDigits` (zero-padding), `useGrouping`, …
   */
  format?: Intl.NumberFormatOptions;
  /** Which way the reels roll. `auto` (default) rolls up on a rise, down on a fall. */
  trend?: NumberFlowTrend;
  /**
   * Milliseconds between one digit starting to roll and the next, from the
   * leading digit. Price Flow uses 50.
   */
  stagger?: number;
  /**
   * How long a roll takes, in milliseconds, scaled by the motion scale.
   * Defaults to the slow duration token. Lower it for a value that updates
   * continuously, so the reels stay close to the number.
   */
  duration?: number;
  /** Rendered before the number, outside the reels — a unit, a label, an icon. Never animates. */
  prefix?: ReactNode;
  /** Rendered after the number, outside the reels. Never animates, but glides as the width changes. */
  suffix?: ReactNode;
  /** The element rendered as the root. */
  as?: NumberFlowElement;
}

type Token =
  { kind: "digit"; key: string; digit: number } | { kind: "symbol"; key: string; text: string };

/** A character that has left the number and is fading out on its last glyph. */
interface Exit {
  key: string;
  text: string;
  digit: boolean;
  /** The key it followed, so it fades out where it stood. */
  after: string | null;
}

const formatters = new Map<string, { format: Intl.NumberFormat; glyphs: string[] }>();

/** A formatter and the ten digit glyphs of its numbering system, cached per options. */
function formatterFor(locales: Intl.LocalesArgument, options: Intl.NumberFormatOptions) {
  const id = JSON.stringify([locales, options]);
  let cached = formatters.get(id);
  if (!cached) {
    const format = new Intl.NumberFormat(locales, options);
    const { locale, numberingSystem } = format.resolvedOptions();
    const plain = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false });
    cached = {
      format,
      glyphs: Array.from({ length: BAND }, (_, digit) => plain.format(digit)),
    };
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

/** The tokens on screen, in order: the current ones, with lost ones where they stood. */
function arrange(tokens: Token[], exits: Exit[]): (Token | Exit)[] {
  const list: (Token | Exit)[] = [...tokens];
  for (const exit of exits) {
    const anchor = exit.after === null ? -1 : list.findIndex((item) => item.key === exit.after);
    list.splice(anchor + 1, 0, exit);
  }
  return list;
}

interface Reel {
  digit: number;
  position: number;
  snapping: boolean;
}

/** The nearest position showing `digit`, strictly past `from` in the direction of travel. */
function travel(from: number, digit: number, up: boolean): number {
  const step = (((up ? digit - from : from - digit) % BAND) + BAND) % BAND || BAND;
  return up ? from + step : from - step;
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
  const cells = Array.from(
    { length: REACH * 2 + 1 },
    (_, offset) => reel.position - REACH + offset,
  );

  return (
    <span
      data-slot="number-flow-digit"
      data-digit={digit}
      className={numberFlowDigitVariants({ variant })}
    >
      {/* Sizes the window: in-flow, invisible, one glyph wide and one line tall. */}
      <span className="invisible">{glyphs[digit]}</span>
      {/* Reaches past the digit's box by the bleed, and fades to nothing there. */}
      <span
        data-slot="number-flow-window"
        className={cn(
          "pointer-events-none absolute inset-x-0 overflow-hidden",
          "top-[calc(var(--dowel-number-flow-bleed)*-1)] bottom-[calc(var(--dowel-number-flow-bleed)*-1)]",
        )}
      >
        <span
          data-slot="number-flow-reel"
          data-position={reel.position}
          data-snapping={reel.snapping ? "" : undefined}
          onTransitionEnd={handleTransitionEnd}
          className={cn(
            "absolute inset-x-0 top-[var(--dowel-number-flow-bleed)] bottom-[var(--dowel-number-flow-bleed)] transition-transform",
            motion,
          )}
          style={{
            transform: `translateY(${String(-reel.position * 100)}%)`,
            transitionDelay: `calc(${String(index * stagger)}ms * var(--motion-scale, 1))`,
          }}
        >
          {cells.map((cell) => (
            <span
              key={cell}
              data-active={cell === reel.position ? "" : undefined}
              className={cn(
                "absolute inset-x-0 flex h-full items-center justify-center opacity-0 transition-opacity data-active:opacity-100",
                motion,
              )}
              style={{ top: `${String(cell * 100)}%`, transitionDelay: "inherit" }}
            >
              {glyphs[((cell % BAND) + BAND) % BAND]}
            </span>
          ))}
        </span>
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
  duration,
  prefix,
  suffix,
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

  // Characters that left in a change fade out where they stood, on the glyph
  // they last showed. Derived during render from the previous tokens, so they
  // never blink out for a frame.
  const [track, setTrack] = useState({ text, tokens, exits: [] as Exit[] });
  if (track.text !== text) {
    const present = new Set(tokens.map((token) => token.key));
    const exits = track.exits.filter((exit) => !present.has(exit.key));
    track.tokens.forEach((token, index) => {
      if (present.has(token.key)) return;
      exits.push({
        key: token.key,
        text: token.kind === "digit" ? (glyphs[token.digit] ?? "") : token.text,
        digit: token.kind === "digit",
        after: track.tokens[index - 1]?.key ?? null,
      });
    });
    setTrack({ text, tokens, exits });
  }

  function retire(key: string) {
    setTrack((current) => {
      const gone = current.exits.find((exit) => exit.key === key);
      if (!gone) return current;
      return {
        ...current,
        // Anything that stood after it now stands after what it followed.
        exits: current.exits
          .filter((exit) => exit !== gone)
          .map((exit) => (exit.after === key ? { ...exit, after: gone.after } : exit)),
      };
    });
  }

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
      data-duration={duration === undefined ? undefined : ""}
      aria-atomic={props["aria-live"] ? true : undefined}
      className={cn("inline-block tabular-nums", className)}
      style={
        {
          [`--${PREFIX}-enter`]: up ? "100%" : "-100%",
          ...(duration === undefined
            ? {}
            : {
                [`--${PREFIX}-duration`]: `calc(${String(duration)}ms * var(--motion-scale, 1))`,
              }),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {prefix === undefined || prefix === null ? null : (
        <span data-slot="number-flow-prefix">{prefix}</span>
      )}
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
        {arrange(tokens, track.exits).map((item) => (
          <span
            key={item.key}
            // A leaving character is a different slot, so it is never counted
            // among the number's current characters.
            data-slot={"after" in item ? "number-flow-exit" : "number-flow-token"}
            // One column that opens and closes, so the width follows the
            // characters. Its content keeps its own width and is clipped
            // sideways only, leaving the reel's vertical bleed visible.
            className="inline-grid grid-cols-[1fr] justify-items-center overflow-x-clip [&>*]:min-w-0"
            onTransitionEnd={
              "after" in item
                ? (event) => {
                    if (
                      event.target === event.currentTarget &&
                      event.propertyName === "opacity"
                    ) {
                      retire(item.key);
                    }
                  }
                : undefined
            }
          >
            {"after" in item ? (
              <span
                className={cn(
                  "whitespace-pre",
                  item.digit && numberFlowDigitVariants({ variant }),
                )}
              >
                {item.text}
              </span>
            ) : item.kind === "digit" ? (
              <Digit
                digit={item.digit}
                up={up}
                index={digitIndex++}
                stagger={stagger}
                glyphs={glyphs}
                variant={variant}
              />
            ) : (
              <span className="whitespace-pre">{item.text}</span>
            )}
          </span>
        ))}
      </span>
      {suffix === undefined || suffix === null ? null : (
        <span data-slot="number-flow-suffix">{suffix}</span>
      )}
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
