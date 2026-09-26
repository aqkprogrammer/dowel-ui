import { describe, expect, it, vi } from "vitest";

import {
  createGrantStore,
  defaultPermissionOptions,
  findGrant,
  grantCovers,
  grantKey,
  type PermissionDecision,
  type PermissionStore,
} from "./permission-grants";

const CALENDAR = { id: "calendar.read" };
const WORK = { id: "calendar.read", scope: "Work" };
const HOME = { id: "calendar.read", scope: "Home" };

/** A store backed by a Map, as a page would back one with localStorage. */
function memoryStore(async = false) {
  const data = new Map<string, PermissionDecision>();
  const wrap = <T>(value: T) => (async ? Promise.resolve(value) : value);
  const store = {
    data,
    get: vi.fn((key: string) => wrap(data.get(key))),
    set: vi.fn((key: string, decision: PermissionDecision) => {
      data.set(key, decision);
      return wrap(undefined);
    }),
    delete: vi.fn((key: string) => {
      data.delete(key);
      return wrap(undefined);
    }),
  } satisfies PermissionStore & { data: Map<string, PermissionDecision> };
  return store;
}

describe("grantKey", () => {
  it("is the capability id when there is no scope, so a store keyed by id needs no translation", () => {
    expect(grantKey("calendar.read")).toBe("calendar.read");
    expect(grantKey("calendar.read", "")).toBe("calendar.read");
  });

  it("adds the scope after a #", () => {
    expect(grantKey("calendar.read", "Work")).toBe("calendar.read#Work");
  });
});

describe("matching", () => {
  it("a grant without a scope covers every scope of its capability", () => {
    const grant = { capabilityId: "calendar.read", decision: "session" as const };
    expect(grantCovers(grant, CALENDAR)).toBe(true);
    expect(grantCovers(grant, WORK)).toBe(true);
  });

  it("a scoped grant covers only its own scope, never the whole capability", () => {
    const grant = {
      capabilityId: "calendar.read",
      scope: "Work",
      decision: "session" as const,
    };
    expect(grantCovers(grant, WORK)).toBe(true);
    expect(grantCovers(grant, HOME)).toBe(false);
    expect(grantCovers(grant, CALENDAR)).toBe(false);
  });

  it("never covers another capability", () => {
    const grant = { capabilityId: "calendar.read", decision: "always" as const };
    expect(grantCovers(grant, { id: "calendar.write" })).toBe(false);
  });

  it("treats an empty scope as no scope", () => {
    const grant = { capabilityId: "calendar.read", scope: "", decision: "session" as const };
    expect(grantCovers(grant, WORK)).toBe(true);
  });

  it("prefers the exact scope over a broader grant", () => {
    const broad = { capabilityId: "calendar.read", decision: "session" as const };
    const exact = { capabilityId: "calendar.read", scope: "Work", decision: "always" as const };
    expect(findGrant([broad, exact], WORK)).toBe(exact);
    expect(findGrant([broad, exact], HOME)).toBe(broad);
    expect(findGrant([exact], HOME)).toBeUndefined();
  });
});

describe("defaultPermissionOptions", () => {
  it("offers all four for low and medium risk, and when risk is not given", () => {
    const all = ["once", "session", "always", "deny"];
    expect(defaultPermissionOptions()).toEqual(all);
    expect(defaultPermissionOptions("low")).toEqual(all);
    expect(defaultPermissionOptions("medium")).toEqual(all);
  });

  it("leaves out always for high risk", () => {
    expect(defaultPermissionOptions("high")).toEqual(["once", "session", "deny"]);
  });

  it("leaves out always when there is nowhere to keep it", () => {
    expect(defaultPermissionOptions("low", false)).toEqual(["once", "session", "deny"]);
  });
});

describe("createGrantStore", () => {
  it("remembers a session grant in memory only", () => {
    const store = memoryStore();
    const grants = createGrantStore({ store });
    grants.remember(WORK, "session");

    expect(grants.list()).toEqual([
      { capabilityId: "calendar.read", scope: "Work", decision: "session" },
    ]);
    expect(grants.match(WORK)?.decision).toBe("session");
    expect(store.set).not.toHaveBeenCalled();
  });

  it("writes an always grant to the store under its key", () => {
    const store = memoryStore();
    const grants = createGrantStore({ store });
    grants.remember(WORK, "always");

    expect(store.set).toHaveBeenCalledWith("calendar.read#Work", "always");
    expect(grants.match(WORK)?.decision).toBe("always");
    expect(grants.persistent).toBe(true);
  });

  it("does not remember once or deny", () => {
    const grants = createGrantStore();
    grants.remember(CALENDAR, "once");
    grants.remember(CALENDAR, "deny");
    expect(grants.list()).toEqual([]);
    expect(grants.persistent).toBe(false);
  });

  it("replaces a session grant with always rather than keeping both", () => {
    const grants = createGrantStore();
    grants.remember(CALENDAR, "session");
    grants.remember(CALENDAR, "always");
    expect(grants.list()).toEqual([{ capabilityId: "calendar.read", decision: "always" }]);
  });

  it("notifies subscribers on change and keeps the list stable when nothing changed", () => {
    const grants = createGrantStore();
    const listener = vi.fn();
    const unsubscribe = grants.subscribe(listener);

    grants.remember(CALENDAR, "session");
    const first = grants.list();
    grants.remember(CALENDAR, "session");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(grants.list()).toBe(first);

    unsubscribe();
    grants.remember(WORK, "session");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe("lookup", () => {
    it("answers from memory without reading the store", async () => {
      const store = memoryStore();
      const grants = createGrantStore({ store });
      grants.remember(CALENDAR, "session");

      await expect(grants.lookup(CALENDAR)).resolves.toMatchObject({ decision: "session" });
      expect(store.get).not.toHaveBeenCalled();
    });

    it.each([false, true])("finds an always grant in a store (async: %s)", async (async) => {
      const store = memoryStore(async);
      store.data.set("calendar.read#Work", "always");
      const grants = createGrantStore({ store });

      await expect(grants.lookup(WORK)).resolves.toEqual({
        capabilityId: "calendar.read",
        scope: "Work",
        decision: "always",
      });
      // Now held in memory, so the next check is synchronous.
      expect(grants.match(WORK)?.decision).toBe("always");
    });

    it("lets a stored grant without a scope answer a scoped request", async () => {
      const store = memoryStore();
      store.data.set("calendar.read", "always");
      const grants = createGrantStore({ store });

      await expect(grants.lookup(WORK)).resolves.toEqual({
        capabilityId: "calendar.read",
        decision: "always",
      });
      expect(store.get).toHaveBeenNthCalledWith(1, "calendar.read#Work");
      expect(store.get).toHaveBeenNthCalledWith(2, "calendar.read");
    });

    it("does not let a stored scoped grant answer another scope", async () => {
      const store = memoryStore();
      store.data.set("calendar.read#Work", "always");
      const grants = createGrantStore({ store });
      await expect(grants.lookup(HOME)).resolves.toBeUndefined();
      await expect(grants.lookup(CALENDAR)).resolves.toBeUndefined();
    });

    it("ignores anything stored other than always", async () => {
      const store = memoryStore();
      store.data.set("calendar.read", "deny");
      const grants = createGrantStore({ store });
      await expect(grants.lookup(CALENDAR)).resolves.toBeUndefined();
    });

    it("resolves undefined with no store and no grant", async () => {
      await expect(createGrantStore().lookup(CALENDAR)).resolves.toBeUndefined();
    });

    it("treats a failed read as no grant, and reports it", async () => {
      const onError = vi.fn();
      const failure = new Error("offline");
      const grants = createGrantStore({
        store: { get: () => Promise.reject(failure), set: vi.fn(), delete: vi.fn() },
        onError,
      });
      await expect(grants.lookup(CALENDAR)).resolves.toBeUndefined();
      expect(onError).toHaveBeenCalledWith(failure);
    });
  });

  describe("failed writes", () => {
    it("keeps the grant for this session and reports an async failure", async () => {
      const onError = vi.fn();
      const failure = new Error("quota");
      const grants = createGrantStore({
        store: { get: vi.fn(), set: () => Promise.reject(failure), delete: vi.fn() },
        onError,
      });
      grants.remember(CALENDAR, "always");

      expect(grants.match(CALENDAR)?.decision).toBe("always");
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(failure);
      });
    });

    it("reports a store that throws synchronously", () => {
      const onError = vi.fn();
      const failure = new Error("quota");
      const grants = createGrantStore({
        store: {
          get: vi.fn(),
          set: () => {
            throw failure;
          },
          delete: vi.fn(),
        },
        onError,
      });
      grants.remember(CALENDAR, "always");
      expect(onError).toHaveBeenCalledWith(failure);
      expect(grants.match(CALENDAR)?.decision).toBe("always");
    });

    it("reports through reportError by default, rather than swallowing", async () => {
      const reportError = vi.fn();
      vi.stubGlobal("reportError", reportError);
      const failure = new Error("quota");
      const grants = createGrantStore({
        store: { get: vi.fn(), set: () => Promise.reject(failure), delete: vi.fn() },
      });
      grants.remember(CALENDAR, "always");
      await vi.waitFor(() => {
        expect(reportError).toHaveBeenCalledWith(failure);
      });
      vi.unstubAllGlobals();
    });
  });

  describe("revoke", () => {
    it("without a scope, forgets every scope and deletes the keys it knows", async () => {
      const store = memoryStore();
      const grants = createGrantStore({ store });
      grants.remember(WORK, "always");
      grants.remember(HOME, "session");
      grants.remember({ id: "contacts.read" }, "session");

      await grants.revoke("calendar.read");

      expect(grants.list()).toEqual([{ capabilityId: "contacts.read", decision: "session" }]);
      expect(store.delete.mock.calls.map(([key]) => key).sort()).toEqual([
        "calendar.read",
        "calendar.read#Home",
        "calendar.read#Work",
      ]);
      expect(store.data.size).toBe(0);
    });

    it("with a scope, forgets only that scope", async () => {
      const store = memoryStore(true);
      const grants = createGrantStore({ store });
      grants.remember(WORK, "always");
      grants.remember(HOME, "always");

      await grants.revoke("calendar.read", "Work");

      expect(grants.match(WORK)).toBeUndefined();
      expect(grants.match(HOME)?.decision).toBe("always");
      expect(store.delete).toHaveBeenCalledTimes(1);
      expect(store.data.has("calendar.read#Home")).toBe(true);
    });

    it("deletes from the store even when nothing was in memory", async () => {
      const store = memoryStore();
      store.data.set("calendar.read", "always");
      await createGrantStore({ store }).revoke("calendar.read");
      expect(store.data.size).toBe(0);
    });

    it("rejects when the store cannot delete, so the caller can say it did not stick", async () => {
      const failure = new Error("offline");
      const grants = createGrantStore({
        store: { get: vi.fn(), set: vi.fn(), delete: () => Promise.reject(failure) },
      });
      grants.remember(CALENDAR, "always");
      await expect(grants.revoke("calendar.read")).rejects.toBe(failure);
    });

    it("works without a store", async () => {
      const grants = createGrantStore();
      grants.remember(CALENDAR, "session");
      await grants.revoke("calendar.read");
      expect(grants.list()).toEqual([]);
    });
  });
});
