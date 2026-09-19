"use client";

// Ported from SmoothUI App Download Stack (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva } from "class-variance-authority";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A pile of app icons that fans out on hover, and opens into a grid where each
 * app is a toggle; the selection is then handed to `onDownload`.
 *
 * `motion` is here for one thing (ADR 0014): each icon is the same layoutId in
 * the pile and in the grid, so opening the picker flies every icon from its
 * place in the stack to its tile and back — a shared-layout animation between
 * two DOM positions, which CSS cannot express. Everything else is CSS: the fan
 * (rotate/translate transitions), the idle float and the progress shine
 * (hoisted keyframes on --motion-scale). Under reduced motion MotionConfig makes
 * the layout change instant and the CSS snaps.
 *
 * The source faked a three-second download. Here the state is real: while the
 * promise returned by `onDownload` is pending the stack shows progress, then
 * "complete", then resets; a rejection announces the failure and keeps the
 * selection.
 */

const PREFIX = "dowel-app-stack";

const STYLES = `@keyframes ${PREFIX}-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes ${PREFIX}-shine{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes ${PREFIX}-in{from{opacity:0;transform:translateY(12px)}}
[data-slot=app-stack-float]{animation:${PREFIX}-float calc(2s * var(--motion-scale, 1)) cubic-bezier(.645,.045,.355,1) var(--app-stack-delay, 0s) infinite}
[data-slot=app-stack-shine]{animation:${PREFIX}-shine calc(1s * var(--motion-scale, 1)) linear infinite}
[data-slot=app-stack-tile]{animation:${PREFIX}-in var(--duration-normal, 200ms) var(--ease-out-quint, ease-out) var(--app-stack-delay, 0s) both}`;

const appStackTileVariants = cva(
  cn(
    "flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2",
    "transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
    focusRing,
  ),
  {
    variants: {
      selected: {
        true: "border-primary bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]",
        false: "border-transparent bg-muted hover:border-primary",
      },
    },
    defaultVariants: { selected: false },
  },
);

export interface AppStackItem {
  id: string;
  /** The app's name: the tile's label and the toggle's accessible name. */
  name: string;
  /** An image URL, or any node (an inline SVG, an icon component). Decorative. */
  icon: string | ReactNode;
}

export type AppStackStatus = "idle" | "downloading" | "complete";

export interface AppStackProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  apps: AppStackItem[];
  /** The picker's heading, e.g. "Starter Mac". */
  title?: string;
  /** Accessible name of the collapsed stack. Defaults to "Choose from {title}". */
  triggerLabel?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Controlled selection, by app id. */
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (selected: string[]) => void;
  /** Called with the selected ids. Return a promise to show progress until it settles. */
  onDownload?: (selected: string[]) => void | Promise<unknown>;
  /** Milliseconds the completed state shows before resetting. */
  resetAfter?: number;
  downloadLabel?: string;
  downloadingLabel?: string;
  completeLabel?: string;
  failedLabel?: string;
}

function Icon({ icon }: { icon: AppStackItem["icon"] }) {
  return typeof icon === "string" ? (
    <img src={icon} alt="" draggable={false} className="size-full rounded-xl object-cover" />
  ) : (
    <span className="flex size-full items-center justify-center overflow-hidden rounded-xl">
      {icon}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 rotate-180"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Stacked app icons that fan out and open into a multi-select download picker. */
export function AppStack({
  className,
  apps,
  title = "Apps",
  triggerLabel,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  onDownload,
  resetAfter = 1000,
  downloadLabel = "Download selected",
  downloadingLabel = "Downloading…",
  completeLabel = "Download complete",
  failedLabel = "Download failed",
  ...props
}: AppStackProps) {
  const layout = useId();
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const [selectedState, setSelectedState] = useState(defaultSelected);
  const [status, setStatus] = useState<AppStackStatus>("idle");
  const [message, setMessage] = useState("");
  const busy = status !== "idle";
  const expanded = (expandedProp ?? expandedState) && !busy;
  const selected = selectedProp ?? selectedState;

  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"trigger" | "header" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const target =
      pendingFocus.current === "header"
        ? header
        : pendingFocus.current === "trigger"
          ? trigger
          : null;
    target?.current?.focus();
    pendingFocus.current = null;
  }, [expanded]);

  function setExpanded(next: boolean) {
    pendingFocus.current = next ? "header" : "trigger";
    if (next) setMessage("");
    if (expandedProp === undefined) setExpandedState(next);
    onExpandedChange?.(next);
  }

  function setSelected(next: string[]) {
    if (selectedProp === undefined) setSelectedState(next);
    onSelectedChange?.(next);
  }

  function toggle(id: string) {
    setSelected(
      selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    );
  }

  async function download() {
    const ids = selected;
    setStatus("downloading");
    setMessage(downloadingLabel);
    setExpanded(false);
    try {
      await onDownload?.(ids);
    } catch {
      if (!alive.current) return;
      setStatus("idle");
      setMessage(failedLabel);
      return;
    }
    if (!alive.current) return;
    setStatus("complete");
    setMessage(completeLabel);
    timer.current = setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setSelected([]);
    }, resetAfter);
  }

  const delay = (index: number, step: number): CSSProperties =>
    ({
      "--app-stack-delay": `calc(${String(index * step)}ms * var(--motion-scale, 1))`,
    }) as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={layout}>
        <div
          data-slot="app-stack"
          data-state={expanded ? "expanded" : "collapsed"}
          data-status={status}
          className={cn("flex flex-col items-center gap-3", className)}
          {...props}
        >
          <style href={PREFIX} precedence="dowel">
            {STYLES}
          </style>
          {expanded ? (
            <div data-slot="app-stack-panel" className="flex flex-col items-stretch gap-2">
              <button
                ref={header}
                type="button"
                aria-expanded="true"
                className={cn(
                  "flex items-center justify-between gap-4 rounded-md px-0.5 text-sm font-medium",
                  focusRing,
                )}
                onClick={() => {
                  setExpanded(false);
                }}
              >
                <span>{title}</span>
                <span className="flex items-center gap-1">
                  {selected.length}
                  <span className="sr-only"> selected</span>
                  <ChevronIcon />
                </span>
              </button>
              <ul className="grid grid-cols-2 gap-3">
                {apps.map((app, index) => {
                  const on = selected.includes(app.id);
                  return (
                    <li
                      key={app.id}
                      data-slot="app-stack-tile"
                      className="relative"
                      style={delay(index, 100)}
                    >
                      <button
                        type="button"
                        aria-pressed={on}
                        className={appStackTileVariants({ selected: on })}
                        onClick={() => {
                          toggle(app.id);
                        }}
                      >
                        <motion.span
                          layoutId={app.id}
                          aria-hidden="true"
                          className="block size-10"
                        >
                          <Icon icon={app.icon} />
                        </motion.span>
                        <span className="max-w-full truncate text-xs font-medium">
                          {app.name}
                        </span>
                      </button>
                      <span
                        aria-hidden="true"
                        data-state={on ? "checked" : "unchecked"}
                        className={cn(
                          "pointer-events-none absolute end-2 top-2 flex size-4 items-center justify-center rounded-full border",
                          "transition-[background-color,border-color,color] duration-[var(--duration-fast)]",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border-strong text-transparent",
                        )}
                      >
                        <CheckIcon />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="mt-2 w-full"
                disabled={selected.length === 0}
                onClick={() => void download()}
              >
                {downloadLabel}
              </Button>
            </div>
          ) : (
            <button
              ref={trigger}
              type="button"
              aria-expanded="false"
              aria-disabled={busy || undefined}
              aria-label={triggerLabel ?? `Choose from ${title}`}
              data-slot="app-stack-trigger"
              className={cn(
                "group/app-stack relative isolate size-16 rounded-xl",
                focusRing,
                busy && "cursor-progress",
              )}
              onClick={() => {
                if (!busy) setExpanded(true);
              }}
            >
              {apps.map((app, index) => {
                const side = index % 2 === 0 ? -1 : 1;
                const fan = {
                  "--rest-rotate": `${String(side * 8 * (index + 1))}deg`,
                  "--rest-x": `${String(side * 3 * (index + 1))}px`,
                  "--hover-x": `${String(index * 10)}px`,
                  "--hover-y": `${String(index * -10)}px`,
                } as CSSProperties;
                return (
                  <motion.span
                    key={app.id}
                    layoutId={app.id}
                    className="absolute inset-0"
                    style={{ zIndex: apps.length - index }}
                  >
                    <span
                      className={cn(
                        "block size-full translate-x-[var(--rest-x)] rotate-[var(--rest-rotate)]",
                        "transition-[rotate,translate] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
                        !busy &&
                          "group-hover/app-stack:translate-x-[var(--hover-x)] group-hover/app-stack:translate-y-[var(--hover-y)] group-hover/app-stack:rotate-0 group-focus-visible/app-stack:translate-x-[var(--hover-x)] group-focus-visible/app-stack:translate-y-[var(--hover-y)] group-focus-visible/app-stack:rotate-0",
                      )}
                      style={fan}
                    >
                      <span
                        data-slot="app-stack-float"
                        className="block size-full"
                        style={delay(index, 200)}
                      >
                        <Icon icon={app.icon} />
                      </span>
                    </span>
                  </motion.span>
                );
              })}
              {status === "downloading" ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 z-50 overflow-hidden rounded-xl"
                >
                  <span
                    data-slot="app-stack-shine"
                    className="block size-full bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-primary)_35%,transparent),transparent)]"
                  />
                </span>
              ) : null}
            </button>
          )}
          <span
            role="status"
            data-slot="app-stack-status"
            className={cn(
              "text-sm font-semibold empty:hidden",
              status === "complete"
                ? "text-success"
                : status === "downloading"
                  ? "text-primary"
                  : "text-destructive",
            )}
          >
            {message}
          </span>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

export { appStackTileVariants };
