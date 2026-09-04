"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { disabledStyles, focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { LOG_LEVELS, segment, type LogLevel, type VisibleLine } from "./log-stream";

/**
 * A streaming console: filter, follow, expand.
 *
 * The incumbent is react-lazylog, which was last published in 2022, is built on
 * react-virtualized, and cannot run on React 19 — while still taking about
 * 15,000 downloads a week. This is for those people.
 *
 * Two accessibility decisions worth stating rather than discovering.
 *
 * `role="log"` implies `aria-live="polite"`, which is right for a handful of
 * events and catastrophic for a console: a screen reader would read every line
 * of a build as it scrolls past, and nothing else would be audible. Announcing
 * is therefore off by default and opt-in through `announce`. The role stays,
 * because it still describes what the region is.
 *
 * And virtualization means most rows are not in the DOM. That is a real trade,
 * not an implementation detail: assistive technology cannot reach what is not
 * rendered, so a reader who needs the whole log needs an escape — which is what
 * `onDownload` is for. A log viewer with no way out of the virtual window is
 * not accessible however good its ARIA is.
 */

const LEVEL_STYLES: Record<LogLevel, string> = {
  trace: "text-muted-foreground",
  debug: "text-muted-foreground",
  info: "text-foreground",
  warn: "text-warning",
  error: "text-destructive",
  fatal: "text-destructive font-semibold",
};

/** Distance from the bottom, in pixels, that still counts as "at the end". */
const FOLLOW_THRESHOLD = 24;

export interface LogViewerProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  lines: VisibleLine[];
  /** Names the region. */
  label: string;
  /** Row height in pixels. Rows are one line; expansion is measured. */
  rowHeight?: number;
  height?: number | string;
  /**
   * Read new lines aloud. Off by default — a console that announces every line
   * makes a screen reader useless for anything else.
   */
  announce?: boolean;
  /** The way out of the virtual window, for anyone who needs the whole log. */
  onDownload?: () => void;
  children?: ReactNode;
}

export function LogViewer({
  className,
  lines,
  label,
  rowHeight = 22,
  height = 360,
  announce = false,
  onDownload,
  children,
  ...props
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const labelId = useId();

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    // Without a starting rect the virtualizer renders nothing until a
    // ResizeObserver fires, so the first paint is an empty box. Seeding it from
    // the declared height means rows are there immediately, and it is measured
    // properly a moment later.
    initialRect: { width: 0, height: typeof height === "number" ? height : 360 },
  });

  // Follow mode, hand-written rather than delegated. A spring-anchoring library
  // wants to own the scroll container and so does the virtualizer, and the two
  // fight; this is scrollToIndex on append plus a proximity check.
  useEffect(() => {
    if (!following || lines.length === 0) return;
    virtualizer.scrollToIndex(lines.length - 1, { align: "end" });
  }, [following, lines.length, virtualizer]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;

    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    // Scrolling up detaches, because the reader is looking at something and
    // yanking them back to the tail would lose it. Returning to the bottom
    // re-attaches, which is the gesture people already expect.
    setFollowing(distance <= FOLLOW_THRESHOLD);
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div data-slot="log-viewer" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {!following ? (
            <button
              type="button"
              data-slot="log-viewer-jump"
              onClick={() => {
                setFollowing(true);
              }}
              className={cn(
                "rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
                focusRing,
              )}
            >
              Jump to latest
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Following</span>
          )}
          {onDownload ? (
            <button
              type="button"
              data-slot="log-viewer-download"
              onClick={onDownload}
              className={cn(
                "rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium",
                "transition-colors hover:bg-accent hover:text-accent-foreground",
                focusRing,
              )}
            >
              Download full log
            </button>
          ) : null}
        </div>
      </div>

      {children}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-labelledby={labelId}
        // Explicitly off unless asked for: role="log" implies polite, and a
        // console that reads every line aloud drowns out everything else.
        aria-live={announce ? "polite" : "off"}
        // A scrollable region must be focusable, or its content is unreachable
        // without a pointer — WCAG 2.1.1, and axe's scrollable-region-focusable
        // requires exactly this. jsx-a11y's heuristic cannot see that this
        // element scrolls, so here the requirement outranks the rule.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        style={{ height }}
        className={cn(
          "overflow-auto rounded-lg border border-border bg-muted/30 font-mono text-xs",
          focusRing,
        )}
      >
        {lines.length === 0 ? (
          <p className="p-3 text-muted-foreground">No lines match the current filter.</p>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {items.map((item) => {
              const line = lines[item.index];
              if (!line) return null;

              return (
                <div
                  key={line.id}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  data-slot="log-viewer-row"
                  data-level={line.level}
                  className="absolute start-0 top-0 w-full"
                  style={{ transform: `translateY(${String(item.start)}px)` }}
                >
                  <LogViewerRow
                    line={line}
                    expanded={expanded.has(line.id)}
                    onToggle={() => {
                      toggleExpanded(line.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export interface LogViewerRowProps {
  line: VisibleLine;
  expanded?: boolean;
  onToggle?: () => void;
}

/**
 * One line.
 *
 * Exported because the virtualized container cannot be measured outside a real
 * browser — jsdom reports every box as zero — so the row's behaviour would
 * otherwise be untestable. It is also genuinely useful on its own for anyone
 * rendering a short log without virtualization.
 */
export function LogViewerRow({ line, expanded = false, onToggle }: LogViewerRowProps) {
  const hasFields = line.fields !== undefined && Object.keys(line.fields).length > 0;
  const parts = segment(line.message, line.matches);

  return (
    <div className="px-3 py-0.5 hover:bg-accent/40">
      <div className="flex items-baseline gap-2">
        {line.timestamp ? (
          <time className="shrink-0 text-muted-foreground tabular-nums">{line.timestamp}</time>
        ) : null}

        {line.level ? (
          // The level in text, not a coloured bar. Colour alone cannot
          // distinguish warn from error for everyone reading.
          <span className={cn("w-11 shrink-0 uppercase", LEVEL_STYLES[line.level])}>
            {line.level}
          </span>
        ) : null}

        <span
          className={cn(
            "min-w-0 flex-1 break-all whitespace-pre-wrap",
            line.level && LEVEL_STYLES[line.level],
          )}
        >
          {parts.map((part, index) =>
            part.match ? (
              // A mark element, so the match is conveyed structurally rather
              // than only as a background colour.
              <mark key={index} className="rounded-[2px] bg-warning/35 text-inherit">
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </span>

        {hasFields ? (
          <button
            type="button"
            data-slot="log-viewer-expand"
            aria-expanded={expanded}
            onClick={onToggle}
            className={cn(
              "shrink-0 rounded px-1 text-2xs text-muted-foreground",
              "transition-colors hover:text-foreground",
              focusRing,
              disabledStyles,
            )}
          >
            {expanded ? "Hide fields" : "Fields"}
          </button>
        ) : null}
      </div>

      {expanded && line.fields ? (
        <dl
          data-slot="log-viewer-fields"
          className="ms-4 mt-1 mb-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-s border-border ps-3"
        >
          {Object.entries(line.fields).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="m-0 break-all">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export interface LogViewerToolbarProps extends Omit<ComponentPropsWithRef<"div">, "onChange"> {
  query: string;
  onQueryChange: (query: string) => void;
  regex: boolean;
  onRegexChange: (regex: boolean) => void;
  levels: Set<LogLevel>;
  onToggleLevel: (level: LogLevel) => void;
  counts: Map<LogLevel, number>;
  invalidPattern?: boolean;
  /** Shown as "N of M lines". */
  showing: number;
  total: number;
}

export function LogViewerToolbar({
  className,
  query,
  onQueryChange,
  regex,
  onRegexChange,
  levels,
  onToggleLevel,
  counts,
  invalidPattern = false,
  showing,
  total,
  ...props
}: LogViewerToolbarProps) {
  const filterId = useId();
  const errorId = useId();

  return (
    <div
      data-slot="log-viewer-toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <label htmlFor={filterId} className="sr-only">
          Filter log
        </label>
        <input
          id={filterId}
          type="search"
          value={query}
          placeholder={regex ? "Pattern…" : "Filter…"}
          aria-invalid={invalidPattern || undefined}
          aria-describedby={invalidPattern ? errorId : undefined}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          className={cn(
            "min-w-32 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm",
            invalidPattern && "border-destructive",
            focusRing,
          )}
        />
        <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={regex}
            onChange={(event) => {
              onRegexChange(event.target.checked);
            }}
            className={cn("size-3.5 rounded border-input", focusRing)}
          />
          Regex
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {LOG_LEVELS.filter((level) => counts.has(level)).map((level) => {
          const on = levels.size === 0 || levels.has(level);
          return (
            <button
              key={level}
              type="button"
              data-slot="log-viewer-facet"
              aria-pressed={on}
              onClick={() => {
                onToggleLevel(level);
              }}
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-2xs uppercase transition-colors",
                on
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "border-input bg-background text-muted-foreground line-through",
                focusRing,
              )}
            >
              {level} {counts.get(level) ?? 0}
            </button>
          );
        })}
      </div>

      <p className="w-full text-xs text-muted-foreground tabular-nums">
        {invalidPattern ? (
          // Said out loud rather than shown as an empty log, which reads as
          // "nothing matched" and sends the reader looking for the wrong thing.
          <span id={errorId} className="text-destructive">
            Incomplete pattern — showing everything until it is valid
          </span>
        ) : (
          `${String(showing)} of ${String(total)} lines`
        )}
      </p>
    </div>
  );
}
