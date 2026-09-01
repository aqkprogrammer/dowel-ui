import { spawnSync } from "node:child_process";

import type { PackageManager } from "./project";
import { CliError } from "./errors";

const INSTALL_COMMAND: Record<PackageManager, string[]> = {
  pnpm: ["add"],
  yarn: ["add"],
  bun: ["add"],
  npm: ["install"],
};

/** Packages already present are skipped, so re-running `add` installs nothing. */
export function missingDependencies(
  installed: Record<string, string>,
  required: string[],
): string[] {
  return required.filter((dependency) => !(dependency in installed));
}

export function installDependencies(
  manager: PackageManager,
  cwd: string,
  dependencies: string[],
): void {
  if (dependencies.length === 0) return;

  const args = [...INSTALL_COMMAND[manager], ...dependencies];
  const result = spawnSync(manager, args, { cwd, stdio: "inherit" });

  if (result.error) {
    throw new CliError(
      `Could not run ${manager}: ${result.error.message}`,
      `Install these manually: ${dependencies.join(" ")}`,
    );
  }

  if (result.status !== 0) {
    throw new CliError(
      `${manager} ${args.join(" ")} failed.`,
      "Fix the install and run the command again — no files were rolled back.",
    );
  }
}
