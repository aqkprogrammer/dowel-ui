import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

import { branding } from "../branding";
import { CliError } from "./errors";

/**
 * Where a licence key lives, and how it is read.
 *
 * Not in the project. A licence belongs to a person, not to a repository, and a
 * key written into `components.json` is a key committed to git — which is how
 * these leak. It goes in the user's own config directory, readable only by
 * them.
 *
 * The environment variable wins over the file, because CI has no interactive
 * login and no home directory worth writing to. That is also the only form
 * anyone should use in automation: a key in a shell history is a key in a shell
 * history, but a key in a secrets store is not.
 */

export const TOKEN_ENV = "DOWEL_TOKEN";

/**
 * Which registry `DOWEL_TOKEN` is for, when it is not the default one.
 *
 * A stored key remembers the registry it was verified against; a key in the
 * environment has nowhere to record that, so this says it instead.
 */
export const TOKEN_REGISTRY_ENV = "DOWEL_TOKEN_REGISTRY";

/**
 * The first format: one key. Still read, so a machine that signed in before
 * keys were stored per registry stays signed in.
 */
const legacyAuthFileSchema = z.object({
  /** The licence key, as issued. */
  token: z.string().min(1),
  /** When it was stored, for the benefit of a human reading the file. */
  storedAt: z.string().optional(),
  /**
   * The registry the key was verified against. Absent in files written before
   * keys were scoped, which were all verified against the default registry.
   */
  registry: z.string().optional(),
});

const storedCredentialSchema = z.object({
  /** The registry the key was verified against, and the only one it is sent to. */
  registry: z.string().min(1),
  token: z.string().min(1),
  storedAt: z.string().optional(),
});

/**
 * One key per registry.
 *
 * A person can hold a Pro licence and their company's private registry key at
 * once; signing in to one must not sign them out of the other.
 */
const authFileSchema = z.object({
  version: z.literal(2),
  credentials: z.array(storedCredentialSchema),
});

export type AuthFile = z.infer<typeof authFileSchema>;
export type StoredCredential = z.infer<typeof storedCredentialSchema>;

/**
 * `XDG_CONFIG_HOME` when set, the platform default otherwise.
 *
 * Respected rather than assumed: someone who has moved their config directory
 * has done so deliberately, and scattering a file into `~/.config` anyway is
 * both rude and hard to find later.
 */
export function configDirectory(env: NodeJS.ProcessEnv = process.env): string {
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0) return join(xdg, "dowel");
  return join(homedir(), ".config", "dowel");
}

export function authPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDirectory(env), "auth.json");
}

export interface ResolvedToken {
  token: string;
  /** Where it came from, so `whoami` can say and errors can be specific. */
  source: "env" | "file";
  /** The registry the key belongs to. It is never sent anywhere else. */
  registry: string;
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** The stored keys, oldest format included. Empty when nothing is stored. */
function readStored(env: NodeJS.ProcessEnv): StoredCredential[] {
  const path = authPath(env);
  if (!existsSync(path)) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new CliError(
      `The stored credentials at ${path} are not valid JSON.`,
      "Run `logout` and log in again.",
    );
  }

  const current = authFileSchema.safeParse(raw);
  if (current.success) return current.data.credentials;

  const legacy = legacyAuthFileSchema.safeParse(raw);
  if (legacy.success) {
    return [
      {
        registry: legacy.data.registry ?? branding.registryUrl,
        token: legacy.data.token,
        storedAt: legacy.data.storedAt,
      },
    ];
  }

  throw new CliError(
    `The stored credentials at ${path} are not in a format this CLI understands.`,
    "Run `logout` and log in again.",
  );
}

function writeStored(env: NodeJS.ProcessEnv, credentials: StoredCredential[]): string {
  const path = authPath(env);
  if (credentials.length === 0) {
    rmSync(path, { force: true });
    return path;
  }
  mkdirSync(dirname(path), { recursive: true });
  const contents: AuthFile = { version: 2, credentials };
  writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`, { mode: 0o600 });

  // Set explicitly as well as passed to writeFileSync: the mode argument only
  // applies when the file is created, so re-logging in on a file that already
  // exists with looser permissions would silently keep them.
  chmodSync(path, 0o600);
  return path;
}

/** The key in the environment, if any, with the registry it belongs to. */
function fromEnvironment(env: NodeJS.ProcessEnv): ResolvedToken | undefined {
  const token = env[TOKEN_ENV]?.trim();
  if (!token) return undefined;
  const registry = env[TOKEN_REGISTRY_ENV]?.trim();
  return {
    token,
    source: "env",
    registry: registry && registry.length > 0 ? registry : branding.registryUrl,
  };
}

/** Every key available on this machine: the environment's first, then the stored ones. */
export function readCredentials(env: NodeJS.ProcessEnv = process.env): ResolvedToken[] {
  const fromEnv = fromEnvironment(env);
  const stored = readStored(env).map((entry): ResolvedToken => ({
    token: entry.token,
    source: "file",
    registry: entry.registry,
  }));
  return fromEnv ? [fromEnv, ...stored] : stored;
}

/**
 * The key for a registry, or with no registry given, the first key there is.
 *
 * The environment wins over the file, because CI has no interactive login.
 */
export function readToken(
  env: NodeJS.ProcessEnv = process.env,
  registry?: string,
): ResolvedToken | undefined {
  const all = readCredentials(env);
  if (registry === undefined) return all[0];
  const origin = originOf(registry);
  return all.find((credential) => originOf(credential.registry) === origin);
}

/** Stores a key for a registry, replacing any key already stored for it. */
export function writeToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  registry: string = branding.registryUrl,
): string {
  const origin = originOf(registry);
  const others = readStored(env).filter((entry) => originOf(entry.registry) !== origin);
  return writeStored(env, [...others, { registry, token, storedAt: new Date().toISOString() }]);
}

/**
 * Removes the stored key for one registry, or every stored key. Returns whether
 * there was anything to remove.
 */
export function clearToken(env: NodeJS.ProcessEnv = process.env, registry?: string): boolean {
  const stored = readStored(env);
  if (stored.length === 0) return false;
  if (registry === undefined) {
    writeStored(env, []);
    return true;
  }
  const origin = originOf(registry);
  const kept = stored.filter((entry) => originOf(entry.registry) !== origin);
  if (kept.length === stored.length) return false;
  writeStored(env, kept);
  return true;
}

/**
 * A key with all but its last four characters hidden.
 *
 * Printed instead of the key itself, everywhere. A CLI that echoes a secret
 * puts it in the scrollback, in the CI log, and in the screenshot someone
 * pastes into an issue.
 */
export function maskToken(token: string): string {
  if (token.length <= 4) return "•".repeat(token.length);
  return `${"•".repeat(Math.min(12, token.length - 4))}${token.slice(-4)}`;
}

/**
 * Whether a key may travel to this URL at all.
 *
 * HTTPS, or plain HTTP to this machine for a registry under development.
 * Anything else sends the key across the network in the clear.
 */
export function canCarryCredentials(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  return (
    parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  );
}

/**
 * The key to send to a registry, or nothing when there is no key at all.
 *
 * Throws, rather than quietly sending nothing, when there are keys and none
 * belongs to this registry. The registry comes from `components.json`, which
 * is part of whatever repository the command runs in. Without this check, a
 * cloned repository could name its own server, mark an item as licensed, and
 * collect the key of everyone who installs it.
 */
export function credentialsFor(
  registryUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedToken | undefined {
  const all = readCredentials(env);
  if (all.length === 0) return undefined;

  // First, so a key meant for https://host is never sent to http://host —
  // whose origin differs, and which would otherwise read as a different registry.
  if (!canCarryCredentials(registryUrl)) {
    throw new CliError(
      `Not sending your licence key to ${registryUrl}: it is not an HTTPS address.`,
      "Use the registry's https:// URL.",
    );
  }

  const target = originOf(registryUrl);
  const match = all.find((credential) => originOf(credential.registry) === target);

  if (match === undefined || target === undefined) {
    const owners = [
      ...new Set(all.map((credential) => originOf(credential.registry) ?? credential.registry)),
    ];
    throw new CliError(
      `Not sending your licence key to ${target ?? registryUrl}. Keys on this machine are for ${owners.join(", ")}.`,
      all[0]?.source === "env"
        ? `If you trust this registry, set ${TOKEN_REGISTRY_ENV}=${registryUrl}.`
        : `If you trust this registry, sign in to it: login --registry ${registryUrl}`,
    );
  }

  return match;
}
