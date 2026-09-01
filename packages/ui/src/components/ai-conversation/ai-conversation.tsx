"use client";

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
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
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

export interface ConversationStatusProps extends ComponentPropsWithRef<"div"> {
  /** Announced politely when it changes. Keep it short: state, never content. */
  children?: ReactNode;
}

/**
 * A polite live region for conversation state.
 *
 * This is where "generating response" and "response complete" belong. Putting
 * the response *text* here instead is the mistake this component exists to
 * prevent.
 */
export function ConversationStatus({ className, children, ...props }: ConversationStatusProps) {
  return (
    <div
      data-slot="conversation-status"
      role="status"
      aria-live="polite"
      className={cn("px-4 text-xs text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ConversationScrollButtonProps extends ComponentPropsWithRef<"button"> {
  label?: string;
}

/**
 * Returns the reader to the newest message.
 *
 * Rendered only when they have scrolled away, and removed from the DOM
 * otherwise so it is never a focus stop pointing at where the reader already
 * is.
 */
export function ConversationScrollButton({
  className,
  label = "Jump to latest",
  ...props
}: ConversationScrollButtonProps) {
  const { atBottom, scrollToBottom } = useConversation("ConversationScrollButton");
  if (atBottom) return null;

  return (
    <button
      type="button"
      data-slot="conversation-scroll-button"
      onClick={() => {
        scrollToBottom();
      }}
      className={cn(
        "absolute bottom-3 left-1/2 z-[var(--z-sticky)] flex -translate-x-1/2 items-center gap-1.5",
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
  );
}
