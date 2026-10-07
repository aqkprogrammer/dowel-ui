import * as prompts from "@clack/prompts";

import { branding } from "../branding";
import {
  authPath,
  canCarryCredentials,
  clearToken,
  maskToken,
  readCredentials,
  readToken,
  TOKEN_ENV,
  writeToken,
} from "../lib/auth";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { REQUEST_TIMEOUT_MS } from "../lib/registry-client";

/**
 * Signing in, out, and asking who you are.
 *
 * The key is checked against the registry before it is written. Storing an
 * unverified key means the first thing that fails is an install, days later,
 * with an error about a component rather than about a licence.
 */

export interface LoginOptions {
  registry: string;
  /** Supplied non-interactively. Prompted for when absent. */
  token?: string;
  yes: boolean;
}

interface LicenseResponse {
  valid: boolean;
  /** What the licence covers, for the confirmation message. */
  plan?: string;
  /** Who it belongs to. Never an email — that is not ours to print. */
  holder?: string;
  /** ISO date the licence lapses, when it does. */
  expiresAt?: string;
  /** Why it was rejected. */
  reason?: string;
}

/** Where the registry answers questions about a licence. */
function licenseEndpoint(registry: string): string {
  return `${registry.replace(/\/$/, "")}/license`;
}

/**
 * Asks the registry whether a key is good.
 *
 * A network failure is reported as a network failure rather than as an invalid
 * key: telling someone their licence is bad when the truth is that their wifi
 * dropped sends them to support instead of to the router.
 */
export async function verify(registry: string, token: string): Promise<LicenseResponse> {
  const url = licenseEndpoint(registry);

  if (!canCarryCredentials(url)) {
    throw new CliError(
      `Not sending a licence key to ${url}: it is not an HTTPS address.`,
      "Use the registry's https:// URL.",
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new CliError(
      `Could not reach ${url} to check the licence.`,
      cause instanceof Error ? cause.message : undefined,
    );
  }

  // No licence endpoint: a private registry, most likely static files behind
  // something that checks a key. The key is good if it opens the index.
  if (response.status === 404) return verifyByIndex(registry, token);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // A private registry behind a proxy that checks the key answers a bad one
    // with a bare 401 before any route is reached.
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: "The registry did not accept this key." };
    }
    throw new CliError(`${url} did not return a licence answer this CLI understands.`);
  }

  const answer = body as LicenseResponse;
  if (typeof answer !== "object" || answer === null || typeof answer.valid !== "boolean") {
    throw new CliError(`${url} did not return a licence answer this CLI understands.`);
  }

  return answer;
}

/**
 * Checks a key against a registry that has no licence endpoint, by asking for
 * its index with the key.
 */
async function verifyByIndex(registry: string, token: string): Promise<LicenseResponse> {
  const url = `${registry.replace(/\/$/, "")}/index.json`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new CliError(
      `Could not reach ${url} to check the key.`,
      cause instanceof Error ? cause.message : undefined,
    );
  }
  if (response.ok) return { valid: true };
  if (response.status === 401 || response.status === 403) {
    return { valid: false, reason: "The registry did not accept this key." };
  }
  throw new CliError(
    `${registry} has no licence endpoint, and its index answered ${String(response.status)}.`,
    "Check the registry URL.",
  );
}

export async function login(options: LoginOptions): Promise<void> {
  let token = options.token?.trim();

  if (!token) {
    if (options.yes) {
      throw new CliError(
        "No licence key given.",
        `Pass one as an argument, or set ${TOKEN_ENV}.`,
      );
    }

    const answer = await prompts.password({
      // A password prompt, so the key is not echoed into the terminal and from
      // there into a screenshot or a scrollback buffer.
      message: "Licence key",
      validate: (value) =>
        (value ?? "").trim().length === 0 ? "Paste your licence key." : undefined,
    });

    if (prompts.isCancel(answer)) throw new CliError("Cancelled — nothing was stored.");
    token = answer.trim();
  }

  logger.step("Checking the licence");
  const answer = await verify(options.registry, token);

  if (!answer.valid) {
    throw new CliError(
      answer.reason ?? "That licence key was not accepted.",
      "Check it against the one you were issued.",
    );
  }

  const path = writeToken(token, process.env, options.registry);

  logger.blank();
  logger.success(`Signed in${answer.plan ? ` on ${answer.plan}` : ""}.`);
  if (answer.holder) logger.info(pc.dim(`  Licensed to ${answer.holder}`));
  if (answer.expiresAt) logger.info(pc.dim(`  Active until ${answer.expiresAt}`));
  logger.blank();
  logger.info(pc.dim(`  For ${options.registry}`));
  logger.info(pc.dim(`Stored in ${path}, readable only by you.`));
  logger.info(pc.dim(`For CI, set ${TOKEN_ENV} instead of committing anything.`));
}

export function logout(registry?: string): void {
  const removed = clearToken(process.env, registry);

  logger.blank();
  if (removed) {
    logger.success(registry ? `Signed out of ${registry}.` : "Signed out of every registry.");
  } else {
    logger.info(
      registry ? `No key is stored for ${registry}.` : "Not signed in — nothing to remove.",
    );
  }

  // Said whether or not a file was removed: an environment variable outranks
  // the file, so someone who "logged out" and is still authenticated deserves
  // to know why rather than discovering it through behaviour.
  if (process.env[TOKEN_ENV]) {
    logger.blank();
    logger.warn(`${TOKEN_ENV} is still set in this shell, and it takes precedence.`);
    logger.info(pc.dim(`  Unset it to be fully signed out: unset ${TOKEN_ENV}`));
  }
}

export interface WhoamiOptions {
  /** Defaults to the registry the key belongs to. */
  registry?: string;
  /** Ask the registry, rather than only reporting what is stored. */
  check: boolean;
}

export async function whoami(options: WhoamiOptions): Promise<void> {
  const all = readCredentials();
  const credentials = options.registry ? readToken(process.env, options.registry) : all[0];

  logger.blank();
  if (all.length > 1) {
    logger.info(pc.dim("Keys on this machine:"));
    for (const entry of all) {
      const from = entry.source === "env" ? TOKEN_ENV : "stored";
      logger.info(`  ${maskToken(entry.token)}  ${entry.registry}  ${pc.dim(`(${from})`)}`);
    }
    logger.blank();
  }
  if (!credentials) {
    logger.info("Not signed in.");
    logger.blank();
    logger.info(pc.dim(`Run \`npx ${branding.cliPackage} login\` with your licence key.`));
    return;
  }

  const from = credentials.source === "env" ? `${TOKEN_ENV} (this shell)` : authPath();
  logger.success(`Signed in with ${maskToken(credentials.token)}`);
  logger.info(pc.dim(`  from ${from}`));
  logger.info(pc.dim(`  for ${credentials.registry}`));

  if (!options.check) {
    logger.blank();
    logger.info(pc.dim("Pass --check to ask the registry whether it is still active."));
    return;
  }

  const answer = await verify(options.registry ?? credentials.registry, credentials.token);

  logger.blank();
  if (!answer.valid) {
    logger.error(answer.reason ?? "The registry does not accept this licence.");
    process.exitCode = 1;
    return;
  }

  logger.success(`Active${answer.plan ? ` on ${answer.plan}` : ""}.`);
  if (answer.holder) logger.info(pc.dim(`  Licensed to ${answer.holder}`));
  if (answer.expiresAt) logger.info(pc.dim(`  Active until ${answer.expiresAt}`));
}
