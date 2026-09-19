"use client";

// Motion from SmoothUI AI Reasoning (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
} from "react";

import { ShimmerText } from "@/components/shimmer-text";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/**
 * The model's reasoning, tucked away.
 *
 * Collapsed by default and deliberately understated. Reasoning is supporting
 * material — surfacing it at the same weight as the answer buries the answer,
 * and most readers never want it. It stays one keystroke away for the people
 * who do.
 */

/** Delay before `autoCollapse={true}` closes the trace, in milliseconds. */
const AUTO_COLLAPSE_DELAY = 600;

interface ReasoningContextValue {
  streaming: boolean | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue>({ streaming: undefined });

export interface ReasoningProps extends Omit<
  ComponentPropsWithRef<typeof CollapsiblePrimitive.Root>,
  "onOpenChange"
> {
  /** Called when the reader opens or closes the trace. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Reasoning is still arriving. Feeds the trigger's default label and the
   * auto behaviours below.
   */
  streaming?: boolean;
  /**
   * Open when `streaming` turns true, until the reader toggles it themselves.
   *
   * Off by default (ADR 0009): an open trace gives reasoning the same weight
   * as the answer while it streams. Ignored when `open` is controlled.
   */
  autoOpen?: boolean;
  /**
   * Close after streaming ends, unless the reader has toggled it; a number is
   * the delay in milliseconds. Never closes while focus or the pointer is
   * inside the trace. Ignored when `open` is controlled.
   */
  autoCollapse?: boolean | number;
}

export function Reasoning({
  className,
  streaming,
  autoOpen = false,
  autoCollapse = false,
  open,
  defaultOpen,
  onOpenChange,
  ref,
  ...props
}: ReasoningProps) {
  const controlled = open !== undefined;
  const automatic = !controlled && (autoOpen || autoCollapse !== false);
  const collapseDelay =
    typeof autoCollapse === "number" ? autoCollapse : autoCollapse ? AUTO_COLLAPSE_DELAY : null;

  const rootRef = useRef<HTMLDivElement | null>(null);
  // A trace mounted mid-stream opens straight away under autoOpen.
  const [internalOpen, setInternalOpen] = useState(
    () => defaultOpen ?? (automatic && autoOpen && streaming === true),
  );
  // Once the reader has toggled it, the component stops deciding for them.
  const [userToggled, setUserToggled] = useState(false);
  const [previousStreaming, setPreviousStreaming] = useState(streaming);
  const [pendingCollapse, setPendingCollapse] = useState(false);

  // Streaming edges, adjusted during render so there is no frame in between.
  if (streaming !== previousStreaming) {
    setPreviousStreaming(streaming);
    if (automatic && !userToggled) {
      if (streaming) {
        setPendingCollapse(false);
        if (autoOpen) setInternalOpen(true);
      } else if (previousStreaming && collapseDelay !== null) {
        setPendingCollapse(true);
      }
    }
  }

  useEffect(() => {
    if (!pendingCollapse || collapseDelay === null) return;
    const timer = setTimeout(() => {
      setPendingCollapse(false);
      // Never yank the trace out from under someone reading or tabbing in it.
      const content = rootRef.current?.querySelector("[data-slot='reasoning-content']");
      if (content?.contains(document.activeElement) || content?.matches(":hover")) return;
      setInternalOpen(false);
    }, collapseDelay);
    return () => {
      clearTimeout(timer);
    };
  }, [pendingCollapse, collapseDelay]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!controlled || (!autoOpen && autoCollapse === false)) return;
    console.warn(
      "Reasoning: `autoOpen` and `autoCollapse` are ignored when `open` is controlled. " +
        "Drive `open` from `streaming` yourself, or drop `open`.",
    );
  }, [controlled, autoOpen, autoCollapse]);

  const openProps = automatic
    ? {
        open: internalOpen,
        onOpenChange: (next: boolean) => {
          setUserToggled(true);
          setPendingCollapse(false);
          setInternalOpen(next);
          onOpenChange?.(next);
        },
      }
    : { open, defaultOpen, onOpenChange };

  return (
    <ReasoningContext.Provider value={{ streaming }}>
      <CollapsiblePrimitive.Root
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-slot="reasoning"
        data-streaming={streaming || undefined}
        className={cn("text-sm", className)}
        {...openProps}
        {...props}
      />
    </ReasoningContext.Provider>
  );
}

/**
 * Seconds between `active` turning true and turning false, for "Thought for
 * 4.2s". `null` until the first run ends; a new run keeps the last value
 * until it, too, ends.
 */
export function useElapsedSeconds(active: boolean): number | null {
  const startedAt = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (active) {
      startedAt.current = performance.now();
      return;
    }
    const start = startedAt.current;
    if (start === null) return;
    startedAt.current = null;
    setElapsed((performance.now() - start) / 1000);
  }, [active]);

  return elapsed;
}

export interface ReasoningTriggerProps extends ComponentPropsWithRef<
  typeof CollapsiblePrimitive.Trigger
> {
  /** Shown while reasoning is still arriving. Defaults to the root's `streaming`. */
  streaming?: boolean;
  label?: string;
  streamingLabel?: string;
  /**
   * Seconds spent reasoning. When set and not streaming, the label becomes
   * `durationLabel(duration)`. Pair it with `useElapsedSeconds`.
   */
  duration?: number;
  /** Words for a duration. */
  durationLabel?: (seconds: number) => string;
  /** Shimmer the label while streaming. Decoration: it stops under reduced motion. */
  shimmer?: boolean;
}

function defaultDurationLabel(seconds: number): string {
  return `Thought for ${seconds.toFixed(1)}s`;
}

export function ReasoningTrigger({
  className,
  streaming: streamingProp,
  label = "Reasoning",
  streamingLabel = "Thinking…",
  duration,
  durationLabel = defaultDurationLabel,
  shimmer = false,
  children,
  ...props
}: ReasoningTriggerProps) {
  const context = useContext(ReasoningContext);
  const streaming = streamingProp ?? context.streaming;
  const idleLabel = duration === undefined ? label : durationLabel(duration);

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="reasoning-trigger"
      className={cn(
        "flex items-center gap-1.5 rounded-md text-xs text-muted-foreground",
        "transition-colors duration-[var(--duration-fast)] hover:text-foreground",
        "[&[data-state=open]>svg:last-child]:rotate-180",
        focusRing,
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5 shrink-0">
        <path
          d="M9.5 21h5M12 3a6 6 0 0 1 3.6 10.8c-.6.5-.9 1.1-1 1.7l-.1.5h-5l-.1-.5c-.1-.6-.4-1.2-1-1.7A6 6 0 0 1 12 3Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children ??
        (streaming ? (
          shimmer ? (
            <ShimmerText duration={1800} repeatDelay={0}>
              {streamingLabel}
            </ShimmerText>
          ) : (
            streamingLabel
          )
        ) : (
          idleLabel
        ))}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]"
      >
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CollapsiblePrimitive.Trigger>
  );
}

export function ReasoningContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="reasoning-content"
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:animate-accordion-close data-[state=open]:animate-accordion-open",
        className,
      )}
      {...props}
    >
      <div className="mt-2 border-s-2 border-border ps-3 text-sm whitespace-pre-wrap text-muted-foreground">
        {children}
      </div>
    </CollapsiblePrimitive.Content>
  );
}
