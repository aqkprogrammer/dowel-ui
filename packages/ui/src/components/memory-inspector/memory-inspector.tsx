"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { MemoryItem, MemoryNotice } from "./memory-item";
import {
  countMemories,
  describeMemoryCount,
  groupMemories,
  matchesMemory,
  quoteMemory,
  sortMemories,
  type Memory,
} from "./memory-model";
import { UndoWindows, type UndoHold } from "./undo-window";

// Installed, this file is what `@/components/ui/memory-inspector` resolves to,
// so it exports everything the folder's index does.
export {
  UNSCOPED_LABEL,
  countMemories,
  describeMemoryCount,
  formatMemoryDate,
  groupMemories,
  isoTime,
  matchesMemory,
  quoteMemory,
  sortMemories,
  type Memory,
  type MemoryGroup,
  type MemorySource,
} from "./memory-model";

/**
 * What an assistant remembers about the person, and control over it.
 *
 * A memory the person cannot see is one they cannot correct, and one they
 * cannot remove is one they stop trusting the assistant with. This lists every
 * memory with where it came from and when, and lets the person search, edit,
 * pin and forget them.
 *
 * Forgetting is immediate on screen and delayed in fact: the memory is hidden
 * at once and `onForget` is called when the undo window closes, so Undo never
 * has to ask the application to put something back. If the inspector unmounts
 * while a window is open, the forget goes through — the person asked for it,
 * and navigating away is not changing their mind.
 *
 * Controlled: it calls back and the application changes `memories`.
 */

const memoryInspectorVariants = cva("flex flex-col gap-3 text-sm", {
  variants: {
    variant: {
      /** Its own bordered panel. */
      card: "rounded-lg border border-border bg-card p-4 text-card-foreground",
      /** No chrome, for a settings page that already has its own. */
      plain: "",
    },
  },
  defaultVariants: { variant: "card" },
});

/** How long the result count waits for typing to stop before it is announced. */
const ANNOUNCE_AFTER_MS = 500;

export interface MemoryInspectorProps
  extends
    Omit<ComponentPropsWithRef<"section">, "children">,
    VariantProps<typeof memoryInspectorVariants> {
  memories: Memory[];
  /** Receives the new text, trimmed. Without it there is no Edit. */
  onEdit?: (id: string, text: string) => void;
  /**
   * Receives the ids once the undo window has closed, or at once when
   * `forgetDelayMs` is 0. Without it there is no Forget.
   */
  onForget?: (ids: string[]) => void;
  /** Without it there is no Pin. */
  onPin?: (id: string, pinned: boolean) => void;
  /**
   * How long Undo stays available, in milliseconds. It waits while keyboard
   * focus or the pointer is on Undo. 0 forgets at once, with no Undo.
   */
  forgetDelayMs?: number;
  /** Who is remembering, as it starts a sentence: "Claude remembers 12 things". */
  agentName?: string;
  /** Shows memories with no Edit, Pin or Forget. */
  readOnly?: boolean;
  /** Lists memories under a heading for each scope. */
  groupBy?: "scope";
  /**
   * Formats when a memory was added and last used. By default it is the date
   * in UTC, which the server and the browser agree on. A local or relative
   * time is where they disagree and hydration breaks, so a formatter that
   * reads the clock or the locale belongs on a client-only render.
   */
  formatTime?: (ms: number) => string;
}

/** A forget that has not happened yet. */
interface Pending {
  key: string;
  ids: string[];
  message: string;
  restored: string;
  /** Stands in the list where the memory was, rather than above it. */
  inPlace: boolean;
}

type FocusRequest =
  | { to: "undo"; key: string }
  | { to: "memory"; id: string; part: "first" | "pin" | "forget" }
  | { to: "forget-all" }
  | { to: "keep" }
  | { to: "start" };

function rowOf(root: HTMLElement, id: string): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>("[data-memory-id]")].find(
    (row) => row.dataset.memoryId === id,
  );
}

/** The memory after `from` in the list, else the one before it. */
function neighbour(root: HTMLElement, from: Element): string | undefined {
  const rows = [
    ...root.querySelectorAll<HTMLElement>(
      "[data-slot=memory-inspector-item], [data-slot=memory-inspector-notice]",
    ),
  ];
  const index = rows.indexOf(from as HTMLElement);
  const isMemory = (row: HTMLElement) => row.dataset.slot === "memory-inspector-item";
  const next =
    rows.slice(index + 1).find(isMemory) ?? rows.slice(0, index).reverse().find(isMemory);
  return next?.dataset.memoryId;
}

function focusWithin(root: HTMLElement, request: FocusRequest) {
  let target: HTMLElement | null | undefined;
  if (request.to === "undo") {
    target = root.querySelector<HTMLElement>(
      `[data-pending-key="${request.key}"] [data-slot=memory-inspector-undo]`,
    );
  } else if (request.to === "memory") {
    const row = rowOf(root, request.id);
    target =
      request.part === "first"
        ? row?.querySelector<HTMLElement>("[data-slot=memory-inspector-actions] button")
        : row?.querySelector<HTMLElement>(`[data-slot=memory-inspector-${request.part}]`);
  } else if (request.to === "forget-all") {
    target = root.querySelector<HTMLElement>("[data-slot=memory-inspector-forget-all]");
  } else if (request.to === "keep") {
    target = root.querySelector<HTMLElement>("[data-slot=memory-inspector-keep]");
  }
  // When the thing asked for has gone, the start of the inspector is the one
  // place that is always there.
  target ??=
    root.querySelector<HTMLElement>("[data-slot=memory-inspector-search]") ??
    root.querySelector<HTMLElement>("[data-slot=memory-inspector-heading]");
  target?.focus();
}

export function MemoryInspector({
  className,
  variant,
  memories,
  onEdit,
  onForget,
  onPin,
  forgetDelayMs = 5000,
  agentName = "The assistant",
  readOnly = false,
  groupBy,
  formatTime,
  ref,
  ...props
}: MemoryInspectorProps) {
  const headingId = useId();
  const searchId = useId();
  const questionId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [windows] = useState(() => new UndoWindows());
  const nextKey = useRef(0);
  const focusRequest = useRef<FocusRequest | null>(null);
  // Undo that took focus because the person clicked Forget. That focus is ours,
  // not theirs, so it does not hold the window open.
  const quietFocus = useRef<string | null>(null);
  const forgetRef = useRef(onForget);

  useEffect(() => {
    forgetRef.current = onForget;
  });

  useEffect(() => {
    const request = focusRequest.current;
    const root = rootRef.current;
    if (!request || !root) return;
    focusRequest.current = null;
    focusWithin(root, request);
  });

  // Unmounting inside a window commits every forget still waiting.
  useEffect(
    () => () => {
      const ids = windows.closeAll();
      if (ids.length > 0) forgetRef.current?.(ids);
    },
    [windows],
  );

  const pendingIds = new Set(pending.flatMap((entry) => entry.ids));
  const present = new Set(memories.map((memory) => memory.id));
  const inPlace = new Map(
    pending
      .filter(
        (entry) => entry.inPlace && entry.ids[0] !== undefined && present.has(entry.ids[0]),
      )
      .map((entry) => [entry.ids[0], entry]),
  );
  const loose = pending.filter((entry) => !inPlace.has(entry.ids[0]));
  const live = memories.filter((memory) => !pendingIds.has(memory.id));
  const shown = sortMemories(live.filter((memory) => matchesMemory(memory, query)));
  // A memory being forgotten keeps its place whatever the search says, so its
  // Undo does not vanish because the person typed.
  const listed = memories.filter(
    (memory) =>
      inPlace.has(memory.id) || (!pendingIds.has(memory.id) && matchesMemory(memory, query)),
  );

  const searching = query.trim() !== "";
  const results = !searching
    ? ""
    : shown.length === 0
      ? `No memories match “${query.trim()}”.`
      : `Showing ${String(shown.length)} of ${String(live.length)}.`;
  const resultsRef = useRef(results);
  const announcedQuery = useRef(query);
  useEffect(() => {
    resultsRef.current = results;
  });

  // Announced once typing pauses. Every keystroke would be a sentence read
  // over the characters the screen reader is already echoing.
  useEffect(() => {
    if (announcedQuery.current === query) return;
    announcedQuery.current = query;
    const timer = setTimeout(() => {
      setAnnouncement(resultsRef.current);
    }, ANNOUNCE_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const canEdit = !readOnly && onEdit !== undefined;
  const canPin = !readOnly && onPin !== undefined;
  const canForget = !readOnly && onForget !== undefined;

  function hold(key: string, reason: UndoHold) {
    if (reason === "focus" && quietFocus.current === key) {
      quietFocus.current = null;
      return;
    }
    windows.hold(key, reason);
  }

  /** Where focus goes when what holds it is about to disappear. */
  function focusAfterRemoving(element: Element | null | undefined) {
    const root = rootRef.current;
    if (!root || !element?.contains(document.activeElement)) return;
    const id = neighbour(root, element);
    focusRequest.current = id ? { to: "memory", id, part: "first" } : { to: "start" };
  }

  function commit(key: string) {
    const ids = windows.close(key);
    if (!ids) return;
    if (quietFocus.current === key) quietFocus.current = null;
    focusAfterRemoving(rootRef.current?.querySelector(`[data-pending-key="${key}"]`));
    setPending((list) => list.filter((entry) => entry.key !== key));
    forgetRef.current?.(ids);
  }

  function start(entry: Omit<Pending, "key">, viaKeyboard: boolean) {
    nextKey.current += 1;
    const key = `forget-${String(nextKey.current)}`;
    windows.open(key, entry.ids, forgetDelayMs, () => {
      commit(key);
    });
    quietFocus.current = viaKeyboard ? null : key;
    focusRequest.current = { to: "undo", key };
    setPending((list) => [...list, { ...entry, key }]);
  }

  function forgetOne(memory: Memory, viaKeyboard: boolean) {
    if (forgetDelayMs <= 0) {
      const root = rootRef.current;
      focusAfterRemoving(root ? rowOf(root, memory.id) : undefined);
      onForget?.([memory.id]);
      return;
    }
    const quoted = quoteMemory(memory.text);
    start(
      {
        ids: [memory.id],
        message: `Forgot ${quoted}`,
        restored: `Restored ${quoted}`,
        inPlace: true,
      },
      viaKeyboard,
    );
  }

  function forgetShown(event: MouseEvent<HTMLButtonElement>) {
    setConfirming(false);
    const ids = shown.map((memory) => memory.id);
    if (ids.length === 0) return;
    if (forgetDelayMs <= 0) {
      focusRequest.current = { to: "start" };
      onForget?.(ids);
      return;
    }
    const what =
      shown.length === 1 && shown[0] ? quoteMemory(shown[0].text) : countMemories(ids.length);
    start(
      { ids, message: `Forgot ${what}`, restored: `Restored ${what}`, inPlace: false },
      event.detail === 0,
    );
  }

  function undo(entry: Pending) {
    if (!windows.close(entry.key)) return;
    const [first] = entry.ids;
    focusRequest.current =
      entry.inPlace && first !== undefined
        ? { to: "memory", id: first, part: "forget" }
        : { to: "forget-all" };
    setPending((list) => list.filter((candidate) => candidate.key !== entry.key));
    setAnnouncement(entry.restored);
  }

  function cancelOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    focusRequest.current = { to: "forget-all" };
    setConfirming(false);
  }

  const notice = (entry: Pending) => (
    <MemoryNotice
      message={entry.message}
      onUndo={() => {
        undo(entry);
      }}
      onHold={(reason) => {
        hold(entry.key, reason);
      }}
      onRelease={(reason) => {
        windows.release(entry.key, reason);
      }}
    />
  );

  const noticeClass =
    "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed border-border px-3 py-2 text-muted-foreground";

  const renderList = (list: Memory[], labelledBy?: string) => (
    <ul
      data-slot="memory-inspector-list"
      aria-labelledby={labelledBy}
      className="flex list-none flex-col gap-2"
    >
      {list.map((memory) => {
        const entry = inPlace.get(memory.id);
        return entry ? (
          <li
            key={memory.id}
            data-slot="memory-inspector-notice"
            data-pending-key={entry.key}
            className={noticeClass}
          >
            {notice(entry)}
          </li>
        ) : (
          <MemoryItem
            key={memory.id}
            memory={memory}
            showScope={groupBy !== "scope"}
            formatTime={formatTime}
            onEdit={canEdit ? onEdit : undefined}
            onPin={
              canPin
                ? (id, pinned) => {
                    focusRequest.current = { to: "memory", id, part: "pin" };
                    onPin(id, pinned);
                  }
                : undefined
            }
            onForget={canForget ? forgetOne : undefined}
          />
        );
      })}
    </ul>
  );

  const pinnedShown = shown.filter((memory) => memory.pinned).length;
  const question =
    (searching
      ? `Forget the ${countMemories(shown.length)} shown?`
      : `Forget ${shown.length > 1 ? "all " : ""}${countMemories(shown.length)}?`) +
    (pinnedShown === 0
      ? ""
      : shown.length === 1
        ? " It is pinned."
        : ` ${String(pinnedShown)} of them ${pinnedShown === 1 ? "is" : "are"} pinned.`);

  const showSearch = live.length > 0 || searching;
  const showForgetAll = canForget && shown.length > 0;

  return (
    <section
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="memory-inspector"
      aria-labelledby={headingId}
      className={cn(memoryInspectorVariants({ variant }), className)}
      {...props}
    >
      <h3
        id={headingId}
        data-slot="memory-inspector-heading"
        tabIndex={-1}
        className={cn("rounded-sm text-sm font-medium", focusRing)}
      >
        {describeMemoryCount(agentName, live.length)}
      </h3>

      {/* Present from first paint and quiet until there is something to say:
          a search result, or a memory brought back. */}
      <p data-slot="memory-inspector-status" role="status" className="sr-only">
        {announcement}
      </p>

      {showSearch || showForgetAll ? (
        <div className="flex flex-wrap items-center gap-2">
          {showSearch ? (
            <div className="min-w-40 flex-1">
              <label htmlFor={searchId} className="sr-only">
                Search memories
              </label>
              <Input
                id={searchId}
                type="search"
                inputSize="sm"
                data-slot="memory-inspector-search"
                placeholder="Search memories"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setConfirming(false);
                }}
              />
            </div>
          ) : null}
          {showForgetAll && !confirming ? (
            <Button
              variant="outline"
              size="sm"
              data-slot="memory-inspector-forget-all"
              onClick={() => {
                focusRequest.current = { to: "keep" };
                setConfirming(true);
              }}
            >
              {searching ? `Forget ${String(shown.length)} shown` : "Forget all"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Asked here rather than in a dialog: the list it is about stays in view. */}
      {showForgetAll && confirming ? (
        <div
          role="group"
          aria-labelledby={questionId}
          data-slot="memory-inspector-confirm"
          className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2"
        >
          <p id={questionId} className="me-auto">
            {question}
          </p>
          <Button
            variant="outline"
            size="sm"
            data-slot="memory-inspector-keep"
            onKeyDown={cancelOnEscape}
            onClick={() => {
              focusRequest.current = { to: "forget-all" };
              setConfirming(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            data-slot="memory-inspector-confirm-forget"
            onKeyDown={cancelOnEscape}
            onClick={forgetShown}
          >
            {shown.length === 1 ? "Forget it" : `Forget ${String(shown.length)}`}
          </Button>
        </div>
      ) : null}

      {searching ? (
        // Spoken by the status region once typing pauses; this is the same
        // sentence for the eye, straight away.
        <p
          data-slot="memory-inspector-results"
          aria-hidden="true"
          className="text-xs text-muted-foreground"
        >
          {results}
        </p>
      ) : null}

      {loose.length > 0 ? (
        <div data-slot="memory-inspector-notices" className="flex flex-col gap-2">
          {loose.map((entry) => (
            <div
              key={entry.key}
              data-slot="memory-inspector-notice"
              data-pending-key={entry.key}
              className={noticeClass}
            >
              {notice(entry)}
            </div>
          ))}
        </div>
      ) : null}

      {listed.length === 0 && live.length === 0 ? (
        <div
          data-slot="memory-inspector-empty"
          className="flex flex-col gap-1 rounded-md border border-dashed border-border px-4 py-6 text-center"
        >
          <p className="font-medium">Nothing remembered yet</p>
          <p className="text-xs text-muted-foreground">
            What is kept from your conversations appears here, with where it came from
            {readOnly ? "." : ", for you to edit or forget."}
          </p>
        </div>
      ) : groupBy === "scope" ? (
        groupMemories(listed).map((group) => (
          <ScopeGroup key={group.scope ?? ""} label={group.label}>
            {(labelledBy) => renderList(group.memories, labelledBy)}
          </ScopeGroup>
        ))
      ) : listed.length > 0 ? (
        renderList(sortMemories(listed))
      ) : null}
    </section>
  );
}

function ScopeGroup({
  label,
  children,
}: {
  label: string;
  children: (labelledBy: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div data-slot="memory-inspector-group" className="flex flex-col gap-2">
      <h4 id={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </h4>
      {children(id)}
    </div>
  );
}

export { memoryInspectorVariants };
