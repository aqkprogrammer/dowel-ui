"use client";

import { cn } from "@dowel-ui/react";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import { tokenizeLines, type CodeLanguage } from "~/lib/highlight";

/**
 * Code, as this site shows it.
 *
 * A filename and language in the bar, a copy control that says when it has
 * worked, syntax colours from the site's own small highlighter, and — for a
 * long file — a collapsed first view with the rest one click away, so a
 * thousand-line source does not become the page.
 *
 * Built on the library's Copy Button, not on its Code Block: the block
 * deliberately has no highlighter, and wrapping it to add one would mean
 * fighting its markup. The copy behaviour, which is the part with real
 * accessibility work in it, is the library's.
 */

const LANGUAGE_LABEL: Record<string, string> = {
  tsx: "TSX",
  ts: "TS",
  jsx: "JSX",
  js: "JS",
  json: "JSON",
  css: "CSS",
  bash: "Shell",
  text: "Text",
};

export interface CodePanelProps {
  code: string;
  language?: CodeLanguage;
  /** Shown in the bar: a filename, or "Terminal". */
  title?: ReactNode;
  /** 1-based line numbers to highlight. */
  highlight?: number[];
  lineNumbers?: boolean;
  /**
   * Lines shown before "Show all". Omit to never collapse. A file only a few
   * lines over the limit is shown whole — hiding four lines behind a button
   * costs more than it saves.
   */
  collapseAfter?: number;
  /** Content to the right of the title, before the copy button. */
  toolbar?: ReactNode;
  /** No bar: just the code and a floating copy button. For one-line commands. */
  bare?: boolean;
  className?: string;
}

export function CodePanel({
  code,
  language = "tsx",
  title,
  highlight,
  lineNumbers = false,
  collapseAfter,
  toolbar,
  bare = false,
  className,
}: CodePanelProps) {
  const trimmed = code.replace(/\n+$/, "");
  const lines = useMemo(() => tokenizeLines(trimmed, language), [trimmed, language]);
  const highlighted = useMemo(() => new Set(highlight ?? []), [highlight]);
  const collapsible = collapseAfter !== undefined && lines.length > collapseAfter + 6;
  const [expanded, setExpanded] = useState(false);
  const collapsed = collapsible && !expanded;
  const bodyId = useId();

  const copy = (
    <CopyButton
      value={trimmed}
      variant="ghost"
      size="icon-sm"
      aria-label={title && typeof title === "string" ? `Copy ${title}` : "Copy code"}
      copiedLabel="Copied"
      tone="success"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
    />
  );

  return (
    <figure
      data-slot="code-panel"
      className={cn(
        "group/code relative min-w-0 overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--pane)]",
        className,
      )}
    >
      {bare ? null : (
        <figcaption className="flex h-10 items-center gap-2 border-b border-[var(--hairline)] ps-4 pe-1.5">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {title}
          </span>
          {toolbar}
          <span className="rounded-md border border-[var(--hairline)] px-1.5 py-px font-mono text-[0.625rem] tracking-wider text-muted-foreground uppercase">
            {LANGUAGE_LABEL[language] ?? language}
          </span>
          {copy}
        </figcaption>
      )}

      <div className="relative">
        <pre
          id={bodyId}
          // A scroll region is keyboard-reachable only if it can take focus,
          // and a focusable region needs a name.
          tabIndex={0}
          role="region"
          aria-label={typeof title === "string" ? title : "Code"}
          className={cn(
            "code-tokens overflow-x-auto py-4 font-mono text-[0.8125rem] leading-6 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset",
            bare && "pe-12",
            collapsed && "max-h-[22rem] overflow-y-hidden",
          )}
        >
          <code className="grid min-w-max">
            {lines.map((tokens, index) => {
              const number = index + 1;
              const lit = highlighted.has(number);
              return (
                <span
                  key={index}
                  data-highlight={lit || undefined}
                  className={cn(
                    "flex px-4",
                    lit && "bg-[var(--glow-blue)] shadow-[inset_2px_0_0_var(--cosmic-blue)]",
                  )}
                >
                  {lineNumbers ? (
                    <span
                      aria-hidden="true"
                      className="me-4 inline-block w-6 shrink-0 text-end text-muted-foreground select-none"
                    >
                      {number}
                    </span>
                  ) : null}
                  <span>
                    {tokens.length === 0
                      ? " "
                      : tokens.map((token, tokenIndex) =>
                          token.type === "plain" ? (
                            token.text
                          ) : (
                            <span key={tokenIndex} className={`tok-${token.type}`}>
                              {token.text}
                            </span>
                          ),
                        )}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>

        {bare ? <div className="absolute top-2 right-2">{copy}</div> : null}

        {collapsible ? (
          <div
            className={cn(
              "flex justify-center",
              collapsed
                ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--pane)] via-[var(--pane)]/90 to-transparent pt-16 pb-3"
                : "border-t border-[var(--hairline)] py-2",
            )}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={bodyId}
              onClick={() => {
                setExpanded((value) => !value);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline-strong)] bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              {expanded ? "Collapse" : `Show all ${String(lines.length)} lines`}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform duration-[var(--duration-normal)]",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
