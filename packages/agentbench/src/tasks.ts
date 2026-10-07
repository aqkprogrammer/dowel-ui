import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { TASKS_DIR } from "./paths";

const registryName = z.string().regex(/^[a-z0-9-]+$/, "a registry item name");

export const taskSchema = z
  .object({
    /** Matches the directory name, so a result path names its task. */
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    /**
     * What a person would type, word for word, in both conditions. It names
     * the URL rather than a file, as a person would; `route` is the file a
     * Next.js app serves that URL from.
     */
    prompt: z.string().min(20),
    /** The file the agent should create, relative to the project root. */
    route: z.string().regex(/^src\/app\/.+\/page\.tsx$/, "a page under src/app"),
    /**
     * Installed before the agent starts, identically in both conditions, so
     * neither has components the other lacks.
     */
    install: z.array(registryName).min(1),
    /**
     * What a good solution would use, for recall. Kept to the choices the
     * component guidance actually settles — `alert-dialog` for an irreversible
     * delete, `meter` for a quota — and silent where two answers are both
     * reasonable.
     */
    expect: z.array(registryName).min(1),
  })
  .strict();

export type Task = z.infer<typeof taskSchema>;

/** Reads and validates every task, in id order. */
export function loadTasks(dir: string = TASKS_DIR): Task[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "task.json")))
    .map((entry) => {
      const file = join(dir, entry.name, "task.json");
      const parsed = taskSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
      if (!parsed.success) {
        throw new Error(`${file} is not a valid task:\n${z.prettifyError(parsed.error)}`);
      }
      if (parsed.data.id !== entry.name) {
        throw new Error(`${file} has id "${parsed.data.id}" but lives in "${entry.name}".`);
      }
      return parsed.data;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The reference solution for a task, if one has been written. */
export function referenceSolution(taskId: string, dir: string = TASKS_DIR): string | undefined {
  const file = join(dir, taskId, "reference.tsx");
  return existsSync(file) ? file : undefined;
}
