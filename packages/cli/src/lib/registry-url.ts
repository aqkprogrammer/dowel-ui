import { branding } from "../branding";

/**
 * Origins the default registry has been served from before.
 *
 * `init` writes the registry URL into each project's components.json, so a
 * project created by an older CLI keeps naming the old host for as long as it
 * exists, whichever CLI version later reads it. The old host still answers
 * (it redirects), but a redirect to another origin drops the `Authorization`
 * header, so a licensed install would arrive at the new host without its key.
 * Rewriting the origin here, before any request is made, avoids the redirect
 * altogether.
 *
 * Origins only, never paths: a mirror that happens to live under a different
 * path on one of these hosts is not ours to move.
 */
export const LEGACY_REGISTRY_ORIGINS: readonly string[] = ["https://dowel-eight.vercel.app"];

function parse(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

/** Whether a registry URL names a host the default registry has moved away from. */
export function isLegacyRegistry(url: string): boolean {
  const parsed = parse(url);
  return parsed !== undefined && LEGACY_REGISTRY_ORIGINS.includes(parsed.origin);
}

/**
 * The URL to actually use for a registry.
 *
 * A legacy default registry is moved to the current one, keeping the rest of
 * the URL; anything else — another registry, a `file:` URL, a directory on
 * disk — is returned exactly as given.
 */
export function canonicalRegistry(url: string): string {
  if (!isLegacyRegistry(url)) return url;
  const legacy = new URL(url);
  const current = new URL(branding.registryUrl);
  return `${current.origin}${legacy.pathname}${legacy.search}`;
}
