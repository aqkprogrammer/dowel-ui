import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildIndex, buildRegistry, freeItems, proItems, writeRegistry } from "./build";
import { hashContent } from "./hash";
import { registryIndexSchema, registryItemSchema, type RegistryItem } from "./schema";

/**
 * The registry is the boundary with every consumer's project, so these tests
 * check the shape and the invariants the CLI relies on — not the contents of
 * any particular component.
 */

const items = buildRegistry();

describe("hashContent", () => {
  it("produces a stable prefixed sha256", () => {
    expect(hashContent("hello")).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });

  it("distinguishes different content", () => {
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });

  it("ignores line endings, so a Windows checkout is not all modified", () => {
    expect(hashContent("a\r\nb")).toBe(hashContent("a\nb"));
  });
});

describe("buildRegistry", () => {
  it("emits every item in the published shape", () => {
    for (const item of items) {
      expect(() => registryItemSchema.parse(item)).not.toThrow();
    }
  });

  it("includes the two items init depends on", () => {
    const names = items.map((item) => item.name);
    expect(names).toContain("utils");
    expect(names).toContain("theme");
  });

  it("ships the components as registry:ui items", () => {
    const button = items.find((item) => item.name === "button");
    expect(button?.type).toBe("registry:ui");
    expect(button?.files[0]?.path).toBe("ui/button.tsx");
  });

  it("ships the tokens as a style item, not a file to write", () => {
    const theme = items.find((item) => item.name === "theme");
    expect(theme?.files[0]?.type).toBe("registry:style");
    expect(theme?.files[0]?.content).toContain("@theme");
    expect(theme?.files[0]?.content).toContain("--radius-scale");
  });

  it("hashes match the content actually published", () => {
    for (const item of items) {
      for (const file of item.files) {
        expect(file.hash).toBe(hashContent(file.content));
      }
    }
  });

  it("names every registry dependency that exists", () => {
    const names = new Set(items.map((item) => item.name));
    for (const item of items) {
      for (const dependency of item.registryDependencies) {
        expect(names.has(dependency), `${item.name} depends on missing "${dependency}"`).toBe(
          true,
        );
      }
    }
  });

  it("has no dependency cycles", () => {
    const graph = new Map(items.map((item) => [item.name, item.registryDependencies]));
    const state = new Map<string, "visiting" | "done">();

    function visit(name: string, trail: string[]): void {
      const current = state.get(name);
      if (current === "done") return;
      expect(current, `cycle: ${[...trail, name].join(" → ")}`).not.toBe("visiting");

      state.set(name, "visiting");
      for (const dependency of graph.get(name) ?? []) visit(dependency, [...trail, name]);
      state.set(name, "done");
    }

    for (const name of graph.keys()) visit(name, []);
  });

  it("preserves directives that must stay on the first line", () => {
    const dialog = items.find((item) => item.name === "dialog");
    expect(dialog?.files[0]?.content.startsWith('"use client"')).toBe(true);
  });

  it("does not ship tests or stories", () => {
    for (const item of items) {
      for (const file of item.files) {
        expect(file.path).not.toMatch(/\.(test|stories)\./);
      }
    }
  });

  it("is deterministic — the same source produces identical output", () => {
    expect(JSON.stringify(buildRegistry())).toBe(JSON.stringify(items));
  });
});

describe("buildIndex", () => {
  const index = buildIndex(items);

  it("matches the published shape", () => {
    expect(() => registryIndexSchema.parse(index)).not.toThrow();
  });

  it("lists every item", () => {
    expect(index.items).toHaveLength(items.length);
  });

  it("records where it was generated from, not when", () => {
    // A timestamp would make every build a diff even when nothing changed.
    // Scope and package name are branding, so only the shape is asserted here.
    expect(index.generatedFrom).toMatch(/^@[\w-]+\/[\w-]+@\d+\.\d+\.\d+$/);
    expect(JSON.stringify(index)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("omits file contents, so the index stays small", () => {
    expect(JSON.stringify(index)).not.toContain("export function");
  });
});

describe("access", () => {
  it("keeps everything that has ever shipped free, free", () => {
    // Free is a promise. Every component, the two init items, and the blocks
    // that were in the public registry before there was a paid catalogue must
    // stay installable without a licence; moving one behind the paywall would
    // break every project's next `update`.
    const shippedFreeBlocks = [
      "admin-users",
      "agent-console",
      "ai-chat",
      "ai-dashboard",
      "analytics",
      "billing",
      "dashboard",
      "forgot-password",
      "login",
      "onboarding",
      "pricing",
      "settings",
      "signup",
    ];
    for (const item of items) {
      if (item.type !== "registry:block" || shippedFreeBlocks.includes(item.name)) {
        expect(item.access, item.name).toBe("free");
      }
    }
  });

  it("licenses only blocks that were introduced as licensed", () => {
    for (const item of proItems(items)) {
      expect(item.type, item.name).toBe("registry:block");
    }
  });

  it("lists licensed items in the index but withholds their bodies", () => {
    const licensed: RegistryItem = {
      ...items[2]!,
      name: "pro-thing",
      access: "pro",
    };
    const all = [...items, licensed];

    // The catalogue names it: an item nobody can see is an item nobody buys.
    const entry = buildIndex(all).items.find((item) => item.name === "pro-thing");
    expect(entry).toBeDefined();
    expect(entry?.access).toBe("pro");
    expect(entry?.fileCount).toBeGreaterThan(0);

    // The goods are not in the public set.
    expect(freeItems(all).map((item) => item.name)).not.toContain("pro-thing");
    expect(proItems(all).map((item) => item.name)).toContain("pro-thing");
    expect(proItems(all)).toHaveLength(proItems(items).length + 1);
  });

  it("writes no licensed body into the public directory", () => {
    const outDir = mkdtempSync(join(tmpdir(), "registry-access-"));
    try {
      const result = writeRegistry(outDir);
      const all = buildRegistry();

      expect(result.licensed).toBe(proItems(all).length);
      // Every listed free item has a file and no licensed one does; the count
      // is the contract.
      const written = readdirSync(outDir).filter((file) => file !== "index.json");
      expect(written).toHaveLength(freeItems(all).length);
      for (const item of proItems(all)) {
        expect(written).not.toContain(`${item.name}.json`);
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe("the paywall", () => {
  it("keeps every block out of the component package's npm tarball", () => {
    // The registry withholds a licensed block's body, but the same source sits
    // in packages/ui, and that package publishes its `src`. If blocks were in
    // the tarball, the paid catalogue would ship free with every install of
    // @dowel-ui/react. Blocks are registry-only by design (ADR 0011), so the
    // whole directory is excluded rather than one negation per licensed item
    // that somebody has to remember.
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "..", "..", "ui", "package.json"), "utf8"),
    ) as { files: string[] };
    expect(pkg.files).toContain("!src/blocks");
  });

  it("lists licensed items in the index with their access, and nothing else about their source", () => {
    const index = buildIndex(items);
    for (const item of proItems(items)) {
      const entry = index.items.find((candidate) => candidate.name === item.name);
      expect(entry?.access).toBe("pro");
      expect(entry?.fileCount).toBe(item.files.length);
      expect(entry).not.toHaveProperty("files");
    }
  });
});
