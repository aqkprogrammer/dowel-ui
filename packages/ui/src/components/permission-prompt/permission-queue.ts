import {
  createGrantStore,
  defaultPermissionOptions,
  type GrantStore,
  type PermissionCapability,
  type PermissionDecision,
} from "./permission-grants";

/**
 * Requests for permission, one in front of the person at a time.
 *
 * Kept outside React so the rules are tested directly: a request that a
 * remembered grant already answers never reaches the person; the rest wait
 * in the order they were made; and an answer of "for this session" also
 * answers the requests queued behind it for the same capability, rather than
 * asking the same question twice in a row.
 */

export interface PermissionRequestDetails {
  /** Who is asking: "Claude". */
  requester: string;
  /** Why, as a phrase that follows the title: "to find a free slot". */
  reason?: string;
  /** Choices to offer. Defaults to `defaultPermissionOptions`. */
  options?: PermissionDecision[];
}

export interface PermissionRequest extends PermissionRequestDetails {
  /** Unique per request, for React keys. */
  id: string;
  capability: PermissionCapability;
  options: PermissionDecision[];
}

export interface PermissionQueueSnapshot {
  /** The request in front of the person, if any. */
  current: PermissionRequest | null;
  /** How many are waiting behind it. */
  waiting: number;
  /** The most recent request answered by the person, and their answer. */
  last: { request: PermissionRequest; decision: PermissionDecision } | null;
}

export interface PermissionQueue {
  readonly grants: GrantStore;
  /** Resolves with the person's answer, or at once with a remembered grant's. */
  request: (
    capability: PermissionCapability,
    details: PermissionRequestDetails,
  ) => Promise<PermissionDecision>;
  /** Answers a waiting request. An id that is not waiting is ignored. */
  decide: (requestId: string, decision: PermissionDecision) => void;
  getSnapshot: () => PermissionQueueSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Refuses everything waiting, and every request until `open`. */
  close: () => void;
  open: () => void;
}

interface Entry {
  request: PermissionRequest;
  resolve: (decision: PermissionDecision) => void;
}

export function createPermissionQueue(
  grants: GrantStore = createGrantStore(),
): PermissionQueue {
  let entries: Entry[] = [];
  let last: PermissionQueueSnapshot["last"] = null;
  let snapshot: PermissionQueueSnapshot = { current: null, waiting: 0, last: null };
  let closed = false;
  let count = 0;
  // Store reads are chained so requests reach the person in the order they
  // were made, however long each read takes.
  let reads: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  function commit(next: Entry[]) {
    entries = next;
    snapshot = {
      current: entries[0]?.request ?? null,
      waiting: Math.max(entries.length - 1, 0),
      last,
    };
    for (const listener of listeners) listener();
  }

  function enqueue(capability: PermissionCapability, details: PermissionRequestDetails) {
    return new Promise<PermissionDecision>((resolve) => {
      if (closed) {
        resolve("deny");
        return;
      }
      // Answered while the store was being read, by a decision on an earlier request.
      const answered = grants.match(capability);
      if (answered) {
        resolve(answered.decision);
        return;
      }
      count += 1;
      const request: PermissionRequest = {
        ...details,
        id: `permission-request-${String(count)}`,
        capability,
        options:
          details.options ?? defaultPermissionOptions(capability.risk, grants.persistent),
      };
      commit([...entries, { request, resolve }]);
    });
  }

  return {
    grants,

    request(capability, details) {
      if (closed) return Promise.resolve("deny");
      const known = grants.match(capability);
      if (known) return Promise.resolve(known.decision);

      // A lookup that fails counts as no grant: the person is asked.
      const found = reads.then(() => grants.lookup(capability)).catch(() => undefined);
      reads = found;
      return found.then((grant) => grant?.decision ?? enqueue(capability, details));
    },

    decide(requestId, decision) {
      const entry = entries.find((candidate) => candidate.request.id === requestId);
      if (!entry) return;
      grants.remember(entry.request.capability, decision);

      const answered: [Entry, PermissionDecision][] = [];
      const rest = entries.filter((candidate) => {
        if (candidate === entry) return false;
        const grant = grants.match(candidate.request.capability);
        if (grant) answered.push([candidate, grant.decision]);
        return !grant;
      });
      last = { request: entry.request, decision };
      commit(rest);

      entry.resolve(decision);
      for (const [candidate, remembered] of answered) candidate.resolve(remembered);
    },

    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    close() {
      closed = true;
      const refused = entries;
      if (refused.length === 0) return;
      commit([]);
      // Fail closed: nothing is left waiting on a question nobody can see.
      for (const entry of refused) entry.resolve("deny");
    },

    open() {
      closed = false;
    },
  };
}
