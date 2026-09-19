"use client";

// Motion from SmoothUI AI Conversation (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * The scrolling container for a conversation.
 *
 * Two problems here are easy to get wrong and unpleasant to live with.
 *
 * **Scrolling.** A chat should follow new content, but only while the reader is
 * already at the bottom. The moment someone scrolls up to re-read something,
 * yanking them back down is worse than not following at all — so this tracks
 * whether they are pinned to the bottom and stops following as soon as they are
 * not, offering an explicit way back instead.
 *
 * **Announcements.** The obvious thing is to make the transcript a live region.
 * Do not: a live region that updates on every token produces a stream of
 * interruptions that is unusable with a screen reader, and it is the single
 * most common accessibility failure in chat interfaces. The transcript here is
 * an ordinary list, navigable at the reader's pace, and a *separate* status
 * region announces state — "generating", "response complete" — never content.
 */

interface ConversationContextValue {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  atBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

function useConversation(component: string): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <Conversation>.`);
  }
  return context;
}

/**
 * Resolves `"smooth"` to `"auto"` for readers who asked for less motion.
 *
 * The theme's `scroll-behavior: auto !important` only governs the CSS default:
 * an explicit `behavior: "smooth"` passed to `scrollTo` still animates, so the
 * preference has to be honoured here.
 */
function resolveBehavior(behavior: ScrollBehavior): ScrollBehavior {
  if (behavior !== "smooth") return behavior;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return behavior;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior;
}

/** How close to the bottom still counts as "at the bottom", in pixels. */
const BOTTOM_THRESHOLD = 32;

export interface ConversationProps extends ComponentPropsWithRef<"div"> {
  /**
   * Follow new content while the reader is at the bottom.
   *
   * Turning this off never scrolls automatically; it does not pin the view.
   */
  autoScroll?: boolean;
}

export function Conversation({
  className,
  autoScroll = true,
  children,
  ...props
}: ConversationProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // jsdom and some embedded webviews have no Element.scrollTo.
    if (typeof viewport.scrollTo !== "function") {
      viewport.scrollTop = viewport.scrollHeight;
      return;
    }
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: resolveBehavior(behavior) });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleScroll() {
      if (!viewport) return;
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setAtBottom(distance <= BOTTOM_THRESHOLD);
    }

    handleScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Follows content as it grows, but only while the reader is pinned to the
  // bottom. Layout effect so the jump happens before paint rather than as a
  // visible lurch.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoScroll) return;

    const observer = new ResizeObserver(() => {
      if (atBottom) viewport.scrollTop = viewport.scrollHeight;
    });

    for (const child of viewport.children) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, [autoScroll, atBottom]);

  const context = useMemo<ConversationContextValue>(
    () => ({ viewportRef, atBottom, scrollToBottom }),
    [atBottom, scrollToBottom],
  );

  return (
    <ConversationContext.Provider value={context}>
      <div
        data-slot="conversation"
        data-at-bottom={atBottom || undefined}
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        <div
          ref={viewportRef}
          data-slot="conversation-viewport"
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {children}
        </div>
      </div>
    </ConversationContext.Provider>
  );
}

/**
 * The transcript.
 *
 * An ordered list, deliberately not a live region — see the note on
 * `Conversation`. Order is meaning here, and list semantics give a screen
 * reader user position and count ("3 of 12") as they move through it.
 */
export function ConversationMessages({ className, ...props }: ComponentPropsWithRef<"ol">) {
  return (
    <ol
      data-slot="conversation-messages"
      className={cn("flex flex-col gap-6 p-4", className)}
      {...props}
    />
  );
}

/**
 * The conversation's state, in SmoothUI's AIState vocabulary.
 *
 * Named for this component rather than `AIState` so it can never collide with
 * a shared type exported elsewhere in the library.
 */
export type ConversationState =
  "idle" | "listening" | "thinking" | "streaming" | "done" | "error";

/** Default wording per state. `idle` is empty, so first paint announces nothing. */
const STATE_LABELS: Record<ConversationState, string> = {
  idle: "",
  listening: "Listening",
  thinking: "Thinking",
  streaming: "Generating response",
  done: "Response complete",
  error: "Response failed",
};

export interface ConversationStatusProps extends ComponentPropsWithRef<"div"> {
  /** Announced politely when it changes. Keep it short: state, never content. */
  children?: ReactNode;
  /** Renders default wording for a state. `children` wins when both are given. */
  state?: ConversationState;
  /** Overrides the default wording per state. */
  stateLabels?: Partial<Record<ConversationState, string>>;
}

/**
 * A polite live region for conversation state.
 *
 * This is where "generating response" and "response complete" belong. Putting
 * the response *text* here instead is the mistake this component exists to
 * prevent.
 */
export function ConversationStatus({
  className,
  children,
  state,
  stateLabels,
  ...props
}: ConversationStatusProps) {
  // Only the text changes with `state`: the region itself stays mounted from
  // first paint, because a live region announces nothing until it exists.
  const worded =
    state === undefined ? undefined : (stateLabels?.[state] ?? STATE_LABELS[state]);
  return (
    <div
      data-slot="conversation-status"
      role="status"
      aria-live="polite"
      className={cn("px-4 text-xs text-muted-foreground", className)}
      {...props}
    >
      {children ?? worded}
    </div>
  );
}

export interface ConversationScrollButtonProps extends ComponentPropsWithRef<"button"> {
  label?: string;
}

const PREFIX = "dowel-ai-conversation";

/* The pill rises in and sinks out. Exits are one step faster than entrances
 * (ADR 0004), and both run through --motion-scale, so under reduced motion the
 * exit still ends — which is what unmounts the button. */
const STYLES = `
@keyframes ${PREFIX}-pill-in{from{opacity:0;translate:0 8px;scale:.96}}
@keyframes ${PREFIX}-pill-out{to{opacity:0;translate:0 8px;scale:.96}}
[data-slot=conversation-scroll-button][data-state=open]{animation:${PREFIX}-pill-in calc(250ms * var(--motion-scale,1)) var(--ease-out-quint) both}
[data-slot=conversation-scroll-button][data-state=closed]{animation:${PREFIX}-pill-out calc(130ms * var(--motion-scale,1)) var(--ease-in-quint) both;pointer-events:none}
`;

/** Unmounts a closing pill even if its exit animation never reports ending. */
const EXIT_FALLBACK_MS = 400;

type PillPhase = "hidden" | "open" | "closing";

/**
 * Returns the reader to the newest message.
 *
 * Rendered only when they have scrolled away, and removed from the DOM
 * otherwise so it is never a focus stop pointing at where the reader already
 * is. While it plays its exit it is `inert` and `aria-hidden`: already gone as
 * far as focus, clicks and assistive technology are concerned.
 */
export function ConversationScrollButton({
  className,
  label = "Jump to latest",
  ref,
  ...props
}: ConversationScrollButtonProps) {
  const { atBottom, scrollToBottom } = useConversation("ConversationScrollButton");
  const [phase, setPhase] = useState<PillPhase>(atBottom ? "hidden" : "open");
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Adjusted during render rather than in an effect, so the pill never paints
  // a frame in the wrong state.
  if (!atBottom && phase !== "open") setPhase("open");
  if (atBottom && phase === "open") setPhase("closing");

  // A native listener rather than onAnimationEnd: React picks a vendor-prefixed
  // event name wherever AnimationEvent is missing, and would never hear it.
  useEffect(() => {
    if (phase !== "closing") return;
    const button = buttonRef.current;
    const finish = (event?: Event) => {
      if (event && event.target !== button) return;
      setPhase("hidden");
    };
    const timer = setTimeout(finish, EXIT_FALLBACK_MS);
    button?.addEventListener("animationend", finish);
    return () => {
      clearTimeout(timer);
      button?.removeEventListener("animationend", finish);
    };
  }, [phase]);

  if (phase === "hidden") return null;
  const closing = phase === "closing";

  return (
    <>
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <button
        type="button"
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-slot="conversation-scroll-button"
        data-state={closing ? "closed" : "open"}
        inert={closing || undefined}
        aria-hidden={closing || undefined}
        tabIndex={closing ? -1 : undefined}
        onClick={() => {
          scrollToBottom();
        }}
        className={cn(
          "absolute inset-x-0 bottom-3 z-[var(--z-sticky)] mx-auto flex w-fit items-center gap-1.5",
          "rounded-full border border-border bg-popover px-3 py-1.5 text-xs font-medium shadow-md",
          "transition-colors duration-[var(--duration-fast)] hover:bg-accent",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
          className,
        )}
        {...props}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3.5">
          <path
            d="M12 5v14m0 0-6-6m6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
    </>
  );
}
