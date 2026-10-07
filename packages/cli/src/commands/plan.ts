import {
  planUi,
  renderBrief,
  renderPlan,
  type RegistryIndex,
  type UiPlan,
} from "@dowel-ui/registry";

import { branding } from "../branding";
import { configExists, readConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { logger, pc } from "../lib/logger";
import { DEFAULT_MODEL, planWithModel } from "../lib/model-planner";
import { fetchIndex } from "../lib/registry-client";

export interface PlanCommandOptions {
  cwd: string;
  registry?: string;
  /** A model id, `true` for the default model, or undefined for the built-in planner. */
  model?: string | boolean;
  format: "brief" | "code" | "both";
}

/** Chooses the planner. Exported so tests can call it without printing. */
export async function makePlan(
  prompt: string,
  index: RegistryIndex,
  model: PlanCommandOptions["model"],
): Promise<{ plan: UiPlan; unknown: string[]; by: string }> {
  if (model === undefined || model === false) {
    return { plan: planUi(prompt, index), unknown: [], by: "the built-in planner" };
  }
  const id = model === true ? DEFAULT_MODEL : model;
  const { plan, unknown } = await planWithModel(prompt, index, id);
  return { plan, unknown, by: id };
}

export async function plan(prompt: string, options: PlanCommandOptions): Promise<void> {
  if (prompt.trim().length < 3) {
    throw new CliError(
      "Describe the screen to plan.",
      'For example: `plan "a billing page with usage and invoices"`.',
    );
  }

  const config = configExists(options.cwd) ? readConfig(options.cwd) : undefined;
  const registry = options.registry ?? config?.registry ?? branding.registryUrl;
  const index = await fetchIndex(registry);
  const importFrom = config?.aliases.ui ?? "@dowel-ui/react";
  const docsUrl = branding.registryUrl.replace(/\/r$/, "");

  if (options.model !== undefined && options.model !== false) logger.step("Asking the model");
  const { plan: result, unknown, by } = await makePlan(prompt, index, options.model);

  logger.blank();
  if (unknown.length > 0) {
    logger.warn(`Dropped, not in the registry: ${unknown.join(", ")}`);
    logger.blank();
  }
  if (result.empty) {
    logger.info(`Nothing in the registry matches "${prompt}".`);
    logger.info(pc.dim("Try `list`, or describe the screen in other words."));
    return;
  }

  if (options.format !== "code") {
    logger.info(renderBrief(result, { cliPackage: branding.cliPackage, docsUrl, importFrom }));
    logger.blank();
    logger.info(pc.dim("Why each was chosen:"));
    for (const item of [...result.blocks, ...result.components]) {
      logger.info(`  ${item.entry.name}: ${item.because}`);
    }
  }
  if (options.format !== "brief") {
    logger.blank();
    logger.info(renderPlan(result, { importFrom, docsUrl }).trim());
  }

  // The plan draws on the whole catalogue, Pro included; the install line does
  // not know about licences, so the condition is stated before `add` refuses.
  const licensed = [...result.blocks, ...result.components]
    .map((item) => item.entry)
    .filter((entry) => entry.access === "pro");
  if (licensed.length > 0) {
    logger.blank();
    logger.warn(
      `${licensed.map((entry) => entry.name).join(", ")} ${licensed.length === 1 ? "is" : "are"} Pro: ` +
        `installing needs a licence (\`npx ${branding.cliPackage} login\`).`,
    );
  }

  logger.blank();
  logger.info(pc.dim(`Planned by ${by}. Every item is in ${index.generatedFrom}.`));
}
