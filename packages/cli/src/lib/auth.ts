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

const authFileSchema = z.object({
  /** The licence key, as issued. */
  token: z.string().min(1),
  /** When it was stored, for the benefit of a human reading the file. */
  storedAt: z.string().optional(),
  /**
   * The registry the key was verified against, and the only one it is sent
   * to. Absent in files written before keys were scoped, which were all
   * verified against the default registry.
   */
  registry: z.string().optional(),
});

export type AuthFile = z.infer<typeof authFileSchema>;

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

export function readToken(env: NodeJS.ProcessEnv = process.env): ResolvedToken | undefined {
  const fromEnv = env[TOKEN_ENV];
  if (fromEnv && fromEnv.trim().length > 0) {
    const registry = env[TOKEN_REGISTRY_ENV]?.trim();
    return {
      token: fromEnv.trim(),
      source: "env",
      registry: registry && registry.length > 0 ? registry : branding.registryUrl,
    };
  }

  const path = authPath(env);
  if (!existsSync(path)) return undefined;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new CliError(
      `The stored credentials at ${path} are not valid JSON.`,
      "Run `logout` and log in again.",
    );
  }

  const parsed = authFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CliError(
      `The stored credentials at ${path} are not in a format this CLI understands.`,
      "Run `logout` and log in again.",
    );
  }

  return {
    token: parsed.data.token,
    source: "file",
    registry: parsed.data.registry ?? branding.registryUrl,
  };
}

export function writeToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  registry: string = branding.registryUrl,
): string {
  const path = authPath(env);
  mkdirSync(dirname(path), { recursive: true });

  const contents: AuthFile = { token, storedAt: new Date().toISOString(), registry };
  writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`, { mode: 0o600 });

  // Set explicitly as well as passed to writeFileSync: the mode argument only
  // applies when the file is created, so re-logging in on a file that already
  // exists with looser permissions would silently keep them.
  chmodSync(path, 0o600);

  return path;
}

/** Removes stored credentials. Returns whether there were any. */
export function clearToken(env: NodeJS.ProcessEnv = process.env): boolean {
  const path = authPath(env);
  if (!existsSync(path)) return false;
  rmSync(path);
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

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * The key to send to a registry, or nothing when there is no key.
 *
 * Throws, rather than quietly sending nothing, when there is a key and this
 * registry is not the one it belongs to. The registry comes from
 * `components.json`, which is part of whatever repository the command runs
 * in. Without this check, a cloned repository could name its own server, mark
 * an item as licensed, and collect the key of everyone who installs it.
 */
export function credentialsFor(
  registryUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedToken | undefined {
  const credentials = readToken(env);
  if (!credentials) return undefined;

  if (!canCarryCredentials(registryUrl)) {
    throw new CliError(
      `Not sending your licence key to ${registryUrl}: it is not an HTTPS address.`,
      "Use the registry's https:// URL.",
    );
  }

  const target = originOf(registryUrl);
  const owner = originOf(credentials.registry);
  if (target === undefined || target !== owner) {
    throw new CliError(
      `Not sending your licence key to ${target ?? registryUrl}. It was issued for ${owner ?? credentials.registry}.`,
      credentials.source === "env"
        ? `If you trust this registry, set ${TOKEN_REGISTRY_ENV}=${registryUrl}.`
        : `If you trust this registry, sign in to it: login --registry ${registryUrl}`,
    );
  }

  return credentials;
}
