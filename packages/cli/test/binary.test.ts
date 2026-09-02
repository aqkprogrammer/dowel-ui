import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { createProject, LOCAL_REGISTRY } from "./fixtures";

/**
 * Exercises the binary itself.
 *
 * The other end-to-end tests call the command functions directly, which leaves
 * argument parsing, option wiring and the error boundary untested — and those
 * are the first things a user touches. Run through `tsx` rather than the built
 * output so this does not depend on build ordering.
 */

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "..", "src", "index.ts");
const created: string[] = [];

afterEach(() => {
  for (const root of created.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function run(args: string[]) {
  return spawnSync("npx", ["tsx", entry, ...args], {
    encoding: "utf8",
    cwd: join(here, ".."),
  });
}

describe("binary", () => {
  it("prints help", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("add");
    expect(result.stdout).toContain("list");
    expect(result.stdout).toContain("update");
  });

  it("prints the version from the manifest, not a hardcoded copy", () => {
    const manifest = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
      version: string;
    };

    const result = run(["--version"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(manifest.version);
  });

  it("initialises and adds a component through the real argument parser", () => {
    const root = createProject();
    created.push(root);

    const init = run([
      "--cwd",
      root,
      "--registry",
      LOCAL_REGISTRY,
      "init",
      "--yes",
      "--skip-install",
    ]);
    expect(init.status, init.stderr).toBe(0);
    expect(existsSync(join(root, "components.json"))).toBe(true);

    const add = run([
      "--cwd",
      root,
      "--registry",
      LOCAL_REGISTRY,
      "add",
      "button",
      "--yes",
      "--skip-install",
    ]);
    expect(add.status, add.stderr).toBe(0);
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/components/ui/spinner.tsx"))).toBe(true);
  });

  it("exits non-zero with a clean message, not a stack trace, on user error", () => {
    const root = createProject();
    created.push(root);

    const result = run(["--cwd", root, "--registry", LOCAL_REGISTRY, "add", "button", "--yes"]);
    expect(result.status).toBe(1);

    const output = result.stdout + result.stderr;
    expect(output).toContain("components.json");
    expect(output).toContain("init");
    expect(output).not.toContain("at Object.");
  });
});
