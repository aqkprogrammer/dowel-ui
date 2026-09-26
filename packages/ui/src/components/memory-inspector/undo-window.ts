/**
 * Timers for forgets that can still be taken back.
 *
 * Each window counts down to its `onExpire`, and stops counting while anything
 * holds it — keyboard focus on its Undo, or the pointer over it — so nobody
 * loses the chance to undo while reaching for the button (WCAG 2.2.1). The
 * time already spent is kept, so a window resumes rather than starting over.
 *
 * Plain timers rather than state: nothing here is drawn, and a re-render has
 * no business restarting a clock.
 */

export type UndoHold = "focus" | "pointer";

interface UndoWindowEntry {
  ids: string[];
  remaining: number;
  startedAt: number;
  handle: ReturnType<typeof setTimeout> | undefined;
  holds: Set<UndoHold>;
  onExpire: () => void;
}

export class UndoWindows {
  private readonly windows = new Map<string, UndoWindowEntry>();

  open(key: string, ids: string[], ms: number, onExpire: () => void): void {
    this.windows.set(key, {
      ids,
      remaining: ms,
      startedAt: 0,
      handle: undefined,
      holds: new Set(),
      onExpire,
    });
    this.run(key);
  }

  hold(key: string, reason: UndoHold): void {
    const entry = this.windows.get(key);
    if (!entry) return;
    entry.holds.add(reason);
    if (entry.handle === undefined) return;
    clearTimeout(entry.handle);
    entry.handle = undefined;
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
  }

  release(key: string, reason: UndoHold): void {
    this.windows.get(key)?.holds.delete(reason);
    this.run(key);
  }

  /** Stops a window without expiring it. Returns its ids, if it was open. */
  close(key: string): string[] | undefined {
    const entry = this.windows.get(key);
    if (!entry) return undefined;
    clearTimeout(entry.handle);
    this.windows.delete(key);
    return entry.ids;
  }

  /** Stops every window, returning all their ids. */
  closeAll(): string[] {
    const ids = [...this.windows.keys()].flatMap((key) => this.close(key) ?? []);
    return ids;
  }

  private run(key: string): void {
    const entry = this.windows.get(key);
    if (!entry || entry.handle !== undefined || entry.holds.size > 0) return;
    entry.startedAt = Date.now();
    entry.handle = setTimeout(entry.onExpire, entry.remaining);
  }
}
