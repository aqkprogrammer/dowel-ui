"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

/**
 * One turn in a conversation.
 *
 * The role is stated in text, not only in layout. Alignment and colour are how
 * a sighted reader tells a question from an answer; a screen reader user gets
 * nothing from either, so every message carries a visually hidden label naming
 * who is speaking.
 */

const messageVariants = cva("group/message flex w-full gap-3", {
  variants: {
    role: {
      user: "flex-row-reverse",
      assistant: "flex-row",
      system: "flex-row",
    },
  },
  defaultVariants: {
    role: "assistant",
  },
});

const messageBodyVariants = cva("min-w-0 rounded-xl px-4 py-3 text-sm", {
  variants: {
    role: {
      user: "max-w-[85%] bg-primary text-primary-foreground",
      assistant: "w-full bg-transparent px-0 py-0 text-foreground",
      system:
        "w-full border border-dashed border-border bg-muted/40 text-xs text-muted-foreground",
    },
  },
  defaultVariants: {
    role: "assistant",
  },
});

export type MessageRole = "user" | "assistant" | "system";

export interface MessageProps
  extends ComponentPropsWithRef<"li">, Omit<VariantProps<typeof messageVariants>, "role"> {
  /**
   * Who is speaking.
   *
   * Named `from` rather than `role` on purpose. `role` is a global HTML
   * attribute, and a component prop that shadows it cannot be told apart from
   * the real thing by static analysis — every consumer's accessibility linter
   * would flag ordinary usage of this component. The values are still the
   * familiar conversation roles.
   */
  from?: MessageRole;
  /** Overrides the visually hidden speaker label. */
  fromLabel?: string;
}

const DEFAULT_ROLE_LABELS: Record<MessageRole, string> = {
  user: "You said",
  assistant: "Assistant said",
  system: "System",
};

export function Message({
  className,
  from = "assistant",
  fromLabel,
  children,
  ...props
}: MessageProps) {
  return (
    <li
      data-slot="message"
      data-from={from}
      className={cn(messageVariants({ role: from }), className)}
      {...props}
    >
      {/* Names the speaker for anyone who cannot see the layout. */}
      <span className="sr-only">{fromLabel ?? DEFAULT_ROLE_LABELS[from]}:</span>
      {children}
    </li>
  );
}

export interface MessageBodyProps
  extends ComponentPropsWithRef<"div">, Omit<VariantProps<typeof messageBodyVariants>, "role"> {
  /** Who is speaking. See the note on MessageProps for why not `role`. */
  from?: MessageRole;
}

export function MessageBody({ className, from = "assistant", ...props }: MessageBodyProps) {
  return (
    <div
      data-slot="message-body"
      className={cn(messageBodyVariants({ role: from }), className)}
      {...props}
    />
  );
}

export interface MessageAvatarProps extends ComponentPropsWithRef<"div"> {
  asChild?: boolean;
}

/** Decorative: the speaker is already named by the hidden label on Message. */
export function MessageAvatar({ className, asChild, ...props }: MessageAvatarProps) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="message-avatar"
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border border-border bg-muted",
        "text-xs font-medium text-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Per-message controls: copy, regenerate, feedback.
 *
 * Revealed on hover for pointer users but always present in the DOM and in the
 * tab order — hiding controls behind hover makes them unreachable by keyboard
 * and invisible on touch.
 */
export function MessageActions({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="message-actions"
      className={cn(
        "mt-1.5 flex items-center gap-1",
        "opacity-0 transition-opacity duration-[var(--duration-fast)]",
        "group-focus-within/message:opacity-100 group-hover/message:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/** Attachments, citations and other content that hangs off a message. */
export function MessageFooter({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn("mt-2 flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

export { messageBodyVariants, messageVariants };
