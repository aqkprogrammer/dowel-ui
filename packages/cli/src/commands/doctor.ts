import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { hashContent, type RegistryIndex } from "@dowel-ui/registry";

import { branding } from "../branding";
import { credentialsFor } from "../lib/auth";
import { CONFIG_FILE, configExists, readConfig, type Config } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { resolveDestination, rewriteImports } from "../lib/paths";
import { detectResolve, inspectProject, majorVersion, type ProjectInfo } from "../lib/project";
import { fetchIndex, fetchItem } from "../lib/registry-client";
import { renderAgentDocs } from "./agents";
import { TOKENS_MARKER } from "./init";

export interface DoctorOptions {
  cwd: string;
  registry?: string;
  /** Skip every check that needs the registry. */
  offline: boolean;
  json: boolean;
}

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface Check {
  group: "project" | "config" | "registry" | "components" | "agents";
  label: string;
  status: CheckStatus;
  detail?: string;
  /** What to do about it. */
  hint?: string;
}

/**
 * Checks a project's Dowel setup and reports what it finds.
 *
 * A list of checks, each passing or not, rather than a score: "91/100" invites
 * the question of what the other nine points were, and a checklist answers it
 * before it is asked. Nothing here writes to the project.
 */
export async function diagnose(options: DoctorOptions): Promise<Check[]> {
  const { cwd } = options;
  const checks: Check[] = [];
  const add = (check: Check) => checks.push(check);

  let project: ProjectInfo;
  try {
    project = inspectProject(cwd);
  } catch (error) {
    add({
      group: "project",
      label: "package.json",
      status: "fail",
      detail: error instanceof CliError ? error.message : String(error),
      hint: "Run doctor from the root of your project.",
    });
    return checks;
  }

  add(
    project.reactVersion
      ? { group: "project", label: "React", status: "pass", detail: project.reactVersion }
      : {
          group: "project",
          label: "React",
          status: "fail",
          detail: "react is not in package.json",
        },
  );
  add(
    project.isTypeScript
      ? { group: "project", label: "TypeScript", status: "pass" }
      : {
          group: "project",
          label: "TypeScript",
          status: "fail",
          detail: "no tsconfig.json",
          hint: "The components are TypeScript source; add a tsconfig.json.",
        },
  );
  const tailwind = majorVersion(project.tailwindVersion);
  add(
    tailwind !== undefined && tailwind >= 4
      ? {
          group: "project",
          label: "Tailwind CSS 4",
          status: "pass",
          detail: project.tailwindVersion,
        }
      : {
          group: "project",
          label: "Tailwind CSS 4",
          status: "fail",
          detail: project.tailwindVersion
            ? `found ${project.tailwindVersion}`
            : "not installed",
          hint: "The tokens are defined with @theme, which needs Tailwind v4.",
        },
  );

  if (!configExists(cwd)) {
    add({
      group: "config",
      label: CONFIG_FILE,
      status: "fail",
      detail: "not found",
      hint: `Run \`npx ${branding.cliPackage} init\`.`,
    });
    return checks;
  }

  let config: Config;
  try {
    config = readConfig(cwd);
  } catch (error) {
    add({
      group: "config",
      label: CONFIG_FILE,
      status: "fail",
      detail: error instanceof CliError ? error.message : String(error),
    });
    return checks;
  }
  add({ group: "config", label: CONFIG_FILE, status: "pass" });

  checkAlias(cwd, config, add);
  checkStylesheet(cwd, config, add);
  checkInstalledFiles(cwd, config, add);

  const registry = options.registry ?? config.registry;
  if (options.offline) {
    add({ group: "registry", label: "Registry", status: "skip", detail: "--offline" });
    return checks;
  }

  let index: RegistryIndex;
  try {
    index = await fetchIndex(registry);
  } catch (error) {
    add({
      group: "registry",
      label: "Registry",
      status: "fail",
      detail: error instanceof CliError ? error.message : String(error),
      hint: "Check the network, or the registry in components.json.",
    });
    return checks;
  }
  add({
    group: "registry",
    label: "Registry",
    status: "pass",
    detail: `${registry} (${String(index.items.length)} items, ${index.generatedFrom})`,
  });

  checkAgainstIndex(project, config, index, add);
  await checkUpdates(config, registry, index, add);
  checkAgentDocs(cwd, registry, index, add);

  return checks;
}

function checkAlias(cwd: string, config: Config, add: (check: Check) => void): void {
  const detected = detectResolve(cwd);
  const { prefix, base } = config.resolve;
  if (detected?.prefix === prefix && detected.base === base) {
    add({
      group: "config",
      label: "Import alias",
      status: "pass",
      detail: `${prefix}* → ${base || "."}/*`,
    });
    return;
  }
  add({
    group: "config",
    label: "Import alias",
    status: "fail",
    detail: detected
      ? `${CONFIG_FILE} uses ${prefix}* → ${base}/*, tsconfig has ${detected.prefix}* → ${detected.base}/*`
      : `tsconfig.json has no ${prefix}* path alias`,
    hint: "Installed components import through this alias; restore it or update components.json.",
  });
}

function checkStylesheet(cwd: string, config: Config, add: (check: Check) => void): void {
  const path = join(cwd, config.tailwind.css);
  if (!existsSync(path)) {
    add({
      group: "config",
      label: "Design tokens",
      status: "fail",
      detail: `${config.tailwind.css} not found`,
      hint: "Point tailwind.css in components.json at the stylesheet that imports Tailwind.",
    });
    return;
  }
  const present = readFileSync(path, "utf8").includes(TOKENS_MARKER);
  add(
    present
      ? { group: "config", label: "Design tokens", status: "pass", detail: config.tailwind.css }
      : {
          group: "config",
          label: "Design tokens",
          status: "fail",
          detail: `not found in ${config.tailwind.css}`,
          hint: "Components use the semantic tokens; run init again to add them.",
        },
  );
}

/** Files the CLI wrote: still there, and still as written? Needs no network. */
function checkInstalledFiles(cwd: string, config: Config, add: (check: Check) => void): void {
  const stylesheet = config.tailwind.css;
  const missing: string[] = [];
  let edited = 0;
  let total = 0;

  for (const entry of Object.values(config.installed)) {
    for (const [path, hash] of Object.entries(entry.files)) {
      // The stylesheet is the project's own file with the tokens inserted; it
      // never matches the recorded hash and is checked separately.
      if (path === stylesheet) continue;
      total += 1;
      const absolute = join(cwd, path);
      if (!existsSync(absolute)) missing.push(path);
      else if (hashContent(readFileSync(absolute, "utf8")) !== hash) edited += 1;
    }
  }

  const names = Object.keys(config.installed).filter(
    (name) => name !== "theme" && name !== "utils",
  );
  if (missing.length > 0) {
    add({
      group: "components",
      label: "Installed files",
      status: "fail",
      detail: `${String(missing.length)} of ${String(total)} missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", …" : ""}`,
      hint: `Run \`npx ${branding.cliPackage} update\` to restore them.`,
    });
  } else {
    add({
      group: "components",
      label: "Installed files",
      status: "pass",
      detail:
        `${String(names.length)} item(s), ${String(total)} file(s)` +
        (edited > 0 ? `; ${String(edited)} edited locally, which is yours to do` : ""),
    });
  }
}

function checkAgainstIndex(
  project: ProjectInfo,
  config: Config,
  index: RegistryIndex,
  add: (check: Check) => void,
): void {
  const byName = new Map(index.items.map((entry) => [entry.name, entry]));
  const installed = Object.keys(config.installed);

  const unknown = installed.filter((name) => !byName.has(name));
  if (unknown.length > 0) {
    add({
      group: "components",
      label: "Known to the registry",
      status: "warn",
      detail: `not in the registry: ${unknown.join(", ")}`,
      hint: "Renamed or removed upstream; they keep working, but will not get updates.",
    });
  }

  const present = {
    ...project.packageJson.dependencies,
    ...project.packageJson.devDependencies,
  };
  const needed = new Set(installed.flatMap((name) => byName.get(name)?.dependencies ?? []));
  const missingPackages = [...needed].filter((name) => !(name in present)).sort();
  add(
    missingPackages.length === 0
      ? {
          group: "components",
          label: "npm dependencies",
          status: "pass",
          detail: `${String(needed.size)} required, all present`,
        }
      : {
          group: "components",
          label: "npm dependencies",
          status: "fail",
          detail: `missing: ${missingPackages.join(", ")}`,
          hint: `Install them: ${project.packageManager} ${project.packageManager === "npm" ? "install" : "add"} ${missingPackages.join(" ")}`,
        },
  );

  const missingComponents = new Set<string>();
  for (const [name, entry] of Object.entries(config.installed)) {
    const dependsOn = entry.dependsOn ?? byName.get(name)?.registryDependencies ?? [];
    for (const dependency of dependsOn) {
      if (!(dependency in config.installed)) missingComponents.add(dependency);
    }
  }
  add(
    missingComponents.size === 0
      ? { group: "components", label: "Component dependencies", status: "pass" }
      : {
          group: "components",
          label: "Component dependencies",
          status: "fail",
          detail: `imported but not installed: ${[...missingComponents].sort().join(", ")}`,
          hint: `Run \`npx ${branding.cliPackage} add ${[...missingComponents].sort().join(" ")}\`.`,
        },
  );

  const licensed = installed.filter((name) => byName.get(name)?.access === "pro");
  if (licensed.length > 0) {
    let signedIn: boolean;
    try {
      signedIn = credentialsFor(config.registry) !== undefined;
    } catch {
      signedIn = false;
    }
    add(
      signedIn
        ? {
            group: "components",
            label: "Licence",
            status: "pass",
            detail: `for ${licensed.join(", ")}`,
          }
        : {
            group: "components",
            label: "Licence",
            status: "warn",
            detail: `${licensed.join(", ")} need a licence, and none is available for ${config.registry}`,
            hint: `Updating them will fail until you run \`npx ${branding.cliPackage} login\`.`,
          },
    );
  }
}

/** Which installed files have a newer version upstream. One request per item. */
async function checkUpdates(
  config: Config,
  registry: string,
  index: RegistryIndex,
  add: (check: Check) => void,
): Promise<void> {
  const byName = new Map(index.items.map((entry) => [entry.name, entry]));
  const names = Object.keys(config.installed).filter(
    (name) => byName.has(name) && byName.get(name)?.access !== "pro",
  );

  const outdated: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    names.map(async (name) => {
      try {
        const item = await fetchItem(registry, name);
        const recorded = config.installed[name]?.files ?? {};
        for (const file of item.files) {
          if (file.type === "registry:style") continue;
          const destination = resolveDestination(config, file.path);
          const upstream = hashContent(rewriteImports(file.content, config));
          const installed = recorded[destination];
          if (installed !== undefined && installed !== upstream) {
            outdated.push(name);
            return;
          }
        }
      } catch {
        failed.push(name);
      }
    }),
  );

  if (failed.length > 0) {
    add({
      group: "components",
      label: "Updates",
      status: "warn",
      detail: `could not fetch: ${failed.sort().join(", ")}`,
    });
    return;
  }
  add(
    outdated.length === 0
      ? {
          group: "components",
          label: "Updates",
          status: "pass",
          detail: "everything is current",
        }
      : {
          group: "components",
          label: "Updates",
          status: "warn",
          detail: `available for ${outdated.sort().join(", ")}`,
          hint: `\`npx ${branding.cliPackage} diff <name>\` shows what changed; \`update\` applies it.`,
        },
  );
}

function checkAgentDocs(
  cwd: string,
  registry: string,
  index: RegistryIndex,
  add: (check: Check) => void,
): void {
  const docs = renderAgentDocs(cwd, index, registry);
  const present = docs.filter((doc) => doc.existing !== undefined);
  if (present.length === 0) {
    add({
      group: "agents",
      label: "Agent documentation",
      status: "warn",
      detail: "not set up",
      hint: `Run \`npx ${branding.cliPackage} agents\` so coding agents use these components instead of writing their own.`,
    });
    return;
  }
  const stale = present.filter((doc) => doc.existing !== doc.next);
  add(
    stale.length === 0
      ? {
          group: "agents",
          label: "Agent documentation",
          status: "pass",
          detail: `${String(present.length)} file(s) current`,
        }
      : {
          group: "agents",
          label: "Agent documentation",
          status: "warn",
          detail: `out of date: ${stale.map((doc) => doc.path).join(", ")}`,
          hint: `Run \`npx ${branding.cliPackage} agents\` — a stale catalogue is trusted as if it were current.`,
        },
  );
}

const MARK: Record<CheckStatus, string> = {
  pass: pc.green("✓"),
  warn: pc.yellow("!"),
  fail: pc.red("✕"),
  skip: pc.dim("–"),
};

const GROUP_LABEL: Record<Check["group"], string> = {
  project: "Project",
  config: "Configuration",
  registry: "Registry",
  components: "Components",
  agents: "Coding agents",
};

export async function doctor(options: DoctorOptions): Promise<void> {
  const checks = await diagnose(options);
  const failed = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  const passed = checks.filter((check) => check.status === "pass").length;

  if (options.json) {
    console.log(JSON.stringify({ checks, passed, warnings: warned, failed }, null, 2));
  } else {
    let group: Check["group"] | undefined;
    for (const check of checks) {
      if (check.group !== group) {
        logger.blank();
        logger.info(pc.bold(GROUP_LABEL[check.group]));
        group = check.group;
      }
      const detail = check.detail ? pc.dim(`  ${check.detail}`) : "";
      logger.info(`  ${MARK[check.status]} ${check.label}${detail}`);
      if (check.hint && (check.status === "fail" || check.status === "warn")) {
        logger.info(`      ${pc.dim(check.hint)}`);
      }
    }
    logger.blank();
    logger.info(
      `${String(passed)} passed · ${String(warned)} warning(s) · ${String(failed)} failed`,
    );
  }

  if (failed > 0) process.exitCode = 1;
}
