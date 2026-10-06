import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REPO_ROOT } from "../src/paths";
import { STARTER_ITEMS } from "../src/prepare";
import { findImports } from "../src/score";
import { loadRegistry, pinnedVersions, withDependencies } from "../src/registry";
import { loadTasks, referenceSolution, taskSchema } from "../src/tasks";

const tasks = loadTasks();
const registry = loadRegistry();

describe("tasks", () => {
  it("has the ten tasks the benchmark is scoped to", () => {
    expect(tasks.map((task) => task.id)).toEqual([
      "account-settings",
      "admin-users",
      "ai-chat",
      "analytics",
      "billing",
      "confirm-delete",
      "crm-contacts",
      "login",
      "onboarding",
      "orders-table",
    ]);
  });

  it("rejects a task with a field the schema does not know", () => {
    const valid = tasks[0]!;
    expect(taskSchema.safeParse({ ...valid, extra: true }).success).toBe(false);
    expect(taskSchema.safeParse({ ...valid, route: "app/page.tsx" }).success).toBe(false);
  });

  it("gives every task its own route", () => {
    const routes = tasks.map((task) => task.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  // An agent that is told something wrong is worse off than one told nothing;
  // a task that names a component the registry does not have would score every
  // agent down for not using it.
  it.each(tasks.map((task) => [task.id, task] as const))(
    "%s names only items in this commit's registry",
    (_, task) => {
      for (const name of [...task.install, ...task.expect]) {
        expect(registry.items.has(name), `${name} is not in the registry`).toBe(true);
      }
    },
  );

  it.each(tasks.map((task) => [task.id, task] as const))(
    "%s installs only free items, so anyone can rerun it",
    (_, task) => {
      for (const name of withDependencies(registry, task.install)) {
        expect(registry.items.get(name)?.access, name).toBe("free");
      }
    },
  );

  it.each(tasks.map((task) => [task.id, task] as const))(
    "%s has a pinned version for every npm package it installs",
    (_, task) => {
      const pins = pinnedVersions();
      const items = withDependencies(registry, ["utils", ...STARTER_ITEMS, ...task.install]);
      for (const name of items) {
        for (const dependency of registry.items.get(name)?.dependencies ?? []) {
          expect(pins[dependency], `${dependency} (from ${name})`).toBeDefined();
        }
      }
    },
  );

  // The prompt is what a person types, the same in both conditions. Naming
  // the library or a component would tell the `without` agent what the agent
  // files are supposed to.
  it.each(tasks.map((task) => [task.id, task] as const))(
    "%s has a prompt that does not name the library or its components",
    (_, task) => {
      expect(task.prompt.toLowerCase()).not.toContain("dowel");
      expect(task.prompt).not.toMatch(/components\/ui|@\//);
    },
  );

  it("has a reference solution for login, used to check the scoring", () => {
    expect(referenceSolution("login")).toBeDefined();
  });
});

describe("the starter template", () => {
  it("imports only the components every workspace installs", () => {
    const page = readFileSync(
      join(REPO_ROOT, "packages/create-dowel-app/templates/starter/src/app/page.tsx"),
      "utf8",
    );
    const imported = findImports(page)
      .map(({ specifier }) => /^@\/components\/ui\/(.+)$/.exec(specifier)?.[1])
      .filter((name): name is string => name !== undefined);
    expect(imported.length).toBeGreaterThan(0);
    for (const name of imported) expect(STARTER_ITEMS).toContain(name);
  });
});
