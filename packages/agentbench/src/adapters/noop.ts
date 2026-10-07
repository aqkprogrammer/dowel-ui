import type { AgentAdapter } from "./types";

/**
 * Changes nothing.
 *
 * It exists to run the whole pipeline — prepare, run, diff, score, report —
 * without an agent or a bill, and it is the floor every real agent should be
 * read against: no route file, nothing imported, recall zero.
 */
export const noop: AgentAdapter = {
  id: "noop",
  description: "makes no changes; validates the pipeline for free",
  paid: false,
  available: () => true,
  run: () =>
    Promise.resolve({
      exitCode: 0,
      durationMs: 0,
      timedOut: false,
      transcript: JSON.stringify({ agent: "noop", note: "No agent was run." }),
      stderr: "",
    }),
};
