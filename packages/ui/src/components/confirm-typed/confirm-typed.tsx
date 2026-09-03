"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

/**
 * Type the name to confirm.
 *
 * The GitHub pattern for deleting a repository, and the one every product
 * copies for the action that cannot be undone: the name of the thing has to
 * pass through the reader's fingers before the button works. Trivial to
 * build, absent from every component library, and usually built wrong in
 * the one place it matters — what happens when the text does not match.
 * The common version disables the button and says nothing, so a keyboard
 * or screen reader user presses it, or presses Enter, and nothing happens
 * at all.
 *
 * Here a mismatch is a thing that is said. The button stays reachable and
 * pressing it, or Enter, before the text matches announces what was
 * expected and marks the field invalid. The moment the text matches, that
 * is announced too, once, so a reader knows the action has become
 * available without watching the button change colour.
 *
 * Pasting is allowed. Blocking it is a popular piece of friction, and it
 * punishes exactly the people who cannot type a long name easily — switch
 * users, voice users, anyone with a tremor — while stopping nobody who can
 * select-all and copy. The name is on screen either way; the point is that
 * it passed through the reader's attention, not their keyboard.
 */

export interface ConfirmTypedProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The text that must be typed, exactly. */
  expected: string;
  /** What confirming does, as the button reads: "Delete project". */
  action: string;
  onConfirm: () => void;
  /** While the action runs. The button stays focusable and says so. */
  pending?: boolean;
  /** Match regardless of case. Off by default: a name is a name. */
  caseSensitive?: boolean;
  variant?: "destructive" | "primary";
  /** The typed text. Controlled, if you want it. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** The consequence, in a sentence or two, before the field. */
  children?: ReactNode;
}

export function ConfirmTyped({
  className,
  expected,
  action,
  onConfirm,
  pending = false,
  caseSensitive = true,
  variant = "destructive",
  value: valueProp,
  onValueChange,
  children,
  ...props
}: ConfirmTypedProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uncontrolled, setUncontrolled] = useState("");
  const value = valueProp ?? uncontrolled;

  const [attempted, setAttempted] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Surrounding whitespace never decides it: a trailing space is not a
  // different name, and a reader cannot see it to know why it failed.
  const normalise = (text: string) => (caseSensitive ? text.trim() : text.trim().toLowerCase());
  const matched = value.length > 0 && normalise(value) === normalise(expected);

  // Announce the match once, on the transition. Adjusted during render so the
  // announcement lands in the same commit as the state it describes.
  const [wasMatched, setWasMatched] = useState(matched);
  if (wasMatched !== matched) {
    setWasMatched(matched);
    if (matched) {
      setAnnouncement(`Matches. ${action} is available.`);
      setAttempted(false);
    }
  }

  const setValue = (next: string) => {
    setUncontrolled(next);
    onValueChange?.(next);
  };

  const attempt = () => {
    if (pending) return;
    if (matched) {
      onConfirm();
      return;
    }
    // Said, not swallowed. A press that does nothing tells a keyboard user
    // nothing; this one tells them what was expected.
    setAttempted(true);
    setAnnouncement(`Does not match. Type ${expected} exactly.`);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    attempt();
  };

  const mismatch = attempted && !matched;
  const hint = matched
    ? "Matches."
    : mismatch
      ? `Does not match. Type ${expected} exactly.`
      : caseSensitive
        ? "Type it exactly as shown."
        : "Type it as shown. Case does not matter.";

  return (
    <div
      data-slot="confirm-typed"
      data-state={matched ? "matched" : mismatch ? "mismatched" : "idle"}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}

      <label htmlFor={`${id}-input`} className="text-sm">
        To confirm, type{" "}
        <strong className="rounded bg-muted px-1 py-0.5 font-mono text-xs font-medium select-all">
          {expected}
        </strong>
      </label>

      <Input
        ref={inputRef}
        id={`${id}-input`}
        value={value}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-describedby={`${id}-hint`}
        aria-invalid={mismatch || undefined}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={onKeyDown}
      />

      <p
        id={`${id}-hint`}
        data-slot="confirm-typed-hint"
        className={cn(
          "text-xs",
          mismatch ? "text-destructive" : matched ? "text-success" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>

      {/* Present from the first render, so the first announcement is heard. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <Button
        variant={variant}
        loading={pending}
        data-ready={matched || undefined}
        aria-describedby={matched ? undefined : `${id}-hint`}
        // Dimmed rather than disabled while the text does not match: it stays
        // reachable, and pressing it says why nothing happened.
        className={cn("self-start", !matched && !pending && "opacity-55")}
        onClick={attempt}
      >
        {pending ? `${action}…` : action}
      </Button>
    </div>
  );
}
