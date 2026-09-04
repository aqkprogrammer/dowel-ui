import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  agentsSection,
  aiDoc,
  componentsDoc,
  conventionsDoc,
  cursorRule,
  skillDoc,
  themesDoc,
  upsertAgentsSection,
  type AgentDocsContext,
} from "@dowel-ui/registry";

import { branding } from "../branding";
import { configExists, readConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { fetchIndex } from "../lib/registry-client";

export interface AgentsOptions {
  cwd: string;
  registry?: string;
  /** Which integrations to write. Empty means every one. */
  targets: string[];
  check: boolean;
}

export const AGENT_TARGETS = ["dowel", "agents", "claude", "cursor"] as const;
export type AgentTarget = (typeof AGENT_TARGETS)[number];

interface Output {
  path: string;
  /** Produces the file's next content from its current content, if any. */
  render: (existing: string | undefined) => string;
}

/**
 * Writes documentation for the coding agents working in this project.
 *
 * The catalogue is generated from the registry the project actually installs
 * from, not from a list maintained by hand. An agent working off a stale
 * catalogue invents components that do not exist and re-implements ones that
 * do, which is the exact failure this command exists to prevent — so the docs
 * are regenerated rather than edited, and say so at the top of each file.
 */
export async function agents(options: AgentsOptions): Promise<void> {
  const { cwd } = options;

  const config = configExists(cwd) ? readConfig(cwd) : undefined;
  const registry = options.registry ?? config?.registry ?? branding.registryUrl;
  const index = await fetchIndex(registry);

  /**
   * Source-first installs import from the project's own alias; a project
   * without components.json is consuming the published package instead. Telling
   * an agent the wrong one produces imports that do not resolve, so this is
   * derived rather than assumed.
   */
  const importFrom = config?.aliases.ui ?? "@dowel-ui/react";

  const context: AgentDocsContext = {
    index,
    registryUrl: registry,
    docsUrl: branding.registryUrl.replace(/\/r$/, ""),
    cliPackage: branding.cliPackage,
    libraryName: branding.libraryName,
    installed: config ? Object.keys(config.installed) : undefined,
    importFrom,
  };

  const targets = new Set<string>(
    options.targets.length > 0 ? options.targets : [...AGENT_TARGETS],
  );

  for (const target of targets) {
    if (!(AGENT_TARGETS as readonly string[]).includes(target)) {
      throw new CliError(
        `Unknown target "${target}".`,
        `Choose from: ${AGENT_TARGETS.join(", ")}.`,
      );
    }
  }

  const outputs: Output[] = [];

  if (targets.has("dowel")) {
    outputs.push(
      { path: ".dowel/conventions.md", render: () => conventionsDoc(context) },
      { path: ".dowel/components.md", render: () => componentsDoc(context) },
      { path: ".dowel/ai.md", render: () => aiDoc(context) },
      { path: ".dowel/themes.md", render: () => themesDoc(context) },
    );
  }

  if (targets.has("agents")) {
    // AGENTS.md belongs to the project and usually already says things about
    // it, so only the marked block is ours to replace.
    outputs.push({
      path: "AGENTS.md",
      render: (existing) => upsertAgentsSection(existing ?? "", agentsSection(context)),
    });
  }

  if (targets.has("claude")) {
    outputs.push({
      path: `.claude/skills/${branding.libraryName.toLowerCase()}-ui/SKILL.md`,
      render: () => skillDoc(context),
    });
  }

  if (targets.has("cursor")) {
    outputs.push({
      path: `.cursor/rules/${branding.libraryName.toLowerCase()}-ui.mdc`,
      render: () => cursorRule(context),
    });
  }

  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const output of outputs) {
    const absolute = join(cwd, output.path);
    const existing = existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
    const next = output.render(existing);

    if (existing === next) {
      unchanged.push(output.path);
      continue;
    }

    changed.push(output.path);
    if (options.check) continue;

    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, next);
  }

  logger.blank();

  if (options.check) {
    if (changed.length === 0) {
      logger.success("Agent documentation is up to date.");
      return;
    }
    logger.error(`${String(changed.length)} file(s) are out of date:`);
    for (const path of changed) logger.info(`  ${path}`);
    logger.blank();
    logger.info(pc.dim(`Run \`npx ${branding.cliPackage} agents\` to regenerate.`));
    // Signals a stale checkout to CI without a stack trace.
    process.exitCode = 1;
    return;
  }

  logger.success(
    changed.length > 0
      ? `Wrote ${String(changed.length)} file(s) for coding agents.`
      : "Agent documentation was already up to date.",
  );

  if (changed.length > 0) {
    logger.blank();
    for (const path of changed) logger.info(`  ${path}`);
  }
  if (unchanged.length > 0) {
    logger.blank();
    logger.info(pc.dim(`${String(unchanged.length)} unchanged.`));
  }

  logger.blank();
  logger.info(
    pc.dim("Regenerate after upgrading, so the catalogue matches what is installable."),
  );
}
