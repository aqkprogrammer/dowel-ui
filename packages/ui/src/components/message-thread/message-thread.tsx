"use client";

// Original design.
import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FormEvent,
} from "react";

import { disabledStyles, focusRing, focusRingInset } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A compact chat thread: incoming bubbles on the start side, outgoing on the
 * end side, an optional typing indicator, and a message field with a round
 * send button.
 *
 * Sending. The new bubble lifts out of the field into the thread: its row
 * opens from zero height (so every older message glides up instead of
 * jumping) while the bubble itself rises from the field, scaling up from
 * its end corner. Incoming bubbles open the same way but pop from their
 * start corner. Only messages that arrive after first render animate. The
 * thread fades out at the top so older messages slip away under the edge.
 * All of it is hoisted keyframes on --motion-scale; under reduced motion
 * messages simply appear and the typing dots sit still.
 *
 * State. `messages` / `defaultMessages` hold the thread, and `onSend`
 * reports what was sent: uncontrolled, the thread appends it for you;
 * controlled, you append it. The draft is controllable too (`value` /
 * `defaultValue` / `onValueChange`), which is how a demo types into it.
 *
 * Accessibility: the thread is role="log" (polite, additions only), named
 * "Messages", focusable so it can be scrolled from the keyboard. Each
 * bubble starts with visually hidden "You:" or "<contactName>:", so who
 * said what does not depend on colour or side. The typing indicator says
 * "<contactName> is typing" in words. The field is labelled by its
 * placeholder text and submits on Enter; the send button is named "Send"
 * and is disabled while the field is empty.
 */

export interface ThreadMessage {
  id: string;
  text: string;
  /** Who sent it: the viewer ("me") or the other person ("them"). */
  from: "me" | "them";
}

const PREFIX = "dowel-message-thread";

/** A duration on the motion scale. */
function scaled(ms: number): string {
  return `calc(${String(ms)}ms * var(--motion-scale, 1))`;
}

const STYLES = `
.${PREFIX} [data-part=row][data-new]{display:grid;animation:${PREFIX}-open ${scaled(420)} var(--ease-out-quint) both}
.${PREFIX} [data-part=row][data-new]>*{min-height:0}
.${PREFIX} [data-part=row][data-new][data-from=me] [data-part=bubble]{transform-origin:100% 100%;animation:${PREFIX}-lift ${scaled(520)} var(--ease-overshoot) both}
.${PREFIX}:dir(rtl) [data-part=row][data-new][data-from=me] [data-part=bubble]{transform-origin:0 100%}
.${PREFIX} [data-part=row][data-new][data-from=them] [data-part=bubble]{transform-origin:0 100%;animation:${PREFIX}-pop ${scaled(420)} var(--ease-overshoot) both}
.${PREFIX}:dir(rtl) [data-part=row][data-new][data-from=them] [data-part=bubble]{transform-origin:100% 100%}
.${PREFIX} [data-part=dot]{animation:${PREFIX}-dot ${scaled(1100)} var(--ease-in-out-quint) infinite;animation-delay:var(--delay)}
@keyframes ${PREFIX}-open{from{grid-template-rows:0fr}to{grid-template-rows:1fr}}
@keyframes ${PREFIX}-lift{0%{opacity:0;transform:translateY(2.75em) scale(.86)}35%{opacity:1}100%{opacity:1;transform:none}}
@keyframes ${PREFIX}-pop{0%{opacity:0;transform:scale(.7)}100%{opacity:1;transform:none}}
@keyframes ${PREFIX}-dot{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-.25em)}}
`;

const messageThreadVariants = cva(
  cn(
    PREFIX,
    "flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5 text-card-foreground",
  ),
  {
    variants: {
      size: {
        sm: "w-56 text-2xs [&_[data-part=thread]]:h-36",
        md: "w-72 text-xs [&_[data-part=thread]]:h-48",
        lg: "w-96 text-sm [&_[data-part=thread]]:h-64",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[55%]"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

export interface MessageThreadProps
  extends
    Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue" | "onChange">,
    VariantProps<typeof messageThreadVariants> {
  /** Controlled thread, oldest first. Append the sent message yourself in `onSend`. */
  messages?: ThreadMessage[];
  /** Initial thread when uncontrolled. Sent messages are appended for you. */
  defaultMessages?: ThreadMessage[];
  onMessagesChange?: (messages: ThreadMessage[]) => void;
  /** Called with the trimmed text when the viewer sends. */
  onSend?: (text: string) => void;
  /** Controlled draft. */
  value?: string;
  /** Initial draft when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Show the other person typing. */
  typing?: boolean;
  /** The other person's name, announced before their messages. */
  contactName?: string;
  /** Placeholder and accessible name of the field. */
  placeholder?: string;
  /** Accessible name of the send button. */
  sendLabel?: string;
  /** Accessible name of the thread. */
  threadLabel?: string;
  disabled?: boolean;
}

/** A compact chat thread whose sent bubbles lift out of the field as older ones slide up. */
export function MessageThread({
  className,
  messages: messagesProp,
  defaultMessages = [],
  onMessagesChange,
  onSend,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  typing = false,
  contactName = "Them",
  placeholder = "Message",
  sendLabel = "Send",
  threadLabel = "Messages",
  disabled = false,
  size,
  ...props
}: MessageThreadProps) {
  const [uncontrolledMessages, setUncontrolledMessages] = useState(defaultMessages);
  const messages = messagesProp ?? uncontrolledMessages;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;

  // Messages present on first render never animate; anything after does.
  const [initial] = useState(() => new Set(messages.map((message) => message.id)));
  const idBase = useId();
  const sent = useRef(0);
  const thread = useRef<HTMLDivElement>(null);

  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    const element = thread.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastId, typing]);

  function setValue(next: string) {
    if (valueProp === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    if (messagesProp === undefined) {
      sent.current += 1;
      const next = [
        ...messages,
        { id: `${idBase}-${String(sent.current)}`, text, from: "me" as const },
      ];
      setUncontrolledMessages(next);
      onMessagesChange?.(next);
    }
    setValue("");
  }

  return (
    <div
      data-slot="message-thread"
      className={cn(messageThreadVariants({ size }), className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div
        ref={thread}
        role="log"
        aria-label={threadLabel}
        // Focusable so the history can be scrolled from the keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        data-part="thread"
        className={cn(
          "flex [scrollbar-width:none] flex-col gap-1.5 overflow-y-auto rounded-lg",
          "[mask-image:linear-gradient(to_bottom,transparent,var(--color-foreground)_2rem)]",
          focusRingInset,
        )}
      >
        <div aria-hidden="true" className="mt-auto" />
        {messages.map((message) => {
          const mine = message.from === "me";
          return (
            <div
              key={message.id}
              data-part="row"
              data-from={message.from}
              data-new={initial.has(message.id) ? undefined : ""}
              className="flex shrink-0 flex-col"
            >
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <p
                  data-part="bubble"
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-1.5 leading-snug font-medium break-words",
                    mine
                      ? "rounded-ee-md bg-foreground text-background"
                      : "rounded-es-md bg-muted text-foreground",
                  )}
                >
                  <span className="sr-only">{mine ? "You: " : `${contactName}: `}</span>
                  {message.text}
                </p>
              </div>
            </div>
          );
        })}
        {typing ? (
          <div
            data-part="row"
            data-from="them"
            data-new=""
            data-slot="message-thread-typing"
            className="flex shrink-0 flex-col"
          >
            <div className="flex justify-start">
              <p
                data-part="bubble"
                className="flex items-center gap-[0.3em] rounded-2xl rounded-es-md bg-muted px-3 py-2.5"
              >
                <span className="sr-only">{`${contactName} is typing`}</span>
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    data-part="dot"
                    aria-hidden="true"
                    className="size-[0.45em] rounded-full bg-muted-foreground"
                    style={{ "--delay": scaled(dot * 160) } as CSSProperties}
                  />
                ))}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <form
        data-slot="message-thread-form"
        className={cn(
          "flex h-[2.75em] items-center gap-2 rounded-full bg-muted ps-3.5 pe-1",
          "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring/55",
        )}
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-55"
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="submit"
          aria-label={sendLabel}
          disabled={disabled || value.trim() === ""}
          className={cn(
            "grid size-[2.25em] shrink-0 place-items-center rounded-full bg-foreground text-background",
            "transition-[opacity,scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)] active:scale-90",
            focusRing,
            disabledStyles,
          )}
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

export { messageThreadVariants };
