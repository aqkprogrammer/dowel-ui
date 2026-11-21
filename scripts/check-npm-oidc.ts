/**
 * Asks npm whether it will accept this workflow run's identity for each
 * package — trusted publishing — without publishing anything.
 *
 *   node scripts/check-npm-oidc.ts <package> [<package>...]
 *   node scripts/check-npm-oidc.ts <directory of tarballs>
 *
 * When trusted publishing fails, `npm publish` says only ENEEDAUTH: it does
 * not say whether the job had no OIDC token, whether GitHub refused one, or
 * whether npm refused the exchange and why. 0.14.1's release stopped there
 * with nothing to go on. This does the same two steps npm does and prints
 * each answer: the token's claims (none of them secret) beside npm's reply
 * to the exchange. It never prints a token.
 *
 * Like publish-tarballs.ts it imports nothing that had to be installed,
 * because it runs in the job that holds publishing rights.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REGISTRY = "https://registry.npmjs.org";
const AUDIENCE = "npm:registry.npmjs.org";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function namesFromTarballs(directory: string): string[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".tgz"))
    .sort()
    .map((file) => {
      const result = spawnSync(
        "tar",
        ["-xOzf", join(directory, file), "package/package.json"],
        {
          encoding: "utf8",
        },
      );
      if (result.status !== 0) fail(`Could not read package.json from ${file}.`);
      return (JSON.parse(result.stdout) as { name: string }).name;
    });
}

const args = process.argv.slice(2);
if (args.length === 0) {
  fail("usage: node scripts/check-npm-oidc.ts <package>... | <directory of tarballs>");
}
const first = args[0] ?? "";
const packages =
  args.length === 1 && existsSync(first) && statSync(first).isDirectory()
    ? namesFromTarballs(first)
    : args;

const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!requestUrl || !requestToken) {
  fail(
    "This job has no GitHub OIDC token to offer npm. The job needs `permissions: id-token: write` (and it is never given to Dependabot or fork pull requests).",
  );
}

const tokenResponse = await fetch(`${requestUrl}&audience=${encodeURIComponent(AUDIENCE)}`, {
  headers: { authorization: `Bearer ${requestToken}` },
});
if (!tokenResponse.ok) {
  fail(`GitHub refused an OIDC token: HTTP ${String(tokenResponse.status)}.`);
}
const idToken = ((await tokenResponse.json()) as { value?: string }).value;
if (!idToken) fail("GitHub's OIDC response had no token in it.");

// The claims npm matches against each package's trusted publisher.
const payload = idToken.split(".")[1] ?? "";
const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
  string,
  unknown
>;
console.log("GitHub OIDC claims npm checks:");
for (const key of [
  "repository",
  "repository_owner",
  "workflow_ref",
  "job_workflow_ref",
  "environment",
  "ref",
  "event_name",
  "aud",
]) {
  console.log(`  ${key}: ${JSON.stringify(claims[key] ?? null)}`);
}

let refused = 0;
for (const name of packages) {
  const escaped = name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : name;
  const response = await fetch(`${REGISTRY}/-/npm/v1/oidc/token/exchange/package/${escaped}`, {
    method: "POST",
    headers: { authorization: `Bearer ${idToken}` },
  });
  if (response.ok) {
    console.log(`✓ npm accepts this workflow for ${name}.`);
    continue;
  }
  refused += 1;
  const body = await response.text();
  let reason = body;
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    reason = parsed.message ?? parsed.error ?? body;
  } catch {
    // Not JSON: print it as it came.
  }
  console.error(
    `✗ npm refused ${name}: HTTP ${String(response.status)} ${reason.slice(0, 300)}`,
  );
}

if (refused > 0) {
  fail(
    `npm refused ${String(refused)} of ${String(packages.length)}. Compare the claims above with \`npm trust list <package>\`.`,
  );
}
