import { describe, expect, it, vi } from "vitest";

import { createGrantStore, type PermissionDecision } from "./permission-grants";
import { createPermissionQueue } from "./permission-queue";

const CALENDAR = { id: "calendar.read", title: "read your calendar" };
const CONTACTS = { id: "contacts.read", title: "read your contacts" };
const SEND = { id: "mail.send", title: "send email as you", risk: "high" as const };
const ASK = { requester: "Claude" };

/** Lets every queued microtask (store reads, enqueueing) run. */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function tracked(promise: Promise<PermissionDecision>) {
  const state: { value?: PermissionDecision } = {};
  void promise.then((value) => {
    state.value = value;
  });
  return state;
}

describe("createPermissionQueue", () => {
  it("puts a request in front of the person and resolves with their answer", async () => {
    const queue = createPermissionQueue();
    const answer = queue.request(CALENDAR, { ...ASK, reason: "to find a free slot" });
    await settle();

    const current = queue.getSnapshot().current;
    expect(current).toMatchObject({
      capability: CALENDAR,
      requester: "Claude",
      reason: "to find a free slot",
    });
    queue.decide(current?.id ?? "", "once");

    await expect(answer).resolves.toBe("once");
    expect(queue.getSnapshot()).toMatchObject({ current: null, waiting: 0 });
    expect(queue.getSnapshot().last).toMatchObject({ decision: "once" });
  });

  it("shows one at a time, in the order asked, and counts the rest", async () => {
    const queue = createPermissionQueue();
    const first = queue.request(CALENDAR, ASK);
    const second = queue.request(CONTACTS, ASK);
    await settle();

    expect(queue.getSnapshot().current?.capability.id).toBe("calendar.read");
    expect(queue.getSnapshot().waiting).toBe(1);

    queue.decide(queue.getSnapshot().current?.id ?? "", "deny");
    await expect(first).resolves.toBe("deny");
    expect(queue.getSnapshot().current?.capability.id).toBe("contacts.read");
    expect(queue.getSnapshot().waiting).toBe(0);

    queue.decide(queue.getSnapshot().current?.id ?? "", "once");
    await expect(second).resolves.toBe("once");
  });

  it("answers a later request at once from a session grant, without showing it", async () => {
    const queue = createPermissionQueue();
    const first = queue.request(CALENDAR, ASK);
    await settle();
    queue.decide(queue.getSnapshot().current?.id ?? "", "session");
    await expect(first).resolves.toBe("session");

    const listener = vi.fn();
    queue.subscribe(listener);
    await expect(queue.request(CALENDAR, ASK)).resolves.toBe("session");
    expect(listener).not.toHaveBeenCalled();
    expect(queue.getSnapshot().current).toBeNull();
  });

  it("answers requests already queued behind a session answer for the same capability", async () => {
    const queue = createPermissionQueue();
    const first = tracked(queue.request(CALENDAR, ASK));
    const contacts = tracked(queue.request(CONTACTS, ASK));
    const again = tracked(queue.request(CALENDAR, ASK));
    await settle();
    expect(queue.getSnapshot().waiting).toBe(2);

    queue.decide(queue.getSnapshot().current?.id ?? "", "session");
    await settle();

    expect(first.value).toBe("session");
    expect(again.value).toBe("session");
    expect(contacts.value).toBeUndefined();
    expect(queue.getSnapshot().current?.capability.id).toBe("contacts.read");
    expect(queue.getSnapshot().waiting).toBe(0);
  });

  it("asks again after allow once", async () => {
    const queue = createPermissionQueue();
    const first = queue.request(CALENDAR, ASK);
    await settle();
    queue.decide(queue.getSnapshot().current?.id ?? "", "once");
    await first;

    const second = tracked(queue.request(CALENDAR, ASK));
    await settle();
    expect(second.value).toBeUndefined();
    expect(queue.getSnapshot().current?.capability.id).toBe("calendar.read");
  });

  it("does not remember a refusal", async () => {
    const queue = createPermissionQueue();
    const first = queue.request(CALENDAR, ASK);
    await settle();
    queue.decide(queue.getSnapshot().current?.id ?? "", "deny");
    await expect(first).resolves.toBe("deny");
    expect(queue.grants.list()).toEqual([]);
  });

  it("keeps scopes apart", async () => {
    const queue = createPermissionQueue();
    const work = queue.request({ ...CALENDAR, scope: "Work" }, ASK);
    await settle();
    queue.decide(queue.getSnapshot().current?.id ?? "", "session");
    await work;

    const home = tracked(queue.request({ ...CALENDAR, scope: "Home" }, ASK));
    await settle();
    expect(home.value).toBeUndefined();
    expect(queue.getSnapshot().current?.capability.scope).toBe("Home");
  });

  it("lets an answer for the whole capability cover a scoped request", async () => {
    const queue = createPermissionQueue();
    const whole = queue.request(CALENDAR, ASK);
    await settle();
    queue.decide(queue.getSnapshot().current?.id ?? "", "session");
    await whole;
    await expect(queue.request({ ...CALENDAR, scope: "Work" }, ASK)).resolves.toBe("session");
  });

  it("persists always through the store, so a later queue does not ask", async () => {
    const data = new Map<string, PermissionDecision>();
    const store = {
      get: (key: string) => Promise.resolve(data.get(key)),
      set: (key: string, decision: PermissionDecision) => {
        data.set(key, decision);
      },
      delete: (key: string) => {
        data.delete(key);
      },
    };
    const queue = createPermissionQueue(createGrantStore({ store }));
    const first = queue.request(CALENDAR, ASK);
    await settle();
    expect(queue.getSnapshot().current?.options).toEqual(["once", "session", "always", "deny"]);
    queue.decide(queue.getSnapshot().current?.id ?? "", "always");
    await first;
    expect(data.get("calendar.read")).toBe("always");

    const later = createPermissionQueue(createGrantStore({ store }));
    await expect(later.request(CALENDAR, ASK)).resolves.toBe("always");
    expect(later.getSnapshot().current).toBeNull();
  });

  it("keeps the order asked even when store reads finish out of order", async () => {
    const slow = new Map<string, number>([["calendar.read", 30]]);
    const store = {
      get: (key: string) =>
        new Promise<undefined>((resolve) => setTimeout(resolve, slow.get(key) ?? 0)),
      set: vi.fn(),
      delete: vi.fn(),
    };
    const queue = createPermissionQueue(createGrantStore({ store }));
    void queue.request(CALENDAR, ASK);
    void queue.request(CONTACTS, ASK);

    await vi.waitFor(() => {
      expect(queue.getSnapshot().waiting).toBe(1);
    });
    expect(queue.getSnapshot().current?.capability.id).toBe("calendar.read");
  });

  it("offers the default choices for the risk, and leaves out always without a store", async () => {
    const queue = createPermissionQueue();
    void queue.request(CALENDAR, ASK);
    void queue.request(SEND, ASK);
    void queue.request(CONTACTS, { ...ASK, options: ["once", "deny"] });
    await settle();

    queue.decide(queue.getSnapshot().current?.id ?? "", "deny");
    expect(queue.getSnapshot().current?.options).toEqual(["once", "session", "deny"]);
    queue.decide(queue.getSnapshot().current?.id ?? "", "deny");
    expect(queue.getSnapshot().current?.options).toEqual(["once", "deny"]);
  });

  it("ignores an answer for a request that is not waiting", async () => {
    const queue = createPermissionQueue();
    void queue.request(CALENDAR, ASK);
    await settle();
    const listener = vi.fn();
    queue.subscribe(listener);
    queue.decide("nope", "always");
    expect(listener).not.toHaveBeenCalled();
    expect(queue.grants.list()).toEqual([]);
  });

  it("refuses everything waiting when closed, and every request until reopened", async () => {
    const queue = createPermissionQueue();
    const first = queue.request(CALENDAR, ASK);
    const second = queue.request(CONTACTS, ASK);
    await settle();

    queue.close();
    await expect(first).resolves.toBe("deny");
    await expect(second).resolves.toBe("deny");
    expect(queue.getSnapshot().current).toBeNull();
    await expect(queue.request(CALENDAR, ASK)).resolves.toBe("deny");

    queue.open();
    const third = tracked(queue.request(CALENDAR, ASK));
    await settle();
    expect(third.value).toBeUndefined();
    expect(queue.getSnapshot().current?.capability.id).toBe("calendar.read");
  });

  it("refuses a request whose store read finishes after closing", async () => {
    const queue = createPermissionQueue(
      createGrantStore({
        store: { get: () => Promise.resolve(undefined), set: vi.fn(), delete: vi.fn() },
      }),
    );
    const answer = queue.request(CALENDAR, ASK);
    queue.close();
    await expect(answer).resolves.toBe("deny");
  });

  it("asks when a grant store's lookup fails", async () => {
    const grants = createGrantStore();
    const queue = createPermissionQueue({
      ...grants,
      lookup: () => Promise.reject(new Error("broken")),
    });
    void queue.request(CALENDAR, ASK);
    await settle();
    expect(queue.getSnapshot().current?.capability.id).toBe("calendar.read");
  });

  it("stops notifying after unsubscribe", async () => {
    const queue = createPermissionQueue();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    unsubscribe();
    void queue.request(CALENDAR, ASK);
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });
});
