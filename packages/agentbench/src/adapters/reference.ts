import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { referenceSolution } from "../tasks";
import type { AgentAdapter } from "./types";

/**
 * Copies a hand-written solution into the route.
 *
 * A known answer for the scoring: if the reference for a task does not score
 * a typecheck pass, zero invented components and full recall, the scoring is
 * wrong, not the agent. Only tasks with a `reference.tsx` can be run with it.
 */
export const reference: AgentAdapter = {
  id: "reference",
  description: "copies tasks/<id>/reference.tsx into the route; checks the scoring",
  paid: false,
  available: () => true,
  run: ({ cwd, task }) => {
    const source = referenceSolution(task.id);
    if (!source) {
      return Promise.reject(new Error(`Task "${task.id}" has no reference.tsx.`));
    }
    const target = join(cwd, task.route);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    return Promise.resolve({
      exitCode: 0,
      durationMs: 0,
      timedOut: false,
      transcript: JSON.stringify({
        agent: "reference",
        copied: `tasks/${task.id}/reference.tsx`,
      }),
      stderr: "",
    });
  },
};
