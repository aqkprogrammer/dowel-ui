/**
 * Runs ESLint once per TypeScript workspace, then once over everything else.
 *
 * Typed linting keeps a TypeScript program — and its type checker — alive for
 * every tsconfig it has touched, for the life of the process. A single
 * `eslint .` therefore held packages/ui, apps/docs (which re-checks ui's
 * sources through its `@ui/*` path alias) and every other package in one heap
 * at the same time, and outgrew the ~4 GB CI runners give Node. One process per
 * workspace frees each program before the next is built, so the peak is the
 * largest workspace rather than the sum of all of them.
 *
 * Extra arguments are passed to every run:
 *
 *   pnpm lint
 *   pnpm lint --fix
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ESLINT = join(ROOT, "node_modules", ".bin", "eslint");

/** Workspace parents, as listed in pnpm-workspace.yaml. */
const WORKSPACE_PARENTS = ["apps", "packages"];

const extraArgs = process.argv.slice(2);

/** Every workspace with a tsconfig.json of its own: each is one typed program. */
const workspaces = WORKSPACE_PARENTS.flatMap((parent) =>
  readdirSync(join(ROOT, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${parent}/${entry.name}`)
    .filter((dir) => existsSync(join(ROOT, dir, "tsconfig.json"))),
);

const runs: { label: string; args: string[] }[] = [
  ...workspaces.map((dir) => ({ label: dir, args: [dir] })),
  {
    label: "everything else",
    args: [".", ...workspaces.flatMap((dir) => ["--ignore-pattern", `${dir}/**`])],
  },
];

const failed: string[] = [];
for (const { label, args } of runs) {
  console.log(`\n› eslint ${label}`);
  const result = spawnSync(ESLINT, [...args, ...extraArgs], { cwd: ROOT, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) failed.push(label);
}

if (failed.length > 0) {
  console.error(`\nESLint failed in: ${failed.join(", ")}`);
  process.exit(1);
}
