import { execOrThrow } from "./exec";

/**
 * Git with the person's own configuration kept out of it.
 *
 * A global `commit.gpgsign` would stop a baseline commit to ask for a key, and
 * a global hooks directory would run their hooks inside a benchmark
 * workspace. Neither belongs to the project being measured.
 */
const ISOLATED = [
  "-c",
  "user.name=agentbench",
  "-c",
  "user.email=agentbench@localhost",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.quotepath=off",
];

export function git(cwd: string, args: string[]): string {
  return execOrThrow("git", [...ISOLATED, ...args], { cwd }).stdout;
}

/** Makes the workspace a repository with everything in it committed, and returns that commit. */
export function commitBaseline(cwd: string): string {
  git(cwd, ["init", "-q", "-b", "main"]);
  git(cwd, ["add", "-A"]);
  git(cwd, ["commit", "-q", "-m", "baseline: prepared by agentbench"]);
  return git(cwd, ["rev-parse", "HEAD"]).trim();
}

export interface ChangedFile {
  /** Git's status letter: A added, M modified, D deleted, R renamed. */
  status: string;
  path: string;
}

/**
 * Everything the agent changed since the baseline, untracked files included.
 *
 * Staging is how new files get into the diff; the index is the workspace's
 * own and is thrown away with it.
 */
export function captureChanges(
  cwd: string,
  baseline: string,
): { files: ChangedFile[]; patch: string } {
  git(cwd, ["add", "-A"]);
  const files = git(cwd, ["diff", "--cached", "--name-status", "--no-renames", baseline])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status = "", ...rest] = line.split("\t");
      return { status, path: rest.join("\t") };
    });
  const patch = git(cwd, ["diff", "--cached", "--no-renames", baseline]);
  return { files, patch };
}

/** The commit this checkout is at, and whether it has uncommitted changes. */
export function sourceCommit(cwd: string): { commit: string; dirty: boolean } {
  const commit = git(cwd, ["rev-parse", "HEAD"]).trim();
  const dirty = git(cwd, ["status", "--porcelain"]).trim().length > 0;
  return { commit, dirty };
}
