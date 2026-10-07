import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as Pm from "./lib/pm";

/**
 * What the scaffolder asks the component CLI to do, in order.
 *
 * The CLI itself is mocked: it is tested in its own package, against a real
 * registry, and running it here would make this suite network-bound. What
 * this checks is the sequence — a project is initialised, its components
 * added, and then its coding agents told what was added.
 */

const calls: string[][] = [];

vi.mock("./lib/pm", async (original) => ({
  ...(await original<typeof Pm>()),
  runDowel: (_manager: string, _cwd: string, _cli: string, args: string[]) => {
    calls.push(args);
  },
}));

const { create } = await import("./create");

const roots: string[] = [];

afterEach(() => {
  calls.length = 0;
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function quiet() {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
}

describe("create, with components", () => {
  it("initialises, adds the template's items, then writes the agent docs", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "create-dowel-cli-"));
    roots.push(cwd);
    quiet();

    await create({
      cwd,
      directory: "app",
      template: "saas",
      theme: "ocean",
      yes: true,
      skipInstall: true,
      skipComponents: false,
    });

    expect(calls.map((args) => args[0])).toEqual(["init", "add", "agents"]);
    expect(calls[1]).toContain("--skip-install");
  });

  it("asks for nothing from the CLI when components are skipped", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "create-dowel-cli-"));
    roots.push(cwd);
    quiet();

    await create({
      cwd,
      directory: "app",
      template: "starter",
      theme: "default",
      yes: true,
      skipInstall: true,
      skipComponents: true,
    });

    expect(calls).toEqual([]);
  });
});
