import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { add } from "../src/commands/add";
import { agents } from "../src/commands/agents";
import { audit, auditProject } from "../src/commands/audit";
import { diffInstalled } from "../src/commands/diff";
import { diagnose } from "../src/commands/doctor";
import { init } from "../src/commands/init";
import { readConfig } from "../src/lib/config";
import { createProject, LOCAL_REGISTRY } from "./fixtures";

/**
 * `doctor`, `diff` and `audit`, against real scratch projects and the registry
 * built in this commit, like the other end-to-end tests.
 */

const created: string[] = [];

beforeAll(() => {
  if (!existsSync(join(LOCAL_REGISTRY, "index.json"))) {
    throw new Error(`No registry at ${LOCAL_REGISTRY}. Build @dowel-ui/registry first.`);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const root of created.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function setup(names: string[] = ["button"]): Promise<string> {
  const root = createProject();
  created.push(root);
  await init({ cwd: root, registry: LOCAL_REGISTRY, yes: true, skipInstall: true });
  await add(names, {
    cwd: root,
    registry: LOCAL_REGISTRY,
    yes: true,
    overwrite: false,
    skipInstall: true,
  });
  return root;
}

function write(root: string, path: string, content: string): void {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), content);
}

function quiet() {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
}

describe("doctor", () => {
  function statusOf(checks: Awaited<ReturnType<typeof diagnose>>, label: string) {
    return checks.find((check) => check.label === label)?.status;
  }

  it("passes a freshly set-up project, apart from what it is honest about", async () => {
    const root = await setup();
    const checks = await diagnose({
      cwd: root,
      registry: LOCAL_REGISTRY,
      offline: false,
      json: false,
    });

    for (const label of [
      "React",
      "TypeScript",
      "Tailwind CSS 4",
      "components.json",
      "Import alias",
      "Design tokens",
      "Installed files",
      "Registry",
      "Component dependencies",
      "Updates",
    ]) {
      expect(statusOf(checks, label), label).toBe("pass");
    }
    // Dependencies were skipped by the fixture, and the agent files never
    // written — both reported, neither invented.
    expect(statusOf(checks, "npm dependencies")).toBe("fail");
    expect(statusOf(checks, "Agent documentation")).toBe("warn");
  });

  it("reports a deleted file, a broken alias and missing tokens", async () => {
    const root = await setup();
    rmSync(join(root, "src/components/ui/button.tsx"));
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "~/*": ["./app/*"] } } }),
    );
    writeFileSync(join(root, "src/index.css"), '@import "tailwindcss";\n');

    const checks = await diagnose({ cwd: root, offline: true, json: false });
    expect(statusOf(checks, "Installed files")).toBe("fail");
    expect(statusOf(checks, "Import alias")).toBe("fail");
    expect(statusOf(checks, "Design tokens")).toBe("fail");
    expect(statusOf(checks, "Registry")).toBe("skip");
  });

  it("notices agent docs once written, and when they go stale", async () => {
    const root = await setup();
    quiet();
    await agents({ cwd: root, registry: LOCAL_REGISTRY, targets: [], check: false });
    let checks = await diagnose({
      cwd: root,
      registry: LOCAL_REGISTRY,
      offline: false,
      json: false,
    });
    expect(statusOf(checks, "Agent documentation")).toBe("pass");

    writeFileSync(join(root, ".dowel/components.md"), "stale\n");
    checks = await diagnose({
      cwd: root,
      registry: LOCAL_REGISTRY,
      offline: false,
      json: false,
    });
    expect(statusOf(checks, "Agent documentation")).toBe("warn");
  });

  it("refers a project with no components.json to init", async () => {
    const root = createProject();
    created.push(root);
    const checks = await diagnose({ cwd: root, offline: true, json: false });
    const config = checks.find((check) => check.label === "components.json");
    expect(config?.status).toBe("fail");
    expect(config?.hint).toMatch(/init/);
  });
});

describe("diff", () => {
  it("finds nothing to show right after an install", async () => {
    const root = await setup(["badge"]);
    const diffs = await diffInstalled([], { cwd: root, registry: LOCAL_REGISTRY });
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.every((entry) => entry.patch === undefined)).toBe(true);
  });

  it("shows a local edit as a unified diff against the registry", async () => {
    const root = await setup(["badge"]);
    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(
        "export function Badge(",
        "// mine\nexport function Badge(",
      ),
    );

    const [entry] = (
      await diffInstalled(["badge"], { cwd: root, registry: LOCAL_REGISTRY })
    ).filter((item) => item.patch !== undefined);
    expect(entry?.path).toBe("src/components/ui/badge.tsx");
    expect(entry?.patch).toContain("-// mine");
  });

  it("refuses a name that is not installed", async () => {
    const root = await setup(["badge"]);
    await expect(
      diffInstalled(["dialog"], { cwd: root, registry: LOCAL_REGISTRY }),
    ).rejects.toThrow(/Not installed/);
  });
});

describe("audit", () => {
  const base = { paths: [], rules: [], includeInstalled: false };

  it("reports what the rules find in the project's own code", async () => {
    const root = await setup(["button"]);
    write(
      root,
      "src/app/page.tsx",
      [
        "export default function Page() {",
        '  return <div className="bg-slate-900 ml-4 p-[12px]">',
        "    <button onClick={() => {}}>Go</button>",
        "  </div>;",
        "}",
      ].join("\n"),
    );

    const report = auditProject({ cwd: root, ...base });
    expect(report.files.map((file) => file.file)).toEqual(["src/app/page.tsx"]);
    expect(report.counts).toMatchObject({
      "palette-colour": 1,
      "physical-direction": 1,
      "off-scale": 1,
      "native-element": 1,
    });
  });

  it("leaves the files Dowel installed alone unless asked", async () => {
    const root = await setup(["button"]);
    const installed = Object.keys(readConfig(root).installed.button?.files ?? {});
    const report = auditProject({ cwd: root, ...base });
    for (const file of installed) {
      expect(report.files.map((entry) => entry.file)).not.toContain(file);
    }
    expect(
      auditProject({ cwd: root, ...base, includeInstalled: true }).scanned,
    ).toBeGreaterThan(report.scanned);
  });

  it("filters to the rules asked for, and rejects ones that do not exist", async () => {
    const root = await setup(["button"]);
    write(root, "src/x.tsx", 'export const X = () => <p className="bg-red-500 ml-2" />;\n');
    const report = auditProject({ cwd: root, ...base, rules: ["physical-direction"] });
    expect(report.counts["palette-colour"]).toBe(0);
    expect(report.counts["physical-direction"]).toBe(1);
    expect(() => auditProject({ cwd: root, ...base, rules: ["nope"] })).toThrow(/Unknown rule/);
  });

  it("fixes only what has one exact fix, and leaves the rest reported", async () => {
    const root = await setup(["button"]);
    write(
      root,
      "src/x.tsx",
      'export const X = () => <p className="bg-red-500 ml-2 pr-3" />;\n',
    );
    quiet();

    await audit({ cwd: root, ...base, json: false, fix: true, yes: true });
    expect(readFileSync(join(root, "src/x.tsx"), "utf8")).toBe(
      'export const X = () => <p className="bg-red-500 ms-2 pe-3" />;\n',
    );
    // The colour still needs a person, so the run still fails.
    expect(process.exitCode).toBe(1);
  });

  it("exits cleanly when there is nothing to report", async () => {
    const root = await setup(["button"]);
    write(root, "src/x.tsx", 'export const X = () => <p className="bg-primary ms-2" />;\n');
    quiet();
    await audit({ cwd: root, ...base, json: false, fix: false, yes: false });
    expect(process.exitCode).toBeUndefined();
  });
});
