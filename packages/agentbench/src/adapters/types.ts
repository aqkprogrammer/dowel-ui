import type { Condition } from "../conditions";
import type { Task } from "../tasks";

export interface AgentRunInput {
  /** The prepared workspace. The agent starts here and may change anything in it. */
  cwd: string;
  /** The task's prompt, unchanged. Both conditions get exactly the same words. */
  prompt: string;
  condition: Condition;
  timeoutMs: number;
  /** For adapters that need more than the prompt, such as `reference`. */
  task: Task;
}

/**
 * What an agent reported about its own run.
 *
 * Every field is optional: an adapter fills in only what its CLI actually
 * printed, and the raw output is kept in the transcript either way.
 */
export interface AgentUsage {
  turns?: number;
  costUsd?: number;
  durationApiMs?: number;
  isError?: boolean;
}

export interface AgentRunResult {
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  /** Whatever the agent printed, unparsed. Written to transcript.json. */
  transcript: string;
  stderr: string;
  usage?: AgentUsage;
}

export interface AgentAdapter {
  id: string;
  /** One line for `bench` to print before running. */
  description: string;
  /**
   * Whether a run spends money. `bench` refuses to start a paid agent unless
   * told explicitly that the person running it knows.
   */
  paid: boolean;
  available(): boolean;
  /** The installed version, recorded with the run so a result names what produced it. */
  version?(): string | undefined;
  run(input: AgentRunInput): Promise<AgentRunResult>;
}
