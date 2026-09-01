"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Toast state, kept outside React.
 *
 * A toast is usually raised from somewhere that is not a component — a fetch
 * handler, a mutation callback, a websocket message. Holding the queue in a
 * plain module-level store means `toast()` is callable from anywhere, while
 * `useToasts()` still gives components a properly-subscribed, concurrent-safe
 * read via useSyncExternalStore.
 *
 * Dismiss *timing* deliberately lives in the component layer, not here: the
 * underlying primitive already pauses timers on hover, focus and window blur,
 * and reimplementing that in the store would only fight it.
 */

export type ToastVariant = "default" | "success" | "warning" | "destructive" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
  /**
   * Announced instead of the label, describing how to do the same thing without
   * the toast (which may vanish before assistive technology reaches it).
   * Defaults to the label.
   */
  altText?: string;
}

export interface ToastOptions {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. `Infinity` keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
  onDismiss?: (id: string) => void;
}

export interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

/** Beyond a handful, toasts stop being read and start being dismissed. */
export const TOAST_LIMIT = 4;

export const DEFAULT_TOAST_DURATION = 5000;

let toasts: ToastRecord[] = [];
let nextId = 0;

const listeners = new Set<() => void>();

function emit(next: ToastRecord[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastRecord[] {
  return toasts;
}

/** Subscribed read of the current queue. */
export function useToasts(): ToastRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function add(options: ToastOptions): string {
  nextId += 1;
  const id = options.id ?? `toast-${String(nextId)}`;
  const record: ToastRecord = { variant: "default", ...options, id };

  // Newest first, oldest past the limit dropped.
  emit([record, ...toasts.filter((existing) => existing.id !== id)].slice(0, TOAST_LIMIT));
  return id;
}

function update(id: string, options: Partial<ToastOptions>): void {
  emit(toasts.map((existing) => (existing.id === id ? { ...existing, ...options } : existing)));
}

function dismiss(id: string): void {
  const target = toasts.find((existing) => existing.id === id);
  emit(toasts.filter((existing) => existing.id !== id));
  target?.onDismiss?.(id);
}

function dismissAll(): void {
  const current = toasts;
  emit([]);
  for (const record of current) record.onDismiss?.(record.id);
}

export interface ToastPromiseMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

function resolveMessage<T>(
  message: ReactNode | ((value: T) => ReactNode),
  value: T,
): ReactNode {
  return typeof message === "function" ? (message as (value: T) => ReactNode)(value) : message;
}

/**
 * Shows a pending toast that resolves into a success or error toast.
 *
 * Returns the original promise so it stays awaitable and rejections are not
 * swallowed — the toast is a side effect of the promise, not a replacement for
 * handling it.
 */
function promise<T>(input: Promise<T>, messages: ToastPromiseMessages<T>): Promise<T> {
  const id = add({ title: messages.loading, duration: Infinity });

  input.then(
    (value) => {
      update(id, {
        title: resolveMessage(messages.success, value),
        variant: "success",
        duration: DEFAULT_TOAST_DURATION,
      });
    },
    (error: unknown) => {
      update(id, {
        title: resolveMessage(messages.error, error),
        variant: "destructive",
        duration: DEFAULT_TOAST_DURATION,
      });
    },
  );

  return input;
}

function withVariant(variant: ToastVariant) {
  return (title: ReactNode, options: Omit<ToastOptions, "title" | "variant"> = {}) =>
    add({ ...options, title, variant });
}

/**
 * Raises a toast from anywhere — no hook, no provider lookup.
 *
 *   toast.success("Project created");
 *   toast.error("Could not save", { description: "Check your connection." });
 *   await toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Failed" });
 */
export const toast = Object.assign(
  (title: ReactNode, options: Omit<ToastOptions, "title"> = {}) => add({ ...options, title }),
  {
    default: withVariant("default"),
    success: withVariant("success"),
    error: withVariant("destructive"),
    warning: withVariant("warning"),
    info: withVariant("info"),
    custom: add,
    update,
    dismiss,
    dismissAll,
    promise,
  },
);

/** Test-only reset. Not exported from the package index. */
export function resetToasts(): void {
  toasts = [];
  nextId = 0;
  for (const listener of listeners) listener();
}
