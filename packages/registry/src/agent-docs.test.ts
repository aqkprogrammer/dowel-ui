import { describe, expect, it } from "vitest";

import {
  AGENTS_MARKER_END,
  AGENTS_MARKER_START,
  agentsSection,
  componentsDoc,
  llmsTxt,
  upsertAgentsSection,
  type AgentDocsContext,
} from "./agent-docs";
import type { RegistryIndex, RegistryIndexEntry } from "./schema";

function entry(over: Partial<RegistryIndexEntry> = {}): RegistryIndexEntry {
  return {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "Triggers an action.",
    category: "foundation",
    status: "stable",
    dependencies: [],
    registryDependencies: [],
    access: "free",
    fileCount: 1,
    ...over,
  };
}

function context(items: RegistryIndexEntry[]): AgentDocsContext {
  const index: RegistryIndex = {
    registryVersion: 1,
    generatedFrom: "@dowel-ui/react@0.0.0",
    items,
  };
  return {
    index,
    registryUrl: "https://example.test/r",
    docsUrl: "https://example.test",
    cliPackage: "@dowel-ui/cli",
    libraryName: "Dowel",
    importFrom: "@/components/ui",
  };
}

describe("componentsDoc", () => {
  it("includes a component whose category the curated order does not name", () => {
    // The failure this guards is silent: a filtered list drops the component
    // and nothing reports it, which is how Card went missing from the docs.
    const doc = componentsDoc(
      context([entry(), entry({ name: "gauge", category: "telemetry" })]),
    );

    expect(doc).toContain("gauge");
    expect(doc).toContain("telemetry");
  });

  it("marks what is installed only when the caller knows", () => {
    const items = [entry(), entry({ name: "card" })];

    const known = componentsDoc({ ...context(items), installed: ["button"] });
    expect(known).toContain("✓ **button**");
    expect(known).not.toContain("✓ **card**");

    const unknown = componentsDoc(context(items));
    expect(unknown).not.toContain("✓");
  });

  it("counts blocks separately from components", () => {
    const doc = componentsDoc(
      context([entry(), entry({ name: "login", type: "registry:block", category: "form" })]),
    );

    expect(doc).toContain("1 components and 1 blocks");
  });
});

describe("llmsTxt", () => {
  it("links every component absolutely, since there is no base to resolve against", () => {
    const doc = llmsTxt(context([entry()]));

    expect(doc).toContain("(https://example.test/docs/components/button)");
    expect(doc).not.toMatch(/\]\(\/docs/);
  });
});

describe("upsertAgentsSection", () => {
  const section = agentsSection(context([entry()]));

  it("appends to a file that has no marked block, keeping what was there", () => {
    const result = upsertAgentsSection("# My app\n\nNotes.\n", section);

    expect(result).toContain("# My app");
    expect(result).toContain("Notes.");
    expect(result).toContain(AGENTS_MARKER_START);
  });

  it("replaces the marked block rather than appending a second one", () => {
    const once = upsertAgentsSection("# My app\n", section);
    const twice = upsertAgentsSection(once, section);

    expect(twice).toBe(once);
    expect(twice.split(AGENTS_MARKER_START)).toHaveLength(2);
    expect(twice.split(AGENTS_MARKER_END)).toHaveLength(2);
  });

  it("preserves text written after the block", () => {
    const before = `# My app\n\n${section}\n\n## Deploy\n\nRun it.\n`;
    const result = upsertAgentsSection(before, section);

    expect(result).toContain("## Deploy");
    expect(result).toContain("Run it.");
  });

  it("writes just the block into an empty file", () => {
    expect(upsertAgentsSection("", section).trim()).toBe(section.trim());
  });
});
