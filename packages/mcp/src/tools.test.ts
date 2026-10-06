import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  registryIndexSchema,
  registryItemSchema,
  type RegistryIndex,
  type RegistryIndexEntry,
} from "@dowel-ui/registry";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RegistryClient } from "./registry";
import { createServer } from "./server";

/**
 * Contract tests for every tool, through the real protocol.
 *
 * The server is connected to an SDK client over the in-memory transport, so a
 * test exercises what an agent actually gets: the tool list, the input schemas
 * the SDK validates against, and the text that comes back. Calling the handler
 * functions directly would skip the registration — the part most likely to
 * drift unnoticed — and the registry is the real one this commit builds, read
 * from disk, so the assertions are about the catalogue that ships.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** The registry emitted by `@dowel-ui/registry`'s build, in this same commit. */
const LOCAL_REGISTRY = join(here, "..", "..", "registry", "r");

const CLI = "@dowel-ui/cli";
const IMPORT_FROM = "@dowel-ui/react";
const DOCS = "https://docs.example.test";

const TOOLS = [
  "get_component",
  "get_guide",
  "install_command",
  "plan_ui",
  "search_components",
] as const;

let client: Client;
let index: RegistryIndex;

function entry(name: string): RegistryIndexEntry {
  const found = index.items.find((item) => item.name === name);
  if (!found) throw new Error(`Test fixture assumes "${name}" is in the registry.`);
  return found;
}

/** A Pro block, chosen from the index so the test follows the catalogue. */
function proBlock(): RegistryIndexEntry {
  const found = index.items.find(
    (item) => item.access === "pro" && item.type === "registry:block",
  );
  if (!found) throw new Error("Test fixture assumes the registry lists a Pro block.");
  return found;
}

interface Result {
  text: string;
  isError: boolean;
}

async function call(name: string, args: Record<string, unknown>): Promise<Result> {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as { type: string; text?: string }[];
  return {
    text: content.map((part) => part.text ?? "").join("\n"),
    isError: result.isError === true,
  };
}

interface Hit {
  name: string;
  kind: string;
  category: string;
  notes: string;
}

/** The `name — kind, category (notes)` lines search_components prints, parsed. */
function searchHits(text: string): Hit[] {
  return [...text.matchAll(/^(\S+) — (component|block), (\S+?)(?: \(([^)]*)\))?$/gm)].map(
    ([, name = "", kind = "", category = "", notes = ""]) => ({ name, kind, category, notes }),
  );
}

beforeAll(async () => {
  if (!existsSync(join(LOCAL_REGISTRY, "index.json"))) {
    throw new Error(
      `No registry at ${LOCAL_REGISTRY}. Build it first: pnpm --filter @dowel-ui/registry build ` +
        "(turbo does this for `pnpm test`, since @dowel-ui/registry is a dependency).",
    );
  }
  index = registryIndexSchema.parse(
    JSON.parse(readFileSync(join(LOCAL_REGISTRY, "index.json"), "utf8")),
  );

  const server = createServer({
    registryUrl: LOCAL_REGISTRY,
    docsUrl: DOCS,
    cliPackage: CLI,
    libraryName: "Dowel",
    importFrom: IMPORT_FROM,
    version: "0.0.0-test",
  });
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "contract-test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
});

afterAll(async () => {
  await client.close();
});

describe("tool registration", () => {
  it("lists exactly the five tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([...TOOLS]);
    for (const tool of tools) {
      expect(tool.description, tool.name).toBeTruthy();
      expect(tool.inputSchema.type, tool.name).toBe("object");
    }
  });

  it("publishes each tool's input schema", async () => {
    const { tools } = await client.listTools();
    const schema = (name: string) => {
      const tool = tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error(`No tool ${name}`);
      return tool.inputSchema as {
        properties: Record<string, Record<string, unknown>>;
        required?: string[];
      };
    };

    const search = schema("search_components");
    expect(Object.keys(search.properties).sort()).toEqual(["category", "kind", "query"]);
    expect(search.properties.kind?.enum).toEqual(["component", "block", "any"]);
    expect(search.required ?? []).toEqual([]);

    const get = schema("get_component");
    expect(Object.keys(get.properties).sort()).toEqual(["include_source", "name"]);
    expect(get.properties.include_source?.type).toBe("boolean");
    expect(get.required).toEqual(["name"]);

    const guide = schema("get_guide");
    expect(guide.properties.topic?.enum).toEqual(["conventions", "theming", "ai", "catalogue"]);
    expect(guide.required).toEqual(["topic"]);

    const install = schema("install_command");
    expect(install.properties.names?.type).toBe("array");
    expect(install.properties.names?.minItems).toBe(1);
    expect(install.required).toEqual(["names"]);

    const plan = schema("plan_ui");
    expect(plan.properties.prompt?.minLength).toBe(3);
    expect(plan.properties.format?.enum).toEqual(["plan", "code", "both"]);
    expect(plan.required).toEqual(["prompt"]);
  });

  it("rejects arguments the schemas do not allow, as a tool error", async () => {
    const badTopic = await call("get_guide", { topic: "everything" });
    expect(badTopic.isError).toBe(true);
    expect(badTopic.text).toMatch(/Input validation error/);

    expect((await call("install_command", { names: [] })).isError).toBe(true);
    expect((await call("plan_ui", { prompt: "ab" })).isError).toBe(true);
    expect((await call("get_component", {})).isError).toBe(true);
  });
});

describe("search_components", () => {
  it("lists every component and block when there is no query", async () => {
    const { text, isError } = await call("search_components", {});
    const listed = index.items.filter(
      (item) => item.type === "registry:ui" || item.type === "registry:block",
    );

    expect(isError).toBe(false);
    expect(text).toContain(`${String(listed.length)} match(es) in ${index.generatedFrom}`);
    expect(searchHits(text)).toHaveLength(listed.length);
    // Libraries and themes are installed as dependencies, not asked for.
    expect(searchHits(text).map((hit) => hit.name)).not.toContain("utils");
  });

  it("ranks the component named after the query first", async () => {
    const { text } = await call("search_components", { query: "button" });
    const hits = searchHits(text);

    expect(hits[0]).toEqual({
      name: "button",
      kind: "component",
      category: "foundation",
      notes: "",
    });
    expect(hits.map((hit) => hit.name)).toContain("morph-button");
    expect(text).toContain(`npx ${CLI} add <name>`);
  });

  it("matches descriptions as well as names", async () => {
    const hits = searchHits((await call("search_components", { query: "date" })).text);
    expect(hits.map((hit) => hit.name)).toEqual(
      expect.arrayContaining(["date-picker", "calendar"]),
    );
  });

  it("restricts to one category", async () => {
    const hits = searchHits((await call("search_components", { category: "overlay" })).text);
    const expected = index.items.filter(
      (item) =>
        item.category === "overlay" &&
        (item.type === "registry:ui" || item.type === "registry:block"),
    );

    expect(hits.length).toBe(expected.length);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.category === "overlay")).toBe(true);
    expect(hits.map((hit) => hit.name)).toContain("dialog");
  });

  it("restricts to blocks or to components", async () => {
    const blocks = searchHits((await call("search_components", { kind: "block" })).text);
    const components = searchHits(
      (await call("search_components", { kind: "component" })).text,
    );

    expect(blocks.length).toBe(index.items.filter((i) => i.type === "registry:block").length);
    expect(blocks.every((hit) => hit.kind === "block")).toBe(true);
    expect(blocks.map((hit) => hit.name)).toContain("dashboard");

    expect(components.length).toBe(index.items.filter((i) => i.type === "registry:ui").length);
    expect(components.every((hit) => hit.kind === "component")).toBe(true);
    expect(components.map((hit) => hit.name)).not.toContain("dashboard");
  });

  it("combines query, category and kind", async () => {
    const hits = searchHits(
      (await call("search_components", { query: "chat", category: "ai", kind: "block" })).text,
    );
    expect(hits.map((hit) => hit.name)).toContain("ai-chat");
    expect(hits.every((hit) => hit.kind === "block" && hit.category === "ai")).toBe(true);
  });

  it("marks Pro items, and only those", async () => {
    const hits = searchHits((await call("search_components", { kind: "block" })).text);
    const pro = new Set(
      index.items.filter((item) => item.access === "pro").map((item) => item.name),
    );

    expect(pro.size).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.notes.split(", ").includes("Pro"), hit.name).toBe(pro.has(hit.name));
    }
  });

  it("says so, and how to recover, when nothing matches", async () => {
    const { text, isError } = await call("search_components", { query: "zzqx-nothing" });
    expect(isError).toBe(false);
    expect(text).toContain('Nothing matches "zzqx-nothing"');
    expect(text).toContain(`${String(index.items.length)} items`);
    expect(searchHits(text)).toEqual([]);
  });
});

describe("get_component", () => {
  it("describes a free component without its source by default", async () => {
    const button = entry("button");
    const { text, isError } = await call("get_component", { name: "button" });

    expect(isError).toBe(false);
    expect(text).toContain("# Button `button`");
    expect(text).toContain(button.description);
    expect(text).toContain("Type: component · Category: foundation");
    expect(text).toContain(`Install: \`npx ${CLI} add button\``);
    expect(text).toContain(`from "${IMPORT_FROM}"`);
    expect(text).toContain(`Also installs: ${button.registryDependencies.join(", ")}`);
    expect(text).toContain("## Accessibility");
    expect(text).toContain("ui/button.tsx");
    expect(text).toContain("include_source: true");
    expect(text).not.toContain("## Source");
    expect(text).not.toContain("**Pro**");
  });

  it("includes the full source when asked", async () => {
    const item = registryItemSchema.parse(
      JSON.parse(readFileSync(join(LOCAL_REGISTRY, "button.json"), "utf8")),
    );
    const { text } = await call("get_component", { name: "button", include_source: true });

    expect(text).toContain("## Source");
    for (const file of item.files) {
      expect(text).toContain(`### \`${file.path}\``);
      expect(text).toContain(file.content);
    }
  });

  it("describes a block", async () => {
    const dashboard = entry("dashboard");
    const { text, isError } = await call("get_component", { name: "dashboard" });

    expect(isError).toBe(false);
    expect(text).toContain("Type: block");
    expect(text).toContain(`Also installs: ${dashboard.registryDependencies.join(", ")}`);
    expect(text).toContain("blocks/dashboard.tsx");
  });

  it("describes a Pro item from the index and says how to get it, without source", async () => {
    const pro = proBlock();
    // The premise: a licensed item's body is withheld from the public registry.
    expect(existsSync(join(LOCAL_REGISTRY, `${pro.name}.json`))).toBe(false);

    const { text, isError } = await call("get_component", {
      name: pro.name,
      include_source: true,
    });

    expect(isError).toBe(false);
    expect(text).toContain(`\`${pro.name}\``);
    expect(text).toContain(pro.description);
    expect(text).toContain("**Pro**");
    expect(text).toContain("requires a licence");
    expect(text).toContain(`npx ${CLI} login`);
    expect(text).toContain("DOWEL_TOKEN");
    expect(text).toContain(`Also installs: ${pro.registryDependencies.join(", ")}`);
    expect(text).not.toContain("## Source");
    expect(text).not.toMatch(/not found/i);
  });

  it("suggests the real name for a typo, as an error", async () => {
    const { text, isError } = await call("get_component", { name: "datatabel" });

    expect(isError).toBe(true);
    expect(text).toContain('No component named "datatabel"');
    expect(text).toContain("Did you mean: data-table?");
    expect(text).toContain("search_components");
  });

  it("explains the naming rules for a name that could never match", async () => {
    const { text, isError } = await call("get_component", { name: "Button" });

    expect(isError).toBe(true);
    expect(text).toContain("lowercase letters, digits and hyphens");
    expect(text).toMatch(/Did you mean: button\b/);
  });

  it("never turns a name into a path outside the registry", async () => {
    const { text, isError } = await call("get_component", { name: "../package" });

    expect(isError).toBe(true);
    expect(text).toContain('No component named "../package"');
    expect(text).not.toContain("malformed");
  });
});

describe("get_guide", () => {
  it("conventions: the source-first rules and how to add a component", async () => {
    const { text, isError } = await call("get_guide", { topic: "conventions" });

    expect(isError).toBe(false);
    expect(text).toMatch(/^# Dowel — conventions/);
    expect(text).toContain("source-first");
    expect(text).toContain(`npx ${CLI} add <name>`);
  });

  it("theming: the token tiers and presets", async () => {
    const { text } = await call("get_guide", { topic: "theming" });

    expect(text).toMatch(/^# Dowel — theming/);
    expect(text).toContain("--primary");
    expect(text).toContain("data-theme");
  });

  it("ai: every AI component, with guidance on choosing", async () => {
    const { text } = await call("get_guide", { topic: "ai" });
    const ai = index.items.filter(
      (item) => item.type === "registry:ui" && item.category === "ai",
    );

    expect(text).toMatch(/^# Dowel — AI components/);
    expect(text).toContain(`${String(ai.length)} surfaces`);
    for (const item of ai) expect(text).toContain(`**${item.name}**`);
    expect(text).toContain("## Choosing between them");
  });

  it("catalogue: every component and block in the registry", async () => {
    const { text } = await call("get_guide", { topic: "catalogue" });
    const ui = index.items.filter((item) => item.type === "registry:ui");
    const blocks = index.items.filter((item) => item.type === "registry:block");

    expect(text).toMatch(/^# Dowel — catalogue/);
    expect(text).toContain(
      `${String(ui.length)} components and ${String(blocks.length)} blocks, generated from \`${index.generatedFrom}\``,
    );
    for (const item of [...ui, ...blocks]) expect(text).toContain(`**${item.name}**`);
  });
});

describe("install_command", () => {
  it("gives the command and what a component pulls in", async () => {
    const button = entry("button");
    const { text, isError } = await call("install_command", { names: ["button"] });

    expect(isError).toBe(false);
    expect(text).toContain(`\`\`\`bash\nnpx ${CLI} add button\n\`\`\``);
    for (const dependency of button.registryDependencies) expect(text).toContain(dependency);
    expect(text).toMatch(/dependencies pulled in automatically: .*spinner/);
    for (const npm of button.dependencies) expect(text).toContain(npm);
    expect(text).not.toContain("licence");
  });

  it("orders dependencies before what needs them, and lists each once", async () => {
    const { text } = await call("install_command", {
      names: ["dialog", "dashboard", "dialog"],
    });
    const written = /Writes (\d+) registry item\(s\): (.+)\./.exec(text);

    expect(text).toContain(`npx ${CLI} add dialog dashboard\n`);
    expect(written).not.toBeNull();
    const order = (written?.[2] ?? "").split(", ");
    expect(new Set(order).size).toBe(order.length);
    expect(Number(written?.[1])).toBe(order.length);
    for (const dependency of entry("dashboard").registryDependencies) {
      expect(order.indexOf(dependency)).toBeLessThan(order.indexOf("dashboard"));
    }
  });

  it("gives the command for a block", async () => {
    const { text, isError } = await call("install_command", { names: ["dashboard"] });

    expect(isError).toBe(false);
    expect(text).toContain(`npx ${CLI} add dashboard`);
    expect(text).toMatch(/Writes \d+ registry item\(s\): .*dashboard\./);
  });

  it("gives a Pro item its command and says it needs a licence — not that it is missing", async () => {
    const pro = proBlock();
    const { text, isError } = await call("install_command", { names: [pro.name] });

    expect(isError).toBe(false);
    expect(text).not.toMatch(/not found/i);
    expect(text).toContain(`npx ${CLI} add ${pro.name}`);
    expect(text).toContain("Requires a licence");
    expect(text).toContain(`${pro.name} is a Pro item`);
    expect(text).toContain(`npx ${CLI} login`);
    expect(text).toContain("DOWEL_TOKEN");
    // Its free dependencies are still listed, from the index.
    for (const dependency of pro.registryDependencies) expect(text).toContain(dependency);
  });

  it("names only the Pro items when free and Pro are installed together", async () => {
    const pro = proBlock();
    const { text } = await call("install_command", { names: ["button", pro.name] });

    expect(text).toContain(`npx ${CLI} add button ${pro.name}`);
    expect(text).toContain(`**Requires a licence:** ${pro.name} is a Pro item`);
  });

  it("lists every unknown name with suggestions, and gives no command", async () => {
    const { text, isError } = await call("install_command", {
      names: ["button", "datatabel", "kanban-wombat"],
    });

    expect(isError).toBe(true);
    expect(text).toContain('Not in the registry: "datatabel", "kanban-wombat".');
    expect(text).toContain('"datatabel" — did you mean: data-table?');
    expect(text).toContain('"kanban-wombat"');
    expect(text).not.toContain("npx");
    expect(text).not.toContain('"button"');
  });

  it("refuses a name that is not a registry name before it becomes a path", async () => {
    // "../package" resolves to packages/registry/package.json from the local
    // registry directory — a real file, outside the registry.
    const { text, isError } = await call("install_command", { names: ["../package"] });

    expect(isError).toBe(true);
    expect(text).toContain('"../package" is not a valid registry name');
    expect(text).not.toContain("malformed");
  });
});

describe("plan_ui", () => {
  const prompt = "a billing page with usage and invoices";

  it("plan: what to install and why, without code", async () => {
    const { text, isError } = await call("plan_ui", { prompt, format: "plan" });

    expect(isError).toBe(false);
    expect(text).toContain(`Build: ${prompt}`);
    expect(text).toMatch(/^- billing — /m);
    expect(text).toMatch(new RegExp(`npx ${CLI} add [a-z -]*\\bbilling\\b`));
    expect(text).toContain("Why each was chosen:");
    expect(text).toMatch(/^- billing: \S/m);
    expect(text).not.toContain("```tsx");
    expect(text).toContain("Call get_component for each of these before writing props");
  });

  it("code: a starting file that imports and renders what it planned", async () => {
    const { text, isError } = await call("plan_ui", { prompt, format: "code" });

    expect(isError).toBe(false);
    expect(text).toContain("A starting file:");
    expect(text).toContain("```tsx");
    expect(text).toMatch(/import \{ BillingBlock \} from "[^"]+\/billing";/);
    expect(text).toContain("<BillingBlock />");
    expect(text).toContain("export default function");
    expect(text).not.toContain("Why each was chosen:");
  });

  it("both, by default", async () => {
    const { text } = await call("plan_ui", { prompt: "a chat interface for an AI assistant" });

    expect(text).toMatch(/^- ai-chat — /m);
    expect(text).toContain("Why each was chosen:");
    expect(text).toContain("```tsx");
    expect(text).toContain("<AiChatBlock />");
  });

  it("only ever plans items that exist", async () => {
    const { text } = await call("plan_ui", { prompt, format: "plan" });
    const chosen = [...text.matchAll(/^- ([a-z0-9-]+): /gm)].map(([, name = ""]) => name);
    const known = new Set(index.items.map((item) => item.name));

    expect(chosen.length).toBeGreaterThan(0);
    for (const name of chosen) expect(known.has(name), name).toBe(true);
  });

  it("says when a planned block needs a licence, and not otherwise", async () => {
    const crm = entry("crm");
    expect(crm.access).toBe("pro");

    const { text } = await call("plan_ui", { prompt: "a CRM with contacts and deals" });
    expect(text).toMatch(/^- crm — /m);
    expect(text).toContain("**Requires a licence:** crm is a Pro item");
    expect(text).toContain(`npx ${CLI} login`);

    const free = await call("plan_ui", { prompt, format: "plan" });
    expect(free.text).not.toContain("licence");
  });

  it("says nothing matches rather than inventing a component", async () => {
    const { text, isError } = await call("plan_ui", { prompt: "zzqx frobnicate" });

    expect(isError).toBe(false);
    expect(text).toContain('Nothing in the registry matches "zzqx frobnicate"');
    expect(text).not.toContain("npx");
  });
});

describe("RegistryClient", () => {
  it("refuses a name that is not a registry name rather than reading it as a path", async () => {
    const registry = new RegistryClient(LOCAL_REGISTRY);
    await expect(registry.item("../package")).rejects.toThrow("is not a registry item name");
  });

  it("resolves a Pro item's graph from the index, without its withheld body", async () => {
    const registry = new RegistryClient(LOCAL_REGISTRY);
    const pro = proBlock();
    const resolved = await registry.resolve([pro.name]);

    expect(resolved.at(-1)?.name).toBe(pro.name);
    for (const dependency of pro.registryDependencies) {
      expect(resolved.map((item) => item.name)).toContain(dependency);
    }
  });

  it("names the missing entry when the index does not have it", async () => {
    const registry = new RegistryClient(LOCAL_REGISTRY);
    await expect(registry.resolve(["kanban-wombat"])).rejects.toThrow(
      '"kanban-wombat" is not in the registry index.',
    );
  });
});
