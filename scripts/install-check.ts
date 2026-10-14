/**
 * Installs every registry item into a new Next.js app and builds it.
 *
 * Everything else in CI runs inside this repository, where `@/components/x`
 * resolves through a folder's index, TypeScript targets a recent ECMAScript
 * and every dependency is already installed. A project that runs
 * `dowel add` has none of that: files land flat in `components/ui`, a new
 * Next.js app targets ES2017, and only the dependencies the registry names
 * are installed. Two releases shipped bugs that only showed there — 22
 * components importing what their sibling's main file did not export, and a
 * regular expression flag ES2017 refuses — with every other check green.
 *
 * It uses this checkout's CLI and a registry built from this checkout, so it
 * tests what is about to ship, not what is already published.
 *
 *   pnpm build && pnpm install-check
 *   pnpm install-check --only button,dialog --keep
 *
 * Flags: `--only a,b` installs just those items; `--keep` leaves the app
 * behind for inspection; `--next <version>` picks the create-next-app version
 * (default `latest`, which is the point of running this nightly).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { installable, type RegistryIndex } from "./lib/installable";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repoRoot, "packages", "cli", "dist", "index.js");

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const only = flag("only")?.split(",").filter(Boolean);
const keep = process.argv.includes("--keep");
const nextVersion = flag("next") ?? "latest";

function run(title: string, command: string, args: string[], cwd: string): void {
  console.log(`\n▸ ${title}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${title} failed (${command} exited ${String(result.status)}).`);
    console.error(`  The app is at ${cwd}: rerun with --keep to inspect it.`);
    process.exit(1);
  }
}

if (!existsSync(cli)) {
  console.error("✗ packages/cli is not built. Run `pnpm build` first.");
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "dowel-install-check-"));
const registry = join(work, "r");
const app = join(work, "app");

process.on("exit", () => {
  if (keep) console.log(`\nKept: ${work}`);
  else rmSync(work, { recursive: true, force: true });
});

run(
  "Build the registry from this checkout",
  "pnpm",
  ["--filter", "@dowel-ui/registry", "exec", "tsx", "src/build.ts", "--out", registry],
  repoRoot,
);

run(
  `Create a Next.js app (create-next-app@${nextVersion})`,
  "npx",
  [
    "-y",
    `create-next-app@${nextVersion}`,
    "app",
    "--ts",
    "--tailwind",
    "--eslint",
    "--app",
    "--src-dir",
    "--import-alias",
    "@/*",
    "--use-npm",
    "--no-turbopack",
    "--yes",
  ],
  work,
);

const dowel = (...args: string[]) => [cli, "--cwd", app, "--registry", registry, ...args];

run("dowel init", "node", dowel("init", "--yes"), app);

const index = JSON.parse(readFileSync(join(registry, "index.json"), "utf8")) as RegistryIndex;

// The registry is generated from the UI package's build output, so a stale
// build quietly leaves newer components out, and the check passes without them.
const components = join(repoRoot, "packages", "ui", "src", "components");
const onDisk = readdirSync(components).filter((name) =>
  existsSync(join(components, name, "meta.ts")),
).length;
const built = index.items.filter((item) => item.type === "registry:ui").length;
if (built < onDisk) {
  console.error(
    `✗ The registry has ${String(built)} components and the source has ${String(onDisk)}. ` +
      "Run `pnpm build` first.",
  );
  process.exit(1);
}
const names = installable(index, (name) => existsSync(join(registry, `${name}.json`)), only);
if (names.length === 0) {
  console.error("✗ Nothing to install: the registry has no items matching the selection.");
  process.exit(1);
}

run(
  `dowel add: ${String(names.length)} items`,
  "node",
  dowel("add", ...names, "--yes", "--overwrite"),
  app,
);
run("Type-check the app", "npx", ["tsc", "--noEmit"], app);
run("Build the app", "npm", ["run", "build"], app);

console.log(`\n✓ ${String(names.length)} registry items install, type-check and build.`);
