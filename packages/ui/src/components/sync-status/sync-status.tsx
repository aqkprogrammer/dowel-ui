"use client";

import { useState, useSyncExternalStore, type ComponentPropsWithRef } from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

/**
 * "Offline — 3 changes will sync when you're back."
 *
 * Linear, Notion, Figma and Google Docs each built this, and nothing in a
 * component library touches network state at all. It is small, and it is
 * the difference between an app that loses work and one that says it is
 * holding it: the moment a request fails, the reader needs to know whether
 * to keep typing, and whether what they typed a minute ago is anywhere.
 *
 * Two things this gets right that the obvious version gets wrong.
 *
 * `navigator.onLine` is believed in one direction only. False is reliable —
 * the interface is down. True means only that there is an interface, not
 * that the server is reachable, so an application's own failed request is
 * the real signal and takes precedence. The hook is exported for the rest
 * of the app to share the same reading.
 *
 * Announcements are for transitions, not states. Every save flips
 * "Saving…" to "Saved", and a live region on that text narrates the whole
 * session. So the visible text is not live; a separate region says something
 * only when the situation changes — went offline, came back, could not sync —
 * which is when a reader who is typing needs to be told.
 */

export type SyncState = "synced" | "pending" | "syncing" | "offline" | "error";

export interface SyncInput {
  /** From `useOnlineStatus`, or your own reading. */
  online: boolean;
  /** Changes waiting to be sent. */
  pending?: number;
  /** A send is in flight. */
  syncing?: boolean;
  /** The last send failed, in the reader's language. Takes precedence over `online`. */
  error?: string | null;
}

/**
 * Which state the inputs amount to. Error beats offline beats syncing beats
 * pending beats synced: each one is the thing the reader most needs to know
 * given the others.
 */
export function syncState({
  online,
  pending = 0,
  syncing = false,
  error,
}: SyncInput): SyncState {
  if (error) return "error";
  if (!online) return "offline";
  if (syncing) return "syncing";
  if (pending > 0) return "pending";
  return "synced";
}

const changes = (n: number) => `${String(n)} ${n === 1 ? "change" : "changes"}`;

/** The state as a sentence. Used for the visible text and the announcement. */
export function describeSyncState(
  state: SyncState,
  pending = 0,
  error?: string | null,
): string {
  switch (state) {
    case "synced":
      return "All changes saved";
    case "pending":
      return `${changes(pending)} waiting to save`;
    case "syncing":
      return pending > 0 ? `Saving ${changes(pending)}…` : "Saving…";
    case "offline":
      return pending > 0
        ? `Offline. ${changes(pending)} will save when you're back online.`
        : "Offline. Changes will save when you're back online.";
    case "error":
      return pending > 0
        ? `Could not save ${changes(pending)}. ${error ?? ""}`.trim()
        : `Could not save. ${error ?? ""}`.trim();
  }
}

/* The browser's reading of the network, as an external store. The server
   snapshot is "online": a page rendered on the server has no interface to
   report, and rendering "offline" into HTML would be a lie until hydration. */
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const readOnline = () => navigator.onLine;
const readOnlineOnServer = () => true;

/** Whether the browser believes it has a network. False is reliable; true is not. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, readOnline, readOnlineOnServer);
}

export interface SyncStatusProps
  extends Omit<ComponentPropsWithRef<"div">, "children">, Omit<SyncInput, "online"> {
  /** Omit to read the browser's own status. */
  online?: boolean;
  /** When the last save succeeded. Shown as a time, not a relative phrase, so no clock is needed. */
  lastSyncedAt?: Date;
  locale?: string;
  /** Offered when a save failed. */
  onRetry?: () => void;
  /**
   * Announce transitions. On by default, because going offline is the one
   * thing a reader who is typing has to be told; syncing itself never
   * announces, whichever way this is set.
   */
  announce?: boolean;
}

export function SyncStatus({
  className,
  online: onlineProp,
  pending = 0,
  syncing = false,
  error,
  lastSyncedAt,
  locale,
  onRetry,
  announce = true,
  ...props
}: SyncStatusProps) {
  const browserOnline = useOnlineStatus();
  const online = onlineProp ?? browserOnline;
  const state = syncState({ online, pending, syncing, error });
  const text = describeSyncState(state, pending, error);

  // Said once, when the situation changes. Adjusted during render so the
  // announcement lands in the same commit as the state it describes. Syncing
  // and pending are the ordinary churn of saving and are never announced.
  const [seen, setSeen] = useState(state);
  const [announcement, setAnnouncement] = useState("");
  // A failure is over when a save lands, not when the retry starts, so the
  // recovery is remembered across the syncing in between.
  const [recovering, setRecovering] = useState(false);
  if (seen !== state) {
    const from = seen;
    setSeen(state);
    if (state === "offline" || state === "error") {
      setAnnouncement(text);
      setRecovering(false);
    } else if (from === "offline") {
      setAnnouncement(
        pending > 0 ? `Back online. Saving ${changes(pending)}.` : "Back online.",
      );
    } else if ((from === "error" || recovering) && state === "synced") {
      setAnnouncement("Saved.");
      setRecovering(false);
    } else if (from === "error") {
      setRecovering(true);
    }
  }

  const savedAt =
    lastSyncedAt !== undefined
      ? new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(lastSyncedAt)
      : null;

  return (
    <div
      data-slot="sync-status"
      data-state={state}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}
      {...props}
    >
      {/* The dot is decoration. The word is the status. */}
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          state === "synced" && "bg-success",
          state === "pending" && "bg-muted-foreground",
          state === "syncing" && "animate-pulse-soft bg-info",
          state === "offline" && "bg-warning",
          state === "error" && "bg-destructive",
        )}
      />
      <span
        data-slot="sync-status-text"
        className={cn(
          state === "offline" && "text-warning",
          state === "error" && "text-destructive",
          (state === "synced" || state === "pending" || state === "syncing") &&
            "text-muted-foreground",
        )}
      >
        {text}
        {savedAt && state === "synced" ? ` at ${savedAt}` : null}
      </span>

      {state === "error" && onRetry ? (
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={onRetry}>
          Retry
        </Button>
      ) : null}

      {/* Present from the start, so the first transition is heard. */}
      <span role="status" aria-live={announce ? "polite" : "off"} className="sr-only">
        {announce ? announcement : ""}
      </span>
    </div>
  );
}
