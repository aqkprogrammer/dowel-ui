"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { CopyButton } from "@/components/copy-button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * A block of code, with a copy control.
 *
 * Syntax highlighting is deliberately not built in. A highlighter is a large
 * dependency, a theme system of its own, and a choice between build-time and
 * runtime that belongs to the application. Pass already-highlighted markup as
 * children and the styling here applies to it; pass a plain string and it
 * renders as plain code.
 *
 * Line numbers and highlighted lines work with either. Neither touches the
 * code's markup: the gutter is a separate column of empty boxes one line
 * (`1lh`) tall, each drawing its number from `data-line` with a pseudo-element,
 * and a highlight is a band laid under the code at `(n - 1) * 1lh`. So they
 * line up with any highlighter's output as long as it keeps one line box per
 * line (a pre does not wrap), and the numbers can never be selected, copied or
 * read aloud. The line count comes from `code` when given, a string child
 * otherwise, and failing both is read from the rendered text after mount.
 *
 * `accent` re-shades the whole block from one colour. It is mixed with
 * color-mix into the theme's own background and foreground, so the ramp
 * flips with the mode for free: a tinted near-black surface under light text
 * in dark mode, a pale tint under dark text in light mode. The mixes live in
 * custom properties on the root and reach the elements through utilities, so
 * a consumer's `bg-*` or `border-*` still wins. Without an accent the block
 * looks exactly as it always has.
 *
 * The copy control is the shared Copy Button. Here its check springs in with
 * a turn as well as a scale, on the overshoot curve, and reverts after 1.5s.
 * (Accent theming, the line features and the springing check were inspired
 * by the Rare UI Code Block pattern; no code referenced.)
 */

const PREFIX = "dowel-code-block";

const STYLES = `
[data-slot=code-block]{--code-block-highlight:color-mix(in oklab,var(--color-primary) 10%,transparent);--code-block-highlight-edge:color-mix(in oklab,var(--color-primary) 60%,transparent);--code-block-line-number:color-mix(in oklab,var(--color-muted-foreground) 75%,transparent)}
[data-slot=code-block][data-accent]{--code-block-surface:color-mix(in oklab,var(--code-block-accent) 5%,var(--color-background));--code-block-header:color-mix(in oklab,var(--code-block-accent) 10%,var(--color-background));--code-block-border:color-mix(in oklab,var(--code-block-accent) 24%,var(--color-background));--code-block-text:color-mix(in oklab,var(--code-block-accent) 15%,var(--color-foreground));--code-block-muted:color-mix(in oklab,var(--code-block-accent) 40%,var(--color-foreground));--code-block-line-number:color-mix(in oklab,var(--code-block-muted) 70%,transparent);--code-block-highlight:color-mix(in oklab,var(--code-block-accent) 13%,transparent);--code-block-highlight-edge:var(--code-block-accent)}
.dark [data-slot=code-block][data-accent]{--code-block-surface:color-mix(in oklab,var(--code-block-accent) 13%,var(--color-background));--code-block-header:color-mix(in oklab,var(--code-block-accent) 19%,var(--color-background));--code-block-border:color-mix(in oklab,var(--code-block-accent) 30%,var(--color-background));--code-block-highlight:color-mix(in oklab,var(--code-block-accent) 22%,transparent)}
`;

/** The block's frame. `frame: false` drops the surface, border, corners and header. */
const codeBlockVariants = cva("relative", {
  variants: {
    frame: {
      true: "overflow-hidden rounded-lg border border-border bg-muted/40",
      false: "",
    },
  },
  defaultVariants: { frame: true },
});

/** Replaces the frame's colours with the accent ramp. */
const accented = cn(
  "border-[var(--code-block-border)] bg-[var(--code-block-surface)] text-[color:var(--code-block-text)]",
);

const copyMorph = cn(
  "transition-[rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
);

function CopyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(copyMorph, "group-data-[state=copied]/copy:rotate-90")}
    >
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-slot="code-block-check"
      className={cn(copyMorph, "-rotate-90 group-data-[state=copied]/copy:rotate-0")}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Lines in a piece of code, not counting the newline most files end with. */
function countLines(text: string): number {
  return text.replace(/\n$/, "").split("\n").length;
}

export interface CodeBlockProps
  extends ComponentPropsWithRef<"div">, VariantProps<typeof codeBlockVariants> {
  /** Shown in the header and used as the language hint. */
  language?: string;
  /** Filename or other caption for the header. */
  title?: string;
  /**
   * The source code. Rendered when there are no children, and always what the
   * copy button puts on the clipboard.
   *
   * Required when children are rendered markup, because reading text back out
   * of highlighted DOM loses whitespace in ways that break pasted code. It
   * also gives line numbers their count on the first paint.
   */
  code?: string;
  /** Hides the copy control. */
  hideCopy?: boolean;
  /**
   * Any CSS colour. The surface, border, header, text, line numbers and
   * highlights are all mixed from it and the theme, in light and dark mode.
   */
  accent?: string;
  /** A gutter of line numbers. They cannot be selected or copied, and are hidden from assistive technology. */
  showLineNumbers?: boolean;
  /** 1-based line numbers to mark with a soft wash of the accent. */
  highlightLines?: number[];
  /**
   * Shows the header bar. By default it shows when there is a title, a
   * language or a copy control. Without it, the copy control floats over the
   * top corner. Always off when `frame` is false.
   */
  showHeader?: boolean;
}

export function CodeBlock({
  className,
  style,
  language,
  title,
  code,
  hideCopy,
  accent,
  frame = true,
  showLineNumbers = false,
  highlightLines,
  showHeader,
  children,
  ...props
}: CodeBlockProps) {
  const codeRef = useRef<HTMLElement | null>(null);
  const framed = frame !== false;
  const header = framed && (showHeader ?? (Boolean(title ?? language) || !hideCopy));
  const content = children ?? code;

  // Line features need a count. A string gives it at render; rendered markup
  // is counted from its text once it is in the document.
  const lined = showLineNumbers || (highlightLines?.length ?? 0) > 0;
  const text = code ?? (typeof content === "string" ? content : undefined);
  const [measured, setMeasured] = useState(0);
  useLayoutEffect(() => {
    if (!lined || text !== undefined) return;
    setMeasured(countLines(codeRef.current?.textContent ?? ""));
  }, [lined, text, content]);
  const lineCount = text === undefined ? measured : countLines(text);
  const highlighted = new Set(
    (highlightLines ?? []).filter(
      (line) => Number.isInteger(line) && line >= 1 && line <= lineCount,
    ),
  );

  const copy = hideCopy ? null : (
    <CopyButton
      value={() => code ?? codeRef.current?.textContent ?? ""}
      variant="ghost"
      aria-label="Copy code"
      timeout={1500}
      icon={<CopyGlyph />}
      copiedIcon={<CheckGlyph />}
      className={cn(
        "group/copy rounded text-muted-foreground hover:text-foreground",
        "[&_svg:not([class*='size-'])]:size-3.5",
        header
          ? "ms-auto size-6"
          : "absolute end-2 top-2 z-10 size-7 bg-background/80 backdrop-blur-sm",
        accent &&
          "text-[color:var(--code-block-muted)] hover:bg-[var(--code-block-highlight)] hover:text-[color:var(--code-block-text)]",
        accent && !header && "bg-[var(--code-block-header)]",
      )}
    />
  );

  return (
    <div
      data-slot="code-block"
      data-language={language}
      data-accent={accent ? "" : undefined}
      className={cn(
        codeBlockVariants({ frame: framed }),
        accent && framed && accented,
        className,
      )}
      style={accent ? ({ "--code-block-accent": accent, ...style } as CSSProperties) : style}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      {header ? (
        <div
          data-slot="code-block-header"
          className={cn(
            "flex items-center gap-2 border-b border-border px-3 py-1.5",
            accent && "border-[var(--code-block-border)] bg-[var(--code-block-header)]",
          )}
        >
          <span
            className={cn(
              "truncate text-2xs font-medium text-muted-foreground",
              accent && "text-[color:var(--code-block-muted)]",
            )}
          >
            {title ?? language}
          </span>
          {copy}
        </div>
      ) : (
        copy
      )}
      <pre
        // Focusable named region: code overflows horizontally, and a scroll box
        // that cannot take focus is unreachable by keyboard.
        tabIndex={0}
        role="region"
        aria-label={title ?? (language ? `${language} code` : "Code")}
        className={cn(
          "overflow-x-auto font-mono text-xs leading-relaxed",
          lined ? "py-3" : "p-3",
          focusRing,
          "focus-visible:ring-inset",
        )}
      >
        {lined ? (
          // As wide as the longest line, so a highlight spans the full scroll width.
          <div data-slot="code-block-lines" className="relative flex w-max min-w-full">
            {[...highlighted].map((line) => (
              <span
                key={line}
                aria-hidden="true"
                data-slot="code-block-highlight"
                className={cn(
                  "pointer-events-none absolute inset-x-0 h-[1lh] border-s-2",
                  "top-[calc((var(--code-block-line)-1)*1lh)]",
                  "border-[var(--code-block-highlight-edge)] bg-[var(--code-block-highlight)]",
                )}
                style={{ "--code-block-line": line } as CSSProperties}
              />
            ))}
            {showLineNumbers ? (
              <span
                aria-hidden="true"
                data-slot="code-block-gutter"
                className="relative flex flex-col ps-3 pe-4 text-end tabular-nums select-none"
              >
                {Array.from({ length: lineCount }, (_, index) => (
                  <span
                    key={index}
                    data-line={index + 1}
                    data-highlighted={highlighted.has(index + 1) ? "" : undefined}
                    className={cn(
                      "block h-[1lh] text-[color:var(--code-block-line-number)] before:content-[attr(data-line)]",
                      "data-[highlighted]:text-[color:var(--code-block-highlight-edge)]",
                    )}
                  />
                ))}
              </span>
            ) : null}
            <code
              ref={codeRef}
              className={cn("relative block flex-1 pe-3", !showLineNumbers && "ps-3")}
            >
              {content}
            </code>
          </div>
        ) : (
          <code ref={codeRef}>{content}</code>
        )}
      </pre>
    </div>
  );
}

export { codeBlockVariants };
