"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { formatMemoryDate, isoTime, type Memory } from "./memory-model";

/*
 * One memory, and the notice that stands in for it while it can still be
 * brought back. Internal: the inspector owns the order, the undo window and
 * where focus goes between rows; a row only owns its own editor.
 */

const actionClass = "h-7 px-2 text-xs";

export interface MemoryItemProps {
  memory: Memory;
  /** Whether to say which scope it belongs to. Not when the list is grouped by it. */
  showScope: boolean;
  formatTime?: (ms: number) => string;
  onEdit?: (id: string, text: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
  /** `viaKeyboard` decides whether the undo window waits while Undo has focus. */
  onForget?: (memory: Memory, viaKeyboard: boolean) => void;
}

/** "Added 12 Sep 2026", or nothing when the formatter has nothing to say. */
function when(label: string, ms: number | undefined, format: (ms: number) => string) {
  if (ms === undefined) return null;
  const text = format(ms);
  if (!text) return null;
  return (
    <span>
      {label} <time dateTime={isoTime(ms)}>{text}</time>
    </span>
  );
}

export function MemoryItem({
  memory,
  showScope,
  formatTime,
  onEdit,
  onPin,
  onForget,
}: MemoryItemProps) {
  const id = useId();
  const textId = `${id}-text`;
  const fieldId = `${id}-field`;
  const errorId = `${id}-error`;
  const [draft, setDraft] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const editRef = useRef<HTMLButtonElement | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const focusNext = useRef<"field" | "edit" | null>(null);
  const editing = draft !== null;

  // Focus follows the editor in and out: into the field when it opens, back to
  // Edit when it closes, so the person carries on from where they started.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "edit") editRef.current?.focus();
    if (target === "field" && fieldRef.current) {
      const field = fieldRef.current;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }, [editing]);

  function open() {
    focusNext.current = "field";
    setDraft(memory.text);
  }

  function close() {
    focusNext.current = "edit";
    setDraft(null);
    setEmpty(false);
  }

  function save() {
    if (draft === null) return;
    const text = draft.trim();
    if (text === "") {
      // An empty memory is not an edit. Say so where the person is typing,
      // rather than quietly saving nothing or forgetting it for them.
      setEmpty(true);
      fieldRef.current?.focus();
      return;
    }
    if (text !== memory.text) onEdit?.(memory.id, text);
    close();
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    }
  }

  const details: { key: string; node: ReactNode }[] = [];
  if (memory.pinned) {
    details.push({
      key: "pinned",
      node: (
        <Badge variant="secondary" size="sm">
          Pinned
        </Badge>
      ),
    });
  }
  if (showScope && memory.scope) {
    details.push({
      key: "scope",
      node: (
        <Badge variant="outline" size="sm">
          {memory.scope}
        </Badge>
      ),
    });
  }
  if (memory.source) {
    const { label, href } = memory.source;
    details.push({
      key: "source",
      node: (
        <span data-slot="memory-inspector-source">
          From{" "}
          {href ? (
            <a
              href={href}
              className={cn(
                "rounded-sm text-foreground underline underline-offset-2 hover:text-primary",
                focusRing,
              )}
            >
              {label}
            </a>
          ) : (
            label
          )}
        </span>
      ),
    });
  }
  const format = formatTime ?? formatMemoryDate;
  const created = when("Added", memory.createdAt, format);
  if (created) details.push({ key: "created", node: created });
  const used = when("Last used", memory.lastUsedAt, format);
  if (used) details.push({ key: "used", node: used });

  const hasActions = Boolean(onEdit ?? onPin ?? onForget);

  return (
    <li
      data-slot="memory-inspector-item"
      data-memory-id={memory.id}
      data-pinned={memory.pinned || undefined}
      data-state={editing ? "editing" : "idle"}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-border p-3",
        memory.pinned && "bg-muted/40",
      )}
    >
      {editing ? (
        <form
          data-slot="memory-inspector-editor"
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label htmlFor={fieldId} className="sr-only">
            Memory
          </label>
          <Textarea
            ref={fieldRef}
            id={fieldId}
            value={draft}
            rows={2}
            autoResize
            aria-invalid={empty || undefined}
            aria-describedby={empty ? errorId : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              if (event.target.value.trim() !== "") setEmpty(false);
            }}
            onKeyDown={handleFieldKeyDown}
          />
          {empty ? (
            <p id={errorId} className="text-xs text-destructive">
              A memory can&apos;t be empty. To remove it, use Forget.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <Button type="submit" size="sm" className={actionClass}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={actionClass}
              onClick={close}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p id={textId} data-slot="memory-inspector-text" className="text-foreground">
          {memory.text}
        </p>
      )}

      {details.length > 0 ? (
        <p
          data-slot="memory-inspector-details"
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
        >
          {details.map((detail, index) => (
            <span key={detail.key} className="inline-flex items-center gap-x-1.5">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              {detail.node}
            </span>
          ))}
        </p>
      ) : null}

      {/* Named by the memory, so "Edit" is never an edit of nothing in
          particular: moving into the group reads which memory it acts on. */}
      {!editing && hasActions ? (
        <div
          role="group"
          aria-labelledby={textId}
          data-slot="memory-inspector-actions"
          className="-ms-2 flex flex-wrap gap-0.5"
        >
          {onEdit ? (
            <Button
              ref={editRef}
              variant="ghost"
              size="sm"
              data-slot="memory-inspector-edit"
              className={actionClass}
              onClick={open}
            >
              Edit
            </Button>
          ) : null}
          {onPin ? (
            <Button
              variant="ghost"
              size="sm"
              data-slot="memory-inspector-pin"
              aria-pressed={Boolean(memory.pinned)}
              className={cn(
                actionClass,
                "aria-pressed:bg-accent aria-pressed:text-accent-foreground",
              )}
              onClick={() => {
                onPin(memory.id, !memory.pinned);
              }}
            >
              Pin
            </Button>
          ) : null}
          {onForget ? (
            <Button
              variant="ghost"
              size="sm"
              data-slot="memory-inspector-forget"
              className={cn(actionClass, "text-destructive hover:text-destructive")}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                // A click with no pointer behind it came from Enter or Space.
                onForget(memory, event.detail === 0);
              }}
            >
              Forget
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export interface MemoryNoticeProps {
  message: string;
  onUndo: () => void;
  /** Holds the undo window open while the person is on Undo. */
  onHold: (reason: "focus" | "pointer") => void;
  onRelease: (reason: "focus" | "pointer") => void;
}

/** "Forgot “…” · Undo". The wrapper, a row or a line, is the caller's. */
export function MemoryNotice({ message, onUndo, onHold, onRelease }: MemoryNoticeProps) {
  const messageId = useId();
  return (
    <>
      <span id={messageId}>{message}</span>
      <span aria-hidden="true">·</span>
      <Button
        variant="link"
        size="sm"
        data-slot="memory-inspector-undo"
        aria-describedby={messageId}
        className="h-auto text-sm"
        onClick={onUndo}
        onFocus={() => {
          onHold("focus");
        }}
        onBlur={() => {
          onRelease("focus");
        }}
        onPointerEnter={() => {
          onHold("pointer");
        }}
        onPointerLeave={() => {
          onRelease("pointer");
        }}
      >
        Undo
      </Button>
    </>
  );
}
