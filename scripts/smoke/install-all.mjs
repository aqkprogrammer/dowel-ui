/**
 * Installs every free registry item into a fresh app and builds it.
 *
 * The release check RELEASING.md describes, automated: the check that has
 * caught the most real bugs, because it is the only one that sees a component
 * the way a user receives it — rewritten into someone else's project, with its
 * npm dependencies resolved from scratch, compiled by their Next.js. It found
 * 22 components importing names only their folder's index exported, and a
 * regex flag a new app's target rejected; every repository test passed both.
 *
 * Everything is local: the scaffolder and CLI from their `dist`, the registry
 * from `packages/registry/r`. Only npm packages come from the network.
 *
 *   1. create-dowel-app (the SaaS template, so its own pages are built too),
 *      with --skip-components --skip-install
 *   2. npm install
 *   3. dowel init, then dowel add <every free component and block> — the CLI
 *      installs their npm dependencies itself, as it would for a user
 *   4. a page importing every installed module, because `next build` only
 *      compiles what something imports, and a component nothing imports is
 *      a component whose "use client" is never checked
 *   5. tsc --noEmit, then next build
 *
 * Plain JavaScript with no dependencies, like binaries.mjs. Build first:
 *
 *   pnpm turbo run build --filter=@dowel-ui/cli --filter=create-dowel-app --filter=@dowel-ui/registry
 *   node scripts/smoke/install-all.mjs [--keep]
 *
 * --keep leaves the app on disk and prints where, for poking at a failure.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registry = join(root, "packages", "registry", "r");
const cli = join(root, "packages", "cli", "dist", "index.js");
const scaffolder = join(root, "packages", "create-dowel-app", "dist", "index.js");
const keep = process.argv.includes("--keep");

for (const path of [cli, scaffolder, join(registry, "index.json")]) {
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Build the CLI, the scaffolder and the registry first.`);
    process.exit(1);
  }
}

/** @type {unknown} */
const parsed = JSON.parse(readFileSync(join(registry, "index.json"), "utf8"));
const index = /** @type {{ items: { name: string; type: string; access?: string }[] }} */ (
  parsed
);
const items = index.items;

// Components and blocks. The lib and the theme are what `init` installs; Pro
// items need a licence and are served by the gated route, not from disk.
const free = items
  .filter((item) => item.type === "registry:ui" || item.type === "registry:block")
  .filter((item) => (item.access ?? "free") === "free")
  .map((item) => item.name);
const pro = items.filter((item) => item.access === "pro").map((item) => item.name);

const started = Date.now();
const seconds = () => `${String(Math.round((Date.now() - started) / 1000))}s`;

/**
 * Runs a step and stops the whole check on the first failure: every later
 * step depends on the one before, so carrying on would only bury the cause.
 *
 * @param {string} label
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function step(label, command, args, cwd) {
  console.log(`\n[${seconds()}] ${label}\n  $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", CI: "1" },
    // npm and npx are batch files on Windows.
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\nFAIL  ${label} (exit ${String(result.status)}) after ${seconds()}`);
    if (keep) console.error(`The app is at ${cwd}`);
    else rmSync(workspace, { recursive: true, force: true });
    process.exit(1);
  }
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(
      (entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"),
    )
    .map((entry) => join(entry.parentPath, entry.name));
}

const workspace = mkdtempSync(join(tmpdir(), "dowel-install-all-"));
const app = join(workspace, "app");
const npm = "npm";
const quiet = ["--no-audit", "--no-fund", "--loglevel=error"];

console.log(
  `Installing ${String(free.length)} free items into a fresh app (${String(pro.length)} Pro items skipped: ${pro.join(", ")}).`,
);

step(
  "Scaffold",
  process.execPath,
  [
    scaffolder,
    "app",
    "--yes",
    "--template",
    "saas",
    "--pm",
    "npm",
    "--skip-components",
    "--skip-install",
  ],
  workspace,
);
step("Install the app's dependencies", npm, ["install", ...quiet], app);

const before = new Set(sourceFiles(join(app, "src")));

step("dowel init", process.execPath, [cli, "--registry", registry, "init", "--yes"], app);
step(
  `dowel add (${String(free.length)} items)`,
  process.execPath,
  [cli, "--registry", registry, "add", ...free, "--yes"],
  app,
);

// Every module the CLI wrote, imported from one server page. A namespace
// import is enough to make Next compile the module in the graph it belongs
// to, which is where a missing "use client" surfaces.
const installed = sourceFiles(join(app, "src"))
  .filter((file) => !before.has(file))
  .sort();
const pageDir = join(app, "src", "app", "install-check");
mkdirSync(pageDir, { recursive: true });
const specifiers = installed.map(
  (file) =>
    `@/${relative(join(app, "src"), file)
      .replace(/\\/g, "/")
      .replace(/\.tsx?$/, "")}`,
);
writeFileSync(
  join(pageDir, "page.tsx"),
  [
    "// Generated by scripts/smoke/install-all.mjs: imports everything the CLI installed.",
    ...specifiers.map((specifier, i) => `import * as m${String(i)} from "${specifier}";`),
    "",
    `const modules = [${specifiers.map((_, i) => `m${String(i)}`).join(", ")}];`,
    "",
    "export default function InstallCheck() {",
    "  return <p>{modules.length} modules</p>;",
    "}",
    "",
  ].join("\n"),
);
console.log(
  `\n[${seconds()}] ${String(installed.length)} installed files imported from /install-check`,
);

step("tsc --noEmit", "npx", ["--no-install", "tsc", "--noEmit"], app);
step("next build", "npx", ["--no-install", "next", "build"], app);

if (keep) console.log(`\nThe app is at ${app}`);
else rmSync(workspace, { recursive: true, force: true });

console.log(
  `\nAll ${String(free.length)} free items installed, type-checked and built in ${seconds()}.`,
);
