import { claudeCode } from "./claude-code";
import { noop } from "./noop";
import { reference } from "./reference";
import type { AgentAdapter } from "./types";

/**
 * Every agent the harness can drive.
 *
 * Other agents are welcome, each as an adapter whose flags were checked
 * against the help output of the installed CLI. None is included on a guess:
 * an adapter with a wrong flag fails, or worse runs with different settings
 * from the ones its results claim.
 */
export const ADAPTERS: AgentAdapter[] = [claudeCode, noop, reference];

export function findAdapter(id: string): AgentAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.id === id);
}

export type { AgentAdapter, AgentRunInput, AgentRunResult, AgentUsage } from "./types";
