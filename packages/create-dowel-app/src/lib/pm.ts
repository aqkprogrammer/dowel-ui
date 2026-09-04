import { execFileSync } from "node:child_process";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as string[]).includes(value);
}

/**
 * Which package manager invoked this process.
 *
 * `npm_config_user_agent` is set by every one of them, and it is the only
 * reliable signal: someone running `pnpm create dowel-app` wants pnpm, and
 * asking them again is asking a question the environment already answered.
 */
export function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? "";

  for (const candidate of PACKAGE_MANAGERS) {
    if (agent.startsWith(`${candidate}/`)) return candidate;
  }

  return "npm";
}

export function installCommand(manager: PackageManager): string {
  return manager === "npm" ? "npm install" : `${manager} install`;
}

export function runCommand(manager: PackageManager, script: string): string {
  return manager === "npm" ? `npm run ${script}` : `${manager} ${script}`;
}

/** The runner that executes a package's binary without installing it globally. */
export function dlx(manager: PackageManager): string[] {
  switch (manager) {
    case "pnpm":
      return ["pnpm", "dlx"];
    case "yarn":
      return ["yarn", "dlx"];
    case "bun":
      return ["bunx"];
    default:
      return ["npx", "-y"];
  }
}

export function install(manager: PackageManager, cwd: string): void {
  const [command, ...args] = installCommand(manager).split(" ");
  execFileSync(command ?? "npm", args, { cwd, stdio: "inherit" });
}

/** Runs the component CLI in the new project. */
export function runDowel(
  manager: PackageManager,
  cwd: string,
  cliPackage: string,
  args: string[],
): void {
  const [command, ...runner] = dlx(manager);
  execFileSync(command ?? "npx", [...runner, cliPackage, ...args], { cwd, stdio: "inherit" });
}
