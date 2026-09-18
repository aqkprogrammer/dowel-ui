// Ported from amicro "Text & Interface" (MIT, © 2026 Syed Subhan Uddin). See THIRD_PARTY_NOTICES.md.
//
// Renamed so no variant carries another company's product name:
// apple-text-reveal → reveal, apple-unlock → unlock, mac-terminal → window-terminal,
// dynamic-island → island, face-id-scan → scan. The rest drop their redundant
// "text-"/"-loader" affixes (text-shimmer → shimmer, skeleton-loader → skeleton, …).
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Same shape as every loader family (ADR 0014): geometry in `em`, colour from
 * `currentColor`, keyframes hoisted with the component and every duration run
 * through --motion-scale-indicator, `direction: ltr` on the root.
 *
 * This family carries words. The words inherit the parent's font; `size` sets
 * the font size, and the non-text geometry (cursors, bars, surfaces) is in em
 * so it follows. Surfaces use the semantic surface tokens, never a literal.
 * The words are decoration — the root is aria-hidden — and `label` stays the
 * accessible announcement.
 */

const PREFIX = "dowel-text-loader";

/** A delay or duration in seconds, scaled for reduced motion. */
function scaled(seconds: number): string {
  return `calc(${String(seconds)}s * var(--motion-scale-indicator, 1))`;
}

const FAINT = (percent: number) =>
  `color-mix(in oklab, currentColor ${String(percent)}%, transparent)`;

const STYLES = `
.${PREFIX}{direction:ltr;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit;white-space:nowrap}
.${PREFIX} [data-part]{animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-duration:var(--dur);animation-delay:var(--delay,0s)}
.${PREFIX} [data-part=char]{display:inline-block}
.${PREFIX} [data-part=dot]{display:block;border-radius:9999px;background:currentColor}
.${PREFIX} [data-part=text]{display:inline-block}
.${PREFIX} [data-part=sheen]{position:absolute;inset:0;background-image:linear-gradient(90deg,transparent 0%,currentColor 50%,transparent 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
@keyframes ${PREFIX}-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}
@keyframes ${PREFIX}-unlock{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes ${PREFIX}-blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes ${PREFIX}-dot-1{0%{opacity:0}20%,80%{opacity:1}100%{opacity:0}}
@keyframes ${PREFIX}-dot-2{0%,40%{opacity:0}80%{opacity:1}100%{opacity:0}}
@keyframes ${PREFIX}-dot-3{0%,60%{opacity:0}80%{opacity:1}100%{opacity:0}}
@keyframes ${PREFIX}-wave{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-.125em)}}
@keyframes ${PREFIX}-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--rise))}}
@keyframes ${PREFIX}-cursor{0%,100%{opacity:1}50%{opacity:0}}
@keyframes ${PREFIX}-slide{from{transform:translateX(-100%)}to{transform:translateX(var(--to))}}
@keyframes ${PREFIX}-fade{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes ${PREFIX}-reveal{0%{transform:translateY(100%)}50%{transform:translateY(0)}100%{transform:translateY(-100%)}}
@keyframes ${PREFIX}-drift{0%,100%{transform:translate(-1.25em,-.625em)}50%{transform:translate(1.25em,.625em)}}
@keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
@keyframes ${PREFIX}-stretch{0%,100%{width:5em}50%{width:6.875em}}
@keyframes ${PREFIX}-pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes ${PREFIX}-level{0%,100%{height:.1875em}50%{height:.5em}}
@keyframes ${PREFIX}-draw{from{stroke-dashoffset:125}to{stroke-dashoffset:0}}
@keyframes ${PREFIX}-morph-out{0%{opacity:1;transform:translateY(0)}33.333%{opacity:0;transform:translateY(-1em)}66.667%{opacity:0;transform:translateY(1em)}100%{opacity:1;transform:translateY(0)}}
@keyframes ${PREFIX}-morph-in{0%{opacity:0;transform:translateY(1em)}33.333%,66.667%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-1em)}}
@keyframes ${PREFIX}-sweep{0%,100%{top:-100%}50%{top:100%}}
`;

type Content = { text: string; words: readonly string[] };

type Variant = {
  /**
   * Layout of the root, inline rather than as utilities. The hoisted stylesheet
   * is unlayered, so it outranks Tailwind's layered utilities whatever their
   * specificity; inline styles are the one thing that reliably outranks it.
   */
  root: CSSProperties;
  render: (content: Content) => ReactNode;
};

type Style = CSSProperties & Record<`--${string}`, string>;

/** An animation's inline style: its keyframe, duration and delay. */
function motion(animation: string, duration: number, delay = 0, extra: Style = {}): Style {
  return {
    animationName: `${PREFIX}-${animation}`,
    "--dur": scaled(duration),
    "--delay": scaled(delay),
    ...extra,
  };
}

/** One element per character, each on its own delay. */
function chars(text: string, render: (index: number) => Style): ReactNode {
  return Array.from(text).map((char, index) => (
    <span key={index} data-part="char" style={render(index)}>
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

/** A blinking block cursor. */
function cursor(width: string, height: string, duration: number, gap: string): ReactNode {
  return (
    <span
      data-part="cursor"
      style={motion("cursor", duration, 0, {
        display: "inline-block",
        width,
        height,
        marginInlineStart: gap,
        background: "currentColor",
        animationTimingFunction: "linear",
      })}
    />
  );
}

/** Faint base words with a bright band swept across them. */
function sheen(text: string, animation: string, duration: number, base: number): ReactNode {
  return (
    <>
      <span style={{ color: FAINT(base) }}>{text}</span>
      <span
        data-part="sheen"
        style={motion(animation, duration, 0, { animationTimingFunction: "linear" })}
      >
        {text}
      </span>
    </>
  );
}

const MONO = "var(--font-mono, ui-monospace, monospace)";
const CLIP: CSSProperties = { height: "1.5em", lineHeight: "1.5em", overflow: "hidden" };

const VARIANT_NAMES = [
  "shimmer",
  "blink",
  "dots",
  "shimmer-wave",
  "typing-indicator",
  "typing",
  "shimmer-line",
  "skeleton",
  "terminal",
  "reveal",
  "fluid-skeleton",
  "spring-pop",
  "unlock",
  "glass-card",
  "window-terminal",
  "island",
  "app-icon",
  "morph",
  "scan",
] as const;

export type TextLoaderVariant = (typeof VARIANT_NAMES)[number];

// Annotated rather than inferred: the inferred type drags csstype's internals
// into the declaration output (TS2883).
const VARIANTS: Record<TextLoaderVariant, Variant> = {
  shimmer: { root: {}, render: ({ text }) => sheen(text, "shimmer", 1.5, 30) },
  blink: {
    root: {},
    render: ({ text }) => (
      <span data-part="text" style={motion("blink", 1.5)}>
        {text}
      </span>
    ),
  },
  dots: {
    root: {},
    render: ({ text }) => (
      <>
        <span>{text}</span>
        <span style={{ display: "flex", width: "1.5em", paddingInlineStart: "0.125em" }}>
          {[1, 2, 3].map((index) => (
            <span key={index} data-part="char" style={motion(`dot-${String(index)}`, 2)}>
              .
            </span>
          ))}
        </span>
      </>
    ),
  },
  "shimmer-wave": {
    root: {},
    render: ({ text }) => chars(text, (index) => motion("wave", 1.5, index * 0.1)),
  },
  "typing-indicator": {
    root: {
      gap: "0.25em",
      padding: "0.5em 1em",
      borderRadius: "9999px",
      background: "var(--color-muted)",
    },
    render: () =>
      [0, 1, 2].map((index) => (
        <span
          key={index}
          data-part="dot"
          style={motion("hop", 0.6, index * 0.15, {
            width: "0.375em",
            height: "0.375em",
            "--rise": "-0.25em",
          })}
        />
      )),
  },
  typing: {
    root: {},
    render: ({ text }) => (
      <>
        <span>{text}</span>
        {cursor("0.375em", "1em", 0.8, "0.25em")}
      </>
    ),
  },
  "shimmer-line": {
    root: {
      width: "6em",
      height: "0.25em",
      borderRadius: "9999px",
      overflow: "hidden",
      justifyContent: "flex-start",
      background: FAINT(20),
    },
    render: () => (
      <span
        data-part="dot"
        style={motion("slide", 1.5, 0, {
          position: "absolute",
          insetBlock: 0,
          insetInlineStart: 0,
          width: "33.333%",
          "--to": "300%",
        })}
      />
    ),
  },
  skeleton: {
    root: {
      width: "7.5em",
      flexDirection: "column",
      alignItems: "stretch",
      gap: "0.5em",
      color: "var(--color-muted)",
    },
    render: () => {
      const block = (key: string, delay: number, extra: Style) => (
        <span
          key={key}
          data-part="dot"
          style={motion("fade", 1.5, delay, { borderRadius: "9999px", ...extra })}
        />
      );
      return [
        <span key="head" style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
          {block("avatar", 0, { width: "2em", height: "2em", flexShrink: 0 })}
          {block("title", 0.2, { height: "0.75em", width: "100%" })}
        </span>,
        block("line-1", 0.4, { height: "0.5em", width: "100%" }),
        block("line-2", 0.6, { height: "0.5em", width: "80%" }),
      ];
    },
  },
  terminal: {
    root: {
      minWidth: "8em",
      height: "4em",
      padding: "0.75em",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-end",
      overflow: "hidden",
      borderRadius: "0.375em",
      border: "0.0625em solid var(--color-border)",
      background: "var(--color-card)",
      fontFamily: MONO,
    },
    render: ({ text }) => (
      <>
        <span
          style={{
            display: "flex",
            gap: "0.8em",
            marginBlockEnd: "0.4em",
            fontSize: "0.625em",
            lineHeight: 1,
            color: "var(--color-muted-foreground)",
          }}
        >
          <span>$</span>
          <span>{text}...</span>
        </span>
        <span
          style={{ display: "flex", alignItems: "center", fontSize: "0.625em", lineHeight: 1 }}
        >
          <span style={{ color: "var(--color-success)" }}>&gt;</span>
          {cursor("0.6em", "1em", 0.8, "0.8em")}
        </span>
      </>
    ),
  },
  reveal: {
    root: CLIP,
    render: ({ text }) => (
      <span data-part="text" style={motion("reveal", 2)}>
        {text}
      </span>
    ),
  },
  "fluid-skeleton": {
    root: {
      width: "6em",
      height: "2.5em",
      borderRadius: "0.75em",
      overflow: "hidden",
      background: "var(--color-muted)",
    },
    render: () => (
      <span
        data-part="band"
        style={motion("slide", 1.5, 0, {
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-card) 60%, transparent), transparent)",
          animationTimingFunction: "linear",
          "--to": "200%",
        })}
      />
    ),
  },
  "spring-pop": {
    root: { letterSpacing: "0.1em" },
    render: ({ text }) =>
      chars(`${text}...`, (index) =>
        motion("hop", 1.2, index * 0.08, { transformOrigin: "bottom", "--rise": "-0.375em" }),
      ),
  },
  unlock: {
    root: { letterSpacing: "0.025em", userSelect: "none" },
    render: ({ text }) => sheen(text, "unlock", 2.2, 40),
  },
  "glass-card": {
    root: {
      width: "5em",
      height: "4em",
      overflow: "hidden",
      borderRadius: "1em",
      border: "0.0625em solid var(--color-border)",
      background: "var(--color-muted)",
      backdropFilter: "blur(0.75em)",
    },
    render: () => (
      <>
        <span
          data-part="dot"
          style={motion("drift", 3, 0, {
            position: "absolute",
            width: "3em",
            height: "3em",
            background: FAINT(25),
            filter: "blur(1.5em)",
          })}
        />
        <span
          data-part="ring"
          style={motion("spin", 1, 0, {
            position: "relative",
            display: "block",
            width: "1.25em",
            height: "1.25em",
            boxSizing: "border-box",
            borderRadius: "9999px",
            border: "0.125em solid currentColor",
            borderTopColor: "transparent",
            animationTimingFunction: "linear",
          })}
        />
      </>
    ),
  },
  "window-terminal": {
    root: { fontFamily: MONO },
    render: () => (
      <>
        <span>~ %</span>
        {cursor("0.5em", "1em", 1, "0.375em")}
      </>
    ),
  },
  island: {
    root: {},
    render: () => (
      <span
        data-part="pill"
        style={motion("stretch", 2.2, 0, {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75em",
          height: "2em",
          padding: "0.5em 1em",
          boxSizing: "border-box",
          borderRadius: "9999px",
          border: "0.0625em solid var(--color-border)",
          background: "currentColor",
        })}
      >
        <span
          data-part="dot"
          style={motion("pulse", 1.1, 0, {
            width: "0.375em",
            height: "0.375em",
            background: "var(--color-success)",
          })}
        />
        <span style={{ display: "flex", alignItems: "center", gap: "0.25em", height: "0.5em" }}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              data-part="dot"
              style={motion("level", 0.8, index * 0.15, {
                width: "0.125em",
                background: "color-mix(in oklab, var(--color-background) 75%, transparent)",
              })}
            />
          ))}
        </span>
      </span>
    ),
  },
  "app-icon": {
    root: {
      width: "3em",
      height: "3em",
      overflow: "hidden",
      borderRadius: "0.75em",
      background: "var(--color-muted)",
    },
    render: () => (
      <svg
        viewBox="0 0 50 50"
        width="2em"
        height="2em"
        fill="none"
        strokeWidth="4"
        style={{ position: "absolute" }}
      >
        <circle cx="25" cy="25" r="20" style={{ stroke: FAINT(25) }} />
        <circle
          cx="25"
          cy="25"
          r="20"
          strokeDasharray="125"
          data-part="arc"
          style={motion("draw", 2, 0, {
            stroke: "currentColor",
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transformBox: "fill-box",
          })}
        />
      </svg>
    ),
  },
  morph: {
    root: { ...CLIP, display: "inline-grid", placeItems: "center", minWidth: "6em" },
    render: ({ words }) =>
      (["morph-out", "morph-in"] as const).map((animation, index) => (
        <span
          key={animation}
          data-part="text"
          style={motion(animation, 3, 0, { gridArea: "1 / 1" })}
        >
          {words[index] ?? ""}
        </span>
      )),
  },
  scan: {
    root: {
      width: "3em",
      height: "3em",
      overflow: "hidden",
      borderRadius: "0.75em",
      border: "0.125em solid var(--color-border)",
    },
    render: () => (
      <>
        <svg viewBox="0 0 24 24" width="1.5em" height="1.5em" style={{ fill: FAINT(30) }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
        <span
          data-part="beam"
          style={motion("sweep", 2.5, 0, {
            position: "absolute",
            insetInlineStart: 0,
            width: "100%",
            height: "2em",
            background: `linear-gradient(to bottom, transparent, ${FAINT(30)})`,
            borderBottom: "0.0625em solid currentColor",
            animationTimingFunction: "linear",
          })}
        />
      </>
    ),
  },
};

/** Every variant, in catalogue order. Stories and tests iterate this. */
export const textLoaderVariantNames: TextLoaderVariant[] = [...VARIANT_NAMES];

const textLoaderVariants = cva("", {
  variants: {
    size: {
      sm: "text-[0.75rem]",
      md: "text-[1rem]",
      lg: "text-[1.25rem]",
      xl: "text-[1.5rem]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface TextLoaderProps
  extends
    Omit<ComponentPropsWithRef<"span">, "children">,
    VariantProps<typeof textLoaderVariants> {
  /** Which animation to play. */
  variant?: TextLoaderVariant;
  /** The word the text variants display. Decorative — `label` is what is announced. */
  text?: string;
  /** The words `morph` alternates between. Defaults to `text`, then "Wait". */
  words?: readonly string[];
  /**
   * Announced to assistive technology while the loader is visible.
   *
   * Omit it when the loader sits inside something that already reports its
   * busy state — announcing twice is worse than not announcing at all.
   */
  label?: string;
}

/** An indeterminate loading indicator made of words and interface shapes, in 19 motions. */
export function TextLoader({
  className,
  size,
  variant = "shimmer",
  text = "Loading",
  words,
  label,
  style,
  ...props
}: TextLoaderProps) {
  const spec = VARIANTS[variant];

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <span
        aria-hidden="true"
        data-slot="text-loader"
        data-variant={variant}
        // Exempt from the reduced-motion blanket: a loader that stops says the
        // application has hung. It is slowed instead — see ADR 0014.
        data-motion="indicator"
        className={cn(PREFIX, textLoaderVariants({ size }), className)}
        style={{ ...spec.root, ...style }}
        {...props}
      >
        {spec.render({ text, words: words ?? [text, "Wait"] })}
      </span>
      {label ? (
        <span role="status" className="sr-only">
          {label}
        </span>
      ) : null}
    </>
  );
}

export { textLoaderVariants };
