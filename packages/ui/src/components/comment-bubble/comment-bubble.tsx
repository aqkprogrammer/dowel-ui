"use client";

// Ported from SmoothUI Figma Comment (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A canvas comment pin: an avatar in a speech-bubble corner that grows into
 * the thread (and, with `onReply`, a composer). The source sprang width and
 * height with motion; here the thread is measured and the bubble's size is a
 * CSS transition, with the text blurring in just after the bubble opens.
 *
 * The avatar is a disclosure button. Escape collapses the thread and returns
 * focus to it; a press outside collapses it too.
 */

export interface CommentBubbleAuthor {
  name: string;
  /** Avatar image URL. Initials are shown without one, or while it loads. */
  avatarUrl?: string;
}

export interface CommentBubbleComment {
  id: string;
  author: CommentBubbleAuthor;
  message: string;
  /** Pre-formatted, e.g. "Just now" or "2h". */
  timestamp?: string;
}

export interface CommentBubbleProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The thread. The first comment's author is the pin's avatar. */
  comments: CommentBubbleComment[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The expanded bubble's width. Numbers are pixels. */
  width?: number | string;
  /** Shows a reply composer; called with the trimmed reply. */
  onReply?: (message: string) => void;
  /** The reply field's accessible name and placeholder. */
  replyLabel?: string;
}

const COLLAPSED = 32;

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Face({ author }: { author: CommentBubbleAuthor }) {
  return (
    <Avatar size="xs" className="size-6">
      {author.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-[0.625rem]">{initials(author.name)}</AvatarFallback>
    </Avatar>
  );
}

/** An avatar pin that expands into a comment thread. */
export function CommentBubble({
  className,
  comments,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  width = "11.25rem",
  onReply,
  replyLabel = "Reply",
  ...props
}: CommentBubbleProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const [height, setHeight] = useState<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const replyRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const threadId = useId();
  const first = comments[0];

  function setOpen(next: boolean, restore = false) {
    restoreFocus.current = restore;
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  }

  useLayoutEffect(() => {
    const element = threadRef.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight || null);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      replyRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!bubbleRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false, true);
    }
  }

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = replyRef.current!;
    const message = field.value.trim();
    if (!message) return;
    onReply?.(message);
    field.value = "";
  }

  if (!first) return null;
  const state = open ? "open" : "closed";
  const extra = comments.length - 1;

  return (
    <div
      data-slot="comment-bubble"
      data-state={state}
      className={cn("relative size-8", className)}
      {...props}
    >
      {/* Escape bubbles up from the thread's controls; the surface itself is not a control. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={bubbleRef}
        data-slot="comment-bubble-surface"
        data-state={state}
        onKeyDown={handleKeyDown}
        className={cn(
          "absolute start-0 bottom-0 overflow-hidden rounded-2xl rounded-es-none bg-popover text-popover-foreground shadow-lg ring-1 ring-border",
          "transition-[width,height] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
          "data-[state=closed]:delay-[var(--duration-instant)]",
        )}
        style={{
          width: open ? width : COLLAPSED,
          height: open ? (height ?? "auto") : COLLAPSED,
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          data-slot="comment-bubble-trigger"
          data-state={state}
          aria-expanded={open}
          aria-controls={threadId}
          aria-label={`Comment by ${first.author.name}${extra > 0 ? `, ${String(extra)} ${extra === 1 ? "reply" : "replies"}` : ""}`}
          onClick={() => setOpen(!open)}
          className={cn(
            "absolute start-1 top-1 z-10 rounded-full",
            "transition-[top,inset-inline-start] duration-[var(--duration-slow)] ease-[var(--ease-overshoot)]",
            "data-[state=open]:start-3 data-[state=open]:top-3",
            focusRing,
          )}
        >
          <Face author={first.author} />
        </button>
        <div
          ref={threadRef}
          id={threadId}
          role="group"
          aria-label={`Comment thread by ${first.author.name}`}
          data-slot="comment-bubble-thread"
          data-state={state}
          inert={!open}
          className={cn(
            "absolute start-0 top-0 flex flex-col gap-2 py-3 ps-11 pe-4 text-[0.6875rem] leading-4 font-medium",
            "transition-[opacity,filter,visibility] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            "data-[state=open]:delay-[var(--duration-fast)]",
            "data-[state=closed]:invisible data-[state=closed]:opacity-0 data-[state=closed]:blur-[3px]",
          )}
          style={{ width }}
        >
          <ol className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {comments.map((comment, index) => (
              <li key={comment.id} className="flex gap-2">
                {index > 0 ? (
                  <span className="-ms-8 shrink-0">
                    <Face author={comment.author} />
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="flex flex-wrap gap-x-1">
                    <span className="font-semibold text-foreground">{comment.author.name}</span>
                    {comment.timestamp ? (
                      <span className="text-muted-foreground">{comment.timestamp}</span>
                    ) : null}
                  </p>
                  <p className="text-foreground">{comment.message}</p>
                </div>
              </li>
            ))}
          </ol>
          {onReply ? (
            <form onSubmit={handleReply} className="flex items-center gap-1">
              <input
                ref={replyRef}
                type="text"
                aria-label={replyLabel}
                placeholder={`${replyLabel}…`}
                className={cn(
                  "min-w-0 flex-1 rounded-md bg-muted px-2 py-1 text-foreground placeholder:text-muted-foreground",
                  focusRing,
                )}
              />
              <button
                type="submit"
                aria-label="Send reply"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  focusRing,
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="size-3"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
