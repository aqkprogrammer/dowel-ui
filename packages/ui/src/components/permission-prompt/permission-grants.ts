/**
 * What a person has already said yes to, and for how long.
 *
 * Pure, so the rule for "has this already been allowed?" is tested without
 * rendering anything, and a server that enforces the same grants can match
 * them the same way.
 *
 * Only two answers are remembered. "Allow once" covers the one request it
 * answered, and "Don't allow" is not remembered at all: a refusal that sticks
 * is one the person can no longer see or undo, and the agent is better told
 * no each time than quietly never asked again.
 */

export type PermissionDecision = "once" | "session" | "always" | "deny";

export type PermissionRisk = "low" | "medium" | "high";

export interface PermissionCapability {
  /** Stable id, such as "calendar.read". Grants are remembered by it. */
  id: string;
  /** What it allows, as a phrase that follows "wants to": "read your calendar". */
  title: string;
  /** A sentence of detail, shown under the reason. */
  description?: string;
  /** Things the capability allows, each short: "See event times and titles". */
  can?: string[];
  /** Things it does not allow, which is often what the person is worried about. */
  cannot?: string[];
  risk?: PermissionRisk;
  /**
   * Narrows the capability: "Work calendar". A grant without a scope covers
   * every scope of its capability; a scoped grant covers only its own scope.
   */
  scope?: string;
}

/** A remembered yes. */
export interface PermissionGrant {
  capabilityId: string;
  scope?: string;
  decision: "session" | "always";
}

/**
 * Where "always" grants are kept between visits: localStorage, a settings
 * endpoint, a database row. Each method may return a value or a promise.
 * Only "always" is ever written.
 */
export interface PermissionStore {
  get(
    key: string,
  ): PermissionDecision | null | undefined | Promise<PermissionDecision | null | undefined>;
  set(key: string, decision: PermissionDecision): void | Promise<void>;
  delete(key: string): void | Promise<void>;
}

function normaliseScope(scope: string | undefined): string | undefined {
  return scope === "" ? undefined : scope;
}

/**
 * The key a grant is stored under: the capability id, or `id#scope` when it
 * has a scope. The unscoped key is the id itself, so a store keyed by
 * capability needs no translation. Ids should not contain "#".
 */
export function grantKey(capabilityId: string, scope?: string): string {
  const normalised = normaliseScope(scope);
  return normalised === undefined ? capabilityId : `${capabilityId}#${normalised}`;
}

/** Whether a grant answers a request for this capability. */
export function grantCovers(
  grant: PermissionGrant,
  capability: Pick<PermissionCapability, "id" | "scope">,
): boolean {
  if (grant.capabilityId !== capability.id) return false;
  const scope = normaliseScope(grant.scope);
  return scope === undefined || scope === normaliseScope(capability.scope);
}

/**
 * The grant that answers a request, if any. An exact scope wins over a
 * broader grant, because it is the person's answer about this scope.
 */
export function findGrant(
  grants: readonly PermissionGrant[],
  capability: Pick<PermissionCapability, "id" | "scope">,
): PermissionGrant | undefined {
  const covering = grants.filter((grant) => grantCovers(grant, capability));
  const scope = normaliseScope(capability.scope);
  return covering.find((grant) => normaliseScope(grant.scope) === scope) ?? covering[0];
}

/**
 * The choices offered when none are given.
 *
 * High risk leaves out "Always allow": a standing yes to something that can
 * do real damage should be a deliberate product decision, made by passing
 * `options`, not the default. Without anywhere to keep it (`persistent`
 * false), "always" would be forgotten on reload, so it is not offered either.
 */
export function defaultPermissionOptions(
  risk?: PermissionRisk,
  persistent = true,
): PermissionDecision[] {
  return risk === "high" || !persistent
    ? ["once", "session", "deny"]
    : ["once", "session", "always", "deny"];
}

export interface GrantStoreOptions {
  /** Keeps "always" grants between visits. Without it they last as long as the grant store. */
  store?: PermissionStore;
  /**
   * Called when the store fails to read or write. A failed read counts as no
   * grant, so the person is asked; a failed write keeps the grant for this
   * session. Defaults to `reportError`, so a failure is seen rather than
   * swallowed.
   */
  onError?: (error: unknown) => void;
}

export interface GrantStore {
  /** Whether "always" grants outlive the store (a `store` was given). */
  readonly persistent: boolean;
  /** Grants known now: session ones, and always ones made or found here. Stable until it changes. */
  list: () => readonly PermissionGrant[];
  /** The grant held in memory for this capability. Synchronous. */
  match: (
    capability: Pick<PermissionCapability, "id" | "scope">,
  ) => PermissionGrant | undefined;
  /** Memory first, then the store. Never rejects: a store that fails is a store that said no. */
  lookup: (
    capability: Pick<PermissionCapability, "id" | "scope">,
  ) => Promise<PermissionGrant | undefined>;
  /** Remembers "session" and "always". "once" and "deny" are ignored. */
  remember: (
    capability: Pick<PermissionCapability, "id" | "scope">,
    decision: PermissionDecision,
  ) => void;
  /**
   * Forgets grants for a capability: every scope, or only `scope`. Rejects if
   * the store cannot delete, so a caller can say the revoke did not stick.
   * The store has no way to list keys, so without a scope it deletes the
   * unscoped key and the scoped keys this store has seen.
   */
  revoke: (capabilityId: string, scope?: string) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
}

function defaultOnError(error: unknown) {
  if (typeof reportError === "function") reportError(error);
}

export function createGrantStore({
  store,
  onError = defaultOnError,
}: GrantStoreOptions = {}): GrantStore {
  let grants: readonly PermissionGrant[] = [];
  const listeners = new Set<() => void>();

  function commit(next: readonly PermissionGrant[]) {
    grants = next;
    for (const listener of listeners) listener();
  }

  function put(grant: PermissionGrant) {
    const key = grantKey(grant.capabilityId, grant.scope);
    const existing = grants.find(
      (candidate) => grantKey(candidate.capabilityId, candidate.scope) === key,
    );
    if (existing?.decision === grant.decision) return;
    commit([...grants.filter((candidate) => candidate !== existing), grant]);
  }

  return {
    persistent: store !== undefined,

    list: () => grants,

    match: (capability) => findGrant(grants, capability),

    async lookup(capability) {
      const known = findGrant(grants, capability);
      if (known || !store) return known;

      const scope = normaliseScope(capability.scope);
      const scopes = scope === undefined ? [undefined] : [scope, undefined];
      for (const candidate of scopes) {
        let stored: PermissionDecision | null | undefined;
        try {
          stored = await store.get(grantKey(capability.id, candidate));
        } catch (error) {
          onError(error);
          return undefined;
        }
        if (stored === "always") {
          const grant: PermissionGrant = { capabilityId: capability.id, decision: "always" };
          if (candidate !== undefined) grant.scope = candidate;
          put(grant);
          return grant;
        }
      }
      return undefined;
    },

    remember(capability, decision) {
      if (decision !== "session" && decision !== "always") return;
      const scope = normaliseScope(capability.scope);
      const grant: PermissionGrant = { capabilityId: capability.id, decision };
      if (scope !== undefined) grant.scope = scope;
      put(grant);

      if (decision !== "always" || !store) return;
      try {
        // Resolved rather than checked with instanceof, so a thenable from a
        // storage library is caught too.
        Promise.resolve(store.set(grantKey(capability.id, scope), "always")).catch(onError);
      } catch (error) {
        onError(error);
      }
    },

    async revoke(capabilityId, scope) {
      const only = normaliseScope(scope);
      const removed = grants.filter(
        (grant) =>
          grant.capabilityId === capabilityId &&
          (only === undefined || normaliseScope(grant.scope) === only),
      );
      if (removed.length > 0) commit(grants.filter((grant) => !removed.includes(grant)));
      if (!store) return;

      const keys = new Set(
        only === undefined
          ? [
              grantKey(capabilityId),
              ...removed.map((grant) => grantKey(capabilityId, grant.scope)),
            ]
          : [grantKey(capabilityId, only)],
      );
      await Promise.all([...keys].map((key) => Promise.resolve(store.delete(key))));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
