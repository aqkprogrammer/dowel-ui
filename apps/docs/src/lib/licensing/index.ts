import { createHash } from "node:crypto";

import { createPolarProvider, polarConfigFromEnv } from "./polar";
import { invalid, type License, type Environment, type LicenseProvider } from "./provider";

export { invalid } from "./provider";
export type { Environment, License, LicenseProvider } from "./provider";

/**
 * Choosing a licence provider, and what happens when there is not one.
 *
 * Unconfigured means **refuse**, not allow. A registry that hands out licensed
 * source because an environment variable is missing is a registry that gives
 * everything away the first time a deployment is misconfigured, silently, and
 * for as long as nobody notices. Failing closed makes that a support ticket
 * instead of a leak.
 */

/** Rejects everything, and says why, so a misconfiguration is diagnosable. */
function unconfiguredProvider(): LicenseProvider {
  return {
    name: "unconfigured",
    check: () =>
      Promise.resolve(
        invalid("Licensing is not configured on this registry, so nothing can be verified."),
      ),
  };
}

/**
 * A provider driven by an environment variable, for local development.
 *
 * Double-gated: it needs its own variable set *and* a non-production
 * environment. A test key that works in production is a free licence for
 * anyone who reads this file, and this file is public.
 */
function developmentProvider(keys: string): LicenseProvider {
  const accepted = new Set(
    keys
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );

  return {
    name: "development",
    check: (key) =>
      Promise.resolve(
        accepted.has(key)
          ? { valid: true, plan: "Development", holder: "Local development" }
          : invalid("That licence key was not recognised."),
      ),
  };
}

export function resolveProvider(env: Environment = process.env): LicenseProvider {
  const polar = polarConfigFromEnv(env);
  if (polar) return createPolarProvider(polar);

  const development = env.DOWEL_DEV_LICENSE_KEYS;
  if (development && env.NODE_ENV !== "production") {
    return developmentProvider(development);
  }

  return unconfiguredProvider();
}

/**
 * A short-lived cache of validation answers.
 *
 * Installing a block resolves several items, and asking the provider once per
 * item turns one command into a burst of upstream calls. Sixty seconds is long
 * enough to cover a single install and short enough that a revoked key stops
 * working while the person who revoked it is still watching.
 *
 * Keyed by a hash, never by the key: this map is in memory, but a raw secret in
 * a data structure is a raw secret in a heap dump.
 */
const TTL_MS = 60_000;

interface CacheEntry {
  license: License;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function fingerprint(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function checkLicense(
  key: string,
  provider: LicenseProvider = resolveProvider(),
): Promise<License> {
  const id = fingerprint(key);
  const hit = cache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit.license;

  const license = await provider.check(key);

  // Rejections are cached too, and for the same short window. Not caching them
  // turns a wrong key pasted into a script into unlimited upstream traffic.
  cache.set(id, { license, expiresAt: Date.now() + TTL_MS });
  return license;
}

/** Only for tests, which must not inherit another test's cached answer. */
export function clearLicenseCache(): void {
  cache.clear();
}

/**
 * The bearer token on a request, if there is one.
 *
 * Case-insensitive scheme, because `Bearer` and `bearer` are both correct and
 * rejecting one of them produces a bug report that reads "it works in curl".
 */
export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;

  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : undefined;
}
