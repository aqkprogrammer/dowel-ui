/**
 * What the registry needs to know about a licence, and nothing more.
 *
 * An interface rather than calls to a vendor scattered through the route
 * handlers, because the vendor is a choice and the registry's behaviour is not.
 * Swapping billing providers should be writing one adapter, not auditing every
 * place a key is checked.
 */

/**
 * The environment, as this code reads it.
 *
 * Not `NodeJS.ProcessEnv`: Next augments that global, so a plain object of
 * variables — which is exactly what a test wants to pass — is no longer
 * assignable to it. What this needs is a bag of optional strings, and saying so
 * keeps the functions callable with one.
 */
export type Environment = Record<string, string | undefined>;

export interface License {
  valid: boolean;
  /** The plan the key is on, used to decide what it covers. */
  plan?: string;
  /** A display name. Never an email — that is not the registry's to hand out. */
  holder?: string;
  /** ISO date the licence lapses, when it does. */
  expiresAt?: string;
  /**
   * Registry item names this licence covers.
   *
   * `undefined` means "everything licensed". A provider that models per-product
   * entitlements returns the list; one that sells a single plan does not need
   * to.
   */
  entitlements?: string[];
  /** Why it was rejected, in words a customer can act on. */
  reason?: string;
}

export interface LicenseProvider {
  /** A name for logs and for the health endpoint. Never includes a secret. */
  readonly name: string;
  check(key: string): Promise<License>;
}

/** A rejection with a reason, which is the only kind worth returning. */
export function invalid(reason: string): License {
  return { valid: false, reason };
}
