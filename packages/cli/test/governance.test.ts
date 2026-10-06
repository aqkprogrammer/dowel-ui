import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planUi, registryIndexSchema } from "@dowel-ui/registry";
import { afterEach, describe, expect, it, vi } from "vitest";

import { add } from "../src/commands/add";
import { diagnose } from "../src/commands/doctor";
import { init } from "../src/commands/init";
import { list } from "../src/commands/list";
import { createProject, LOCAL_REGISTRY } from "./fixtures";

/**
 * Deprecation, end to end: a copy of the real registry with `badge` retired
 * in favour of `button`.
 */

const created: string[] = [];
const DEPRECATED = { since: "0.13.0", reason: "Merged into Button.", replacement: "button" };

function registryWithDeprecation(): string {
  const dir = mkdtempSync(join(tmpdir(), "dowel-deprecated-"));
  created.push(dir);
  cpSync(LOCAL_REGISTRY, dir, { recursive: true });

  const itemPath = join(dir, "badge.json");
  const item = JSON.parse(readFileSync(itemPath, "utf8")) as Record<string, unknown>;
  writeFileSync(itemPath, JSON.stringify({ ...item, deprecated: DEPRECATED }));

  const indexPath = join(dir, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as { items: { name: string }[] };
  index.items = index.items.map((entry) =>
    entry.name === "badge" ? { ...entry, deprecated: DEPRECATED } : entry,
  );
  writeFileSync(indexPath, JSON.stringify(index));
  return dir;
}

function output(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((call) => String(call[0])).join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of created.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function project(registry: string): Promise<string> {
  const root = createProject();
  created.push(root);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  await init({ cwd: root, registry, yes: true, skipInstall: true });
  return root;
}

describe("a deprecated item", () => {
  it("still installs, after saying what to use instead", async () => {
    const registry = registryWithDeprecation();
    const root = await project(registry);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await add(["badge"], {
      cwd: root,
      registry,
      yes: true,
      overwrite: false,
      skipInstall: true,
    });

    expect(output(warn)).toContain(
      "badge is deprecated since 0.13.0: Merged into Button. Use button instead.",
    );
    expect(
      readFileSync(join(root, "src/components/ui/badge.tsx"), "utf8").length,
    ).toBeGreaterThan(0);
  });

  it("is marked in list", async () => {
    const registry = registryWithDeprecation();
    const root = await project(registry);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await list({ cwd: root, registry, json: false });
    expect(output(log)).toMatch(/badge .* deprecated, use button/);
  });

  it("is reported by doctor once installed", async () => {
    const registry = registryWithDeprecation();
    const root = await project(registry);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await add(["badge"], {
      cwd: root,
      registry,
      yes: true,
      overwrite: false,
      skipInstall: true,
    });

    const checks = await diagnose({ cwd: root, registry, offline: false, json: false });
    const check = checks.find((entry) => entry.label === "Deprecated");
    expect(check?.status).toBe("warn");
    expect(check?.detail).toBe("badge → button");
  });

  it("is never suggested for a new screen", () => {
    const registry = registryWithDeprecation();
    const index = registryIndexSchema.parse(
      JSON.parse(readFileSync(join(registry, "index.json"), "utf8")),
    );
    const plan = planUi("a status badge", index);
    expect(plan.install).not.toContain("badge");
  });
});
