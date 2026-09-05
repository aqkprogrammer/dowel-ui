import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  aiDoc,
  componentsDoc,
  conventionsDoc,
  planUi,
  renderBrief,
  renderPlan,
  themesDoc,
  type AgentDocsContext,
  type RegistryIndex,
  type RegistryIndexEntry,
} from "@dowel-ui/registry";
import { z } from "zod";

import { RegistryClient } from "./registry";

export interface ServerOptions {
  registryUrl: string;
  docsUrl: string;
  cliPackage: string;
  libraryName: string;
  version: string;
  /**
   * What the consuming project imports components from.
   *
   * A source-first install resolves to the project's own path alias; there is
   * no way for this process to know it, so it is configuration rather than a
   * guess. The published package is the honest default.
   */
  importFrom: string;
}

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function docsContext(options: ServerOptions, index: RegistryIndex): AgentDocsContext {
  return {
    index,
    registryUrl: options.registryUrl,
    docsUrl: options.docsUrl,
    cliPackage: options.cliPackage,
    libraryName: options.libraryName,
    importFrom: options.importFrom,
  };
}

function summarise(entry: RegistryIndexEntry): string {
  const kind = entry.type === "registry:block" ? "block" : "component";
  const status = entry.status === "stable" ? "" : ` (${entry.status})`;
  return `${entry.name} — ${kind}, ${entry.category}${status}\n  ${entry.description}`;
}

/**
 * Levenshtein distance, iterative with a single row.
 *
 * Only ever run against a name the caller got wrong, over a list of fewer than
 * a hundred short strings, so the row-per-character allocation a clearer
 * implementation would make is not worth avoiding — and the full matrix is not
 * worth keeping, since only the distance is wanted.
 */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;
      current[j] = Math.min(substitution, deletion, insertion);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

/**
 * Names closest to one that does not exist.
 *
 * Substring matching alone answers nothing for a typo — "datatabel" shares no
 * run with "data-table" — and a typo is exactly the case where a suggestion is
 * worth most, because the agent already knows what it wants. Hyphens are
 * dropped before comparing so "datatable" reads as one edit from "data-table"
 * rather than two.
 */
export function nearest(names: string[], query: string, limit = 3): string[] {
  const needle = query.toLowerCase().replace(/-/g, "");

  return (
    names
      .map((name) => ({ name, gap: distance(name.toLowerCase().replace(/-/g, ""), needle) }))
      // A third of the length: enough for a transposition or a dropped letter,
      // not enough to suggest "button" for "avatar".
      .filter(({ gap }) => gap <= Math.max(2, Math.floor(needle.length / 3)))
      .sort((a, b) => a.gap - b.gap || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map(({ name }) => name)
  );
}

/**
 * Scores a query against one entry.
 *
 * Name matches outrank description matches because an agent that already knows
 * roughly what a thing is called should get it first, and a word common to
 * thirty descriptions should not bury the component actually named after it.
 * Zero means no match, and no-match is excluded rather than ranked last.
 */
function score(entry: RegistryIndexEntry, query: string): number {
  const needle = query.toLowerCase().trim();
  if (needle.length === 0) return 1;

  const name = entry.name.toLowerCase();
  if (name === needle) return 100;
  if (name.startsWith(needle)) return 50;
  if (name.includes(needle)) return 25;
  if (entry.title.toLowerCase().includes(needle)) return 20;
  if (entry.category.toLowerCase() === needle) return 15;
  if (entry.description.toLowerCase().includes(needle)) return 10;
  return 0;
}

export function createServer(options: ServerOptions): McpServer {
  const registry = new RegistryClient(options.registryUrl);

  const server = new McpServer(
    { name: "dowel-ui", version: options.version },
    {
      instructions:
        `${options.libraryName} is a source-first React component system: components are ` +
        `installed into the project as editable files, not imported from a dependency.\n\n` +
        `Before writing any React UI, call search_components to check whether a component ` +
        `already exists — hand-writing a second Button is the most common mistake here. ` +
        `Call get_guide("conventions") once per session for the styling and accessibility ` +
        `rules, which differ from other libraries in ways worth knowing.`,
    },
  );

  server.registerTool(
    "search_components",
    {
      title: "Search components",
      description:
        "Search the component and block catalogue by name, description or category. " +
        "Call this before building any UI, to find what already exists. " +
        "Omit the query to list everything.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('What you need, e.g. "date", "chat", "table", "agent approval"'),
        category: z
          .string()
          .optional()
          .describe(
            "Restrict to one category: ai, form, overlay, data, feedback, navigation, display, layout, foundation",
          ),
        kind: z
          .enum(["component", "block", "any"])
          .optional()
          .describe("Blocks are whole sections assembled from components. Default: any"),
      },
    },
    async ({ query, category, kind }) => {
      const index = await registry.index();
      const wanted =
        kind === "component"
          ? ["registry:ui"]
          : kind === "block"
            ? ["registry:block"]
            : ["registry:ui", "registry:block"];

      const matches = index.items
        .filter((entry) => wanted.includes(entry.type))
        .filter((entry) => !category || entry.category === category)
        .map((entry) => ({ entry, rank: score(entry, query ?? "") }))
        .filter(({ rank }) => rank > 0)
        .sort((a, b) => b.rank - a.rank || a.entry.name.localeCompare(b.entry.name));

      if (matches.length === 0) {
        return text(
          `Nothing matches "${query ?? ""}". This registry has ` +
            `${String(index.items.length)} items — call search_components with no query to ` +
            `see them all. If nothing fits, build it from primitives rather than assuming ` +
            `a component exists.`,
        );
      }

      return text(
        `${String(matches.length)} match(es) in ${index.generatedFrom}:\n\n` +
          matches.map(({ entry }) => summarise(entry)).join("\n\n") +
          `\n\nCall get_component for usage and source. Install with ` +
          `\`npx ${options.cliPackage} add <name>\`.`,
      );
    },
  );

  server.registerTool(
    "get_component",
    {
      title: "Get a component",
      description:
        "Everything about one component or block: description, accessibility notes, what it " +
        "installs alongside, and optionally its full source. Use before writing code that " +
        "consumes it, so the props and markup come from the registry rather than memory.",
      inputSchema: {
        name: z
          .string()
          .describe('Registry name, e.g. "button", "ai-prompt-input", "dashboard"'),
        include_source: z
          .boolean()
          .optional()
          .describe(
            "Include the component's full source. Large — ask for it only when editing or extending the component. Default: false",
          ),
      },
    },
    async ({ name, include_source }) => {
      const index = await registry.index();
      const entry = index.items.find((item) => item.name === name);

      if (!entry) {
        const substring = index.items
          .map((item) => ({ item, rank: score(item, name) }))
          .filter(({ rank }) => rank > 0)
          .sort((a, b) => b.rank - a.rank)
          .slice(0, 5)
          .map(({ item }) => item.name);

        const near =
          substring.length > 0
            ? substring
            : nearest(
                index.items.map((item) => item.name),
                name,
              );

        return text(
          `No component named "${name}".` +
            (near.length > 0 ? ` Did you mean: ${near.join(", ")}?` : "") +
            ` Call search_components to see what exists — do not assume it does.`,
        );
      }

      // A licensed item has no public body to fetch. Everything the index knows
      // is still worth saying — what it is, what it is built from — followed by
      // how to get the rest, rather than a 404 that reads as the item not
      // existing when the point is that it does.
      if (entry.access === "pro") {
        return text(
          [
            `# ${entry.title} \`${entry.name}\``,
            "",
            entry.description,
            "",
            `Type: ${entry.type === "registry:block" ? "block" : "component"} · Category: ${entry.category} · Status: ${entry.status} · **Pro**`,
            "",
            `Install: \`npx ${options.cliPackage} add ${entry.name}\` — requires a licence. Sign in once with \`npx ${options.cliPackage} login\`, or set DOWEL_TOKEN in CI.`,
            "",
            entry.registryDependencies.length > 0
              ? `Also installs: ${entry.registryDependencies.join(", ")}\n`
              : "",
            `${String(entry.fileCount)} file(s). The source is served only to a licence holder, so this server cannot read it; once installed, read it from the project like any other file.`,
          ].join("\n"),
        );
      }

      const item = await registry.item(name);
      const lines = [
        `# ${item.title} \`${item.name}\``,
        "",
        item.description,
        "",
        `Type: ${item.type === "registry:block" ? "block" : "component"} · Category: ${item.category} · Status: ${item.status}`,
        "",
        `Install: \`npx ${options.cliPackage} add ${item.name}\``,
        `Import:  \`import { ... } from "${options.importFrom}"\``,
        "",
      ];

      if (item.registryDependencies.length > 0) {
        lines.push(`Also installs: ${item.registryDependencies.join(", ")}`, "");
      }
      if (item.dependencies.length > 0) {
        lines.push(`npm packages: ${item.dependencies.join(", ")}`, "");
      }
      if (item.a11y) {
        lines.push("## Accessibility", "", item.a11y, "");
      }

      if (include_source === true) {
        lines.push("## Source", "");
        for (const file of item.files) {
          lines.push(`### \`${file.path}\``, "", "```tsx", file.content, "```", "");
        }
      } else {
        lines.push(
          `${String(item.files.length)} file(s): ${item.files.map((file) => file.path).join(", ")}.`,
          "Call again with include_source: true to read them.",
          "",
        );
      }

      return text(lines.join("\n"));
    },
  );

  server.registerTool(
    "get_guide",
    {
      title: "Get a guide",
      description:
        "The rules for writing code with this system: conventions and accessibility, theming " +
        "and tokens, the AI components, or the full catalogue. Read conventions once per " +
        "session before writing UI.",
      inputSchema: {
        topic: z
          .enum(["conventions", "theming", "ai", "catalogue"])
          .describe(
            "conventions: styling and accessibility rules that differ from other libraries. " +
              "theming: tokens, presets, radius and motion scales. " +
              "ai: the AI surfaces and when to use each. " +
              "catalogue: every component and block.",
          ),
      },
    },
    async ({ topic }) => {
      const context = docsContext(options, await registry.index());
      const render = {
        conventions: conventionsDoc,
        theming: themesDoc,
        ai: aiDoc,
        catalogue: componentsDoc,
      }[topic];
      return text(render(context));
    },
  );

  server.registerTool(
    "install_command",
    {
      title: "Get the install command",
      description:
        "The exact command to install components, and the full list of what it will write. " +
        "Use this instead of composing an npm/pnpm install — these components are source, not " +
        "a package, and the CLI resolves their dependency graph.",
      inputSchema: {
        names: z.array(z.string()).min(1).describe("Registry names to install"),
      },
    },
    async ({ names }) => {
      let resolved;
      try {
        resolved = await registry.resolve(names);
      } catch (error) {
        return text(
          `${error instanceof Error ? error.message : String(error)}\n\n` +
            "Call search_components to check the name.",
        );
      }

      const extra = resolved.filter((item) => !names.includes(item.name));
      const npm = [...new Set(resolved.flatMap((item) => item.dependencies))];

      return text(
        [
          `\`\`\`bash`,
          `npx ${options.cliPackage} add ${names.join(" ")}`,
          `\`\`\``,
          "",
          `Writes ${String(resolved.length)} registry item(s): ${resolved.map((item) => item.name).join(", ")}.`,
          extra.length > 0
            ? `${String(extra.length)} of those are dependencies pulled in automatically: ${extra.map((item) => item.name).join(", ")}.`
            : "Nothing extra is pulled in.",
          npm.length > 0 ? `npm packages installed alongside: ${npm.join(", ")}.` : "",
          "",
          "Safe to re-run. A file the user has edited is never overwritten without `--overwrite`.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "plan_ui",
    {
      title: "Plan a screen",
      description:
        "Describe a screen and get the registry items that build it, the exact install " +
        "command, and a starting file. Use this before writing UI from a description — it " +
        "resolves against the catalogue, so it cannot suggest a component that does not exist.",
      inputSchema: {
        prompt: z
          .string()
          .min(3)
          .describe('What to build, e.g. "a billing page with usage and invoices"'),
        format: z
          .enum(["plan", "code", "both"])
          .optional()
          .describe("plan: what to install and why. code: a starting file. Default: both"),
      },
    },
    async ({ prompt, format }) => {
      const index = await registry.index();
      const plan = planUi(prompt, index);

      if (plan.empty) {
        return text(
          `Nothing in the registry matches "${prompt}".\n\n` +
            "Call search_components with a simpler term before building anything by hand — " +
            "and if there genuinely is no component for it, build it from primitives rather " +
            "than assuming one exists under another name.",
        );
      }

      const parts: string[] = [];

      if (format !== "code") {
        parts.push(
          renderBrief(plan, {
            cliPackage: options.cliPackage,
            docsUrl: options.docsUrl,
            importFrom: options.importFrom,
          }),
        );

        parts.push(
          "",
          "Why each was chosen:",
          ...[...plan.blocks, ...plan.components].map(
            (item) => `- ${item.entry.name}: ${item.because}`,
          ),
        );
      }

      if (format !== "plan") {
        parts.push(
          "",
          "A starting file:",
          "",
          "```tsx",
          renderPlan(plan, { importFrom: options.importFrom, docsUrl: options.docsUrl }).trim(),
          "```",
        );
      }

      // Deliberately not silent about the limit: the registry publishes what a
      // component is, not the shape of its props, so the plan stops at the
      // composition and the props come from get_component.
      parts.push(
        "",
        "Call get_component for each of these before writing props. This plan does not " +
          "include prop shapes, and a plausible invented prop is worse than none.",
      );

      return text(parts.join("\n"));
    },
  );

  return server;
}
