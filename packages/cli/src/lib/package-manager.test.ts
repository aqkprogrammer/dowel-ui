import { spawnSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { installDependencies, missingDependencies } from "./package-manager";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(() => ({ status: 0 })),
}));

const spawn = vi.mocked(spawnSync);

beforeEach(() => {
  spawn.mockClear();
});

describe("installDependencies", () => {
  it("adds runtime packages with each manager's own verb", () => {
    installDependencies("pnpm", "/app", ["three"]);
    installDependencies("npm", "/app", ["three"]);
    expect(spawn.mock.calls.map(([command, args]) => [command, args])).toEqual([
      ["pnpm", ["add", "three"]],
      ["npm", ["install", "three"]],
    ]);
  });

  it("saves type declarations as dev dependencies", () => {
    for (const manager of ["pnpm", "npm", "yarn", "bun"] as const) {
      installDependencies(manager, "/app", ["@types/three"], { dev: true });
    }
    for (const [, args] of spawn.mock.calls) {
      expect(args).toContain("-D");
      expect(args?.at(-1)).toBe("@types/three");
    }
  });

  it("runs nothing when there is nothing to install", () => {
    installDependencies("pnpm", "/app", [], { dev: true });
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe("missingDependencies", () => {
  it("skips what the project already has, in either dependency list", () => {
    expect(
      missingDependencies({ three: "1", "@types/three": "1" }, ["three", "@types/three", "x"]),
    ).toEqual(["x"]);
  });
});
