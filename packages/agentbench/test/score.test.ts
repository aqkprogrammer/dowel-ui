import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { claudeArgs, parseClaudeResult } from "../src/adapters/claude-code";
import { stat } from "../src/summary";
import { a11yLint, analyseImports, audit, findImports, recall, typecheck } from "../src/score";
import { loadRegistry } from "../src/registry";
import type { Task } from "../src/tasks";

/**
 * Scoring against small projects written by hand, where the right answer is
 * known before the code runs.
 */

const registry = loadRegistry();
const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A project with components.json as `init` writes it and the given files. */
function fixture(files: Record<string, string>, installed: string[] = ["button"]): string {
  const dir = mkdtempSync(join(tmpdir(), "agentbench-score-"));
  created.push(dir);
  const all: Record<string, string> = {
    "components.json": JSON.stringify({
      version: 1,
      typescript: true,
      registry: registry.dir,
      tailwind: { css: "src/app/globals.css" },
      aliases: {
        components: "@/components",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
        utils: "@/lib/utils",
        blocks: "@/components/blocks",
      },
      resolve: { prefix: "@/", base: "src" },
      installed: Object.fromEntries(
        installed.map((name) => [
          name,
          { from: "1", files: { [`src/components/ui/${name}.tsx`]: "sha256:0" } },
        ]),
      ),
    }),
    ...Object.fromEntries(
      installed.map((name) => [`src/components/ui/${name}.tsx`, "export {};\n"]),
    ),
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

const task: Task = {
  id: "fixture",
  title: "Fixture",
  prompt: "A prompt long enough to satisfy the schema.",
  route: "src/app/fixture/page.tsx",
  install: ["button"],
  expect: ["button", "input", "alert-dialog"],
};

describe("findImports", () => {
  it("finds static, side-effect, dynamic and re-exported imports with their lines", () => {
    const source = [
      'import { Button } from "@/components/ui/button";',
      "import {",
      "  Card,",
      '} from "@/components/ui/card";',
      'import "./globals.css";',
      'const Chart = await import("@/components/ui/chart");',
      'export { Badge } from "@/components/ui/badge";',
    ].join("\n");
    expect(findImports(source)).toEqual([
      { specifier: "@/components/ui/button", line: 1 },
      { specifier: "@/components/ui/card", line: 4 },
      { specifier: "./globals.css", line: 5 },
      { specifier: "@/components/ui/chart", line: 6 },
      { specifier: "@/components/ui/badge", line: 7 },
    ]);
  });
});

describe("analyseImports", () => {
  const page = [
    'import { Button } from "@/components/ui/button";',
    'import { Button as Again } from "../../components/ui/button";',
    'import { Dialog } from "@/components/ui/dialog";',
    'import { FancyCard } from "@/components/ui/fancy-card";',
    'import { FloatingLabelInput } from "@/components/ui/floating-label-input";',
    'import { Login } from "@/components/blocks/login";',
    'import { useState } from "react";',
    'import { Mine } from "@/components/mine";',
  ].join("\n");

  it("counts a name the registry does not have as invented, whether or not the file exists", () => {
    const dir = fixture({
      "src/app/fixture/page.tsx": page,
      "src/components/ui/fancy-card.tsx": "export const FancyCard = null;\n",
    });
    const result = analyseImports(dir, ["src/app/fixture/page.tsx"], registry);
    expect(result.invented.imports).toEqual([
      {
        file: "src/app/fixture/page.tsx",
        line: 4,
        specifier: "@/components/ui/fancy-card",
        resolves: true,
      },
    ]);
  });

  it("counts a registry component that is not installed as uninstalled", () => {
    const dir = fixture({ "src/app/fixture/page.tsx": page });
    const result = analyseImports(dir, ["src/app/fixture/page.tsx"], registry);
    expect(result.uninstalled.imports.map((entry) => [entry.specifier, entry.items])).toEqual([
      ["@/components/ui/dialog", ["dialog"]],
      ["@/components/ui/floating-label-input", ["input"]],
      ["@/components/blocks/login", ["login"]],
    ]);
  });

  it("resolves relative imports into the UI folder and ignores everything outside it", () => {
    const dir = fixture({ "src/app/fixture/page.tsx": page });
    const result = analyseImports(dir, ["src/app/fixture/page.tsx"], registry);
    expect([...result.used].sort()).toEqual(["button", "dialog", "input", "login"]);
  });

  it("reads only the files it is given", () => {
    const dir = fixture({ "src/app/fixture/page.tsx": page });
    const result = analyseImports(dir, [], registry);
    expect(result.used.size).toBe(0);
    expect(result.invented.count).toBe(0);
  });
});

describe("recall", () => {
  it("is the share of expected components used", () => {
    const result = recall(task, new Set(["button"]), registry);
    expect(result.value).toBeCloseTo(1 / 3);
    expect(result.missing).toEqual(["input", "alert-dialog"]);
  });

  it("counts a component reached through a block the agent used", () => {
    // `login` is built from button and input, among others.
    const result = recall(task, new Set(["login"]), registry);
    expect(result.matched).toEqual(["button", "input"]);
    expect(result.matchedDirectly).toEqual([]);
    expect(result.missing).toEqual(["alert-dialog"]);
  });
});

describe("audit", () => {
  it("parses the CLI's JSON findings for the changed files", () => {
    const dir = fixture({
      "src/app/fixture/page.tsx": [
        "export default function Page() {",
        '  return <div className="bg-slate-900 ml-4">Hello</div>;',
        "}",
      ].join("\n"),
    });
    const result = audit(dir, ["src/app/fixture/page.tsx"]);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.scanned).toBe(1);
    expect(result.counts["palette-colour"]).toBe(1);
    expect(result.counts["physical-direction"]).toBe(1);
    expect(result.total).toBe(2);
  });

  it("is skipped when no source file changed", () => {
    expect(audit(fixture({}), ["README.md"]).status).toBe("skipped");
  });
});

describe("a11yLint", () => {
  it("reports the jsx-a11y errors this repository lints with", async () => {
    const dir = fixture({
      "src/app/fixture/page.tsx": [
        "export default function Page() {",
        '  return <img src="/logo.png" />;',
        "}",
      ].join("\n"),
    });
    const result = await a11yLint(dir, ["src/app/fixture/page.tsx"]);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.errors).toBe(1);
    expect(result.messages[0]?.rule).toBe("jsx-a11y/alt-text");
    expect(result.parseErrors).toBe(0);
  });

  it("is skipped when no .tsx file changed", async () => {
    expect((await a11yLint(fixture({}), ["src/lib/x.ts"])).status).toBe("skipped");
  });
});

describe("typecheck", () => {
  it("is skipped, not failed, when dependencies were not installed", () => {
    expect(typecheck(fixture({})).status).toBe("skipped");
  });
});

describe("claude-code adapter", () => {
  it("gives the MCP config only to the with-dowel condition", () => {
    const withDowel = claudeArgs("/work", "Build it", "with-dowel");
    const without = claudeArgs("/work", "Build it", "without");
    expect(withDowel).toContain("--mcp-config");
    expect(withDowel[withDowel.indexOf("--mcp-config") + 1]).toBe("/work/.mcp.json");
    expect(without).not.toContain("--mcp-config");
    // Everything else is identical, so the MCP config is the only difference.
    expect(withDowel.slice(0, without.length)).toEqual(without);
  });

  it("isolates the run from the person's own settings without --bare", () => {
    const args = claudeArgs("/work", "Build it", "without");
    expect(args).not.toContain("--bare");
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("project");
    expect(args).toContain("--strict-mcp-config");
    expect(args.slice(0, 2)).toEqual(["-p", "Build it"]);
  });

  it("reads usage fields when present and nothing when they are not", () => {
    expect(
      parseClaudeResult(
        JSON.stringify({ type: "result", num_turns: 4, total_cost_usd: 0.5, is_error: false }),
      ),
    ).toEqual({ turns: 4, costUsd: 0.5, isError: false });
    expect(parseClaudeResult(JSON.stringify({ type: "result" }))).toEqual({});
    expect(parseClaudeResult("not json")).toBeUndefined();
  });
});

describe("stat", () => {
  it("leaves unmeasured runs out of n rather than counting them as zero", () => {
    expect(stat([1, undefined, 3, 4])).toEqual({ n: 3, mean: 8 / 3, median: 3 });
    expect(stat([1, 2])).toEqual({ n: 2, mean: 1.5, median: 1.5 });
    expect(stat([undefined])).toEqual({ n: 0, mean: null, median: null });
  });
});
