import * as prompts from "@clack/prompts";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, normalize, relative } from "node:path";

import {
  AUDIT_RULES,
  auditSource,
  fixPhysicalProperties,
  type AuditFinding,
  type AuditRuleId,
} from "@dowel-ui/registry";

import { configExists, readConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";

export interface AuditOptions {
  cwd: string;
  /** Files or directories to scan. Empty means the usual source directories. */
  paths: string[];
  /** Only these rules. Empty means all of them. */
  rules: string[];
  json: boolean;
  /** Apply the fixes that are mechanical. */
  fix: boolean;
  yes: boolean;
  /** Also scan the files Dowel installed, which upstream already audits. */
  includeInstalled: boolean;
}

export interface FileFindings {
  file: string;
  findings: AuditFinding[];
}

export interface AuditReport {
  scanned: number;
  files: FileFindings[];
  /** Findings per rule, every rule present even at zero. */
  counts: Record<AuditRuleId, number>;
}

/** Where application code usually lives, scanned when no path is given. */
const DEFAULT_ROOTS = ["src", "app", "components", "pages", "lib"];

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "out",
  "coverage",
  "storybook-static",
]);

const SOURCE = /\.(?:tsx|jsx|ts|js)$/;
/** Tests and stories render native elements and odd colours on purpose. */
const EXAMPLES = /\.(?:test|spec|stories)\.[jt]sx?$/;

function collect(path: string, into: string[]): void {
  const stats = statSync(path);
  if (stats.isFile()) {
    if (SOURCE.test(path) && !EXAMPLES.test(path)) into.push(path);
    return;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    collect(join(path, entry.name), into);
  }
}

/**
 * Scans a project and reports what the rules find. Reads only; `--fix` is
 * applied separately, after the person has seen the report.
 */
export function auditProject(
  options: Pick<AuditOptions, "cwd" | "paths" | "rules" | "includeInstalled">,
): AuditReport {
  const { cwd } = options;
  const config = configExists(cwd) ? readConfig(cwd) : undefined;
  const installed = new Set(Object.keys(config?.installed ?? {}));

  // The files `add` wrote are Dowel's own source, audited where they are
  // published. Reporting them here would be telling someone to fix code they
  // installed rather than code they wrote.
  const installedFiles = new Set(
    Object.values(config?.installed ?? {}).flatMap((entry) =>
      Object.keys(entry.files).map((file) => normalize(file)),
    ),
  );

  const known = new Set<string>(AUDIT_RULES.map((rule) => rule.id));
  const unknown = options.rules.filter((rule) => !known.has(rule));
  if (unknown.length > 0) {
    throw new CliError(
      `Unknown rule${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`,
      `Choose from: ${[...known].join(", ")}.`,
    );
  }
  const only = options.rules.length > 0 ? new Set(options.rules) : undefined;

  const roots =
    options.paths.length > 0
      ? options.paths
      : DEFAULT_ROOTS.filter((root) => existsSync(join(cwd, root)));
  if (roots.length === 0) {
    throw new CliError(
      "Found no source to audit.",
      `Pass the directories to scan, e.g. \`audit src\`. Looked for: ${DEFAULT_ROOTS.join(", ")}.`,
    );
  }

  const files: string[] = [];
  for (const root of roots) {
    const absolute = join(cwd, root);
    if (!existsSync(absolute)) throw new CliError(`${root} does not exist.`);
    collect(absolute, files);
  }

  const counts = Object.fromEntries(AUDIT_RULES.map((rule) => [rule.id, 0])) as Record<
    AuditRuleId,
    number
  >;
  const results: FileFindings[] = [];
  let scanned = 0;

  for (const absolute of [...new Set(files)].sort()) {
    const file = relative(cwd, absolute);
    if (!options.includeInstalled && installedFiles.has(normalize(file))) continue;
    scanned += 1;

    const findings = auditSource(readFileSync(absolute, "utf8"), { installed }).filter(
      (finding) => only === undefined || only.has(finding.rule),
    );
    if (findings.length === 0) continue;

    for (const finding of findings) counts[finding.rule] += 1;
    results.push({ file, findings });
  }

  return { scanned, files: results, counts };
}

function printReport(report: AuditReport): void {
  logger.blank();
  for (const { file, findings } of report.files) {
    logger.info(pc.bold(file));
    for (const finding of findings) {
      const instead = finding.suggestion ? pc.dim(` → ${finding.suggestion}`) : "";
      logger.info(
        `  ${pc.dim(String(finding.line).padStart(4))}  ${finding.rule.padEnd(20)} ${finding.found}${instead}`,
      );
    }
    logger.blank();
  }

  const total = report.files.reduce((sum, entry) => sum + entry.findings.length, 0);
  logger.info(pc.bold("Summary"));
  for (const rule of AUDIT_RULES) {
    const count = report.counts[rule.id];
    const mark = count === 0 ? pc.green("✓") : pc.yellow(String(count).padStart(3));
    logger.info(`  ${mark.padStart(3)}  ${rule.id.padEnd(20)} ${pc.dim(rule.summary)}`);
  }
  logger.blank();

  if (total === 0) {
    logger.success(`${String(report.scanned)} file(s) scanned. Nothing to report.`);
  } else {
    logger.warn(
      `${String(total)} finding(s) in ${String(report.files.length)} of ${String(report.scanned)} file(s) scanned.`,
    );
  }
}

export async function audit(options: AuditOptions): Promise<void> {
  const report = auditProject(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (report.files.length > 0) process.exitCode = 1;
    return;
  }

  printReport(report);

  const fixable = report.files.filter(({ findings }) => findings.some((f) => f.fixable));
  if (!options.fix) {
    if (fixable.length > 0) {
      logger.info(
        pc.dim(`Run with --fix to rewrite the physical-direction findings, which are exact.`),
      );
    }
    if (report.files.length > 0) process.exitCode = 1;
    return;
  }

  if (fixable.length === 0) {
    logger.info("Nothing here can be fixed mechanically.");
    if (report.files.length > 0) process.exitCode = 1;
    return;
  }

  if (!options.yes) {
    logger.info(pc.dim("--fix will rewrite the physical-direction utilities in:"));
    for (const { file } of fixable) logger.info(`  ${file}`);
    logger.blank();
    const proceed = await prompts.confirm({
      message: "Rewrite these files?",
      initialValue: true,
    });
    if (prompts.isCancel(proceed) || !proceed) {
      throw new CliError("Cancelled — nothing was changed.");
    }
  }

  for (const { file } of fixable) {
    const absolute = join(options.cwd, file);
    writeFileSync(absolute, fixPhysicalProperties(readFileSync(absolute, "utf8")));
  }
  logger.success(`Rewrote ${String(fixable.length)} file(s).`);

  const after = auditProject(options);
  if (after.files.length > 0) {
    logger.info(
      pc.dim(
        `${String(after.files.reduce((n, f) => n + f.findings.length, 0))} finding(s) need a person.`,
      ),
    );
    process.exitCode = 1;
  }
}
