import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  aiDoc,
  AUDIT_RULES,
  auditSource,
  componentsDoc,
  conventionsDoc,
  planUi,
  registryItemNameSchema,
  renderBrief,
  renderPlan,
  themesDoc,
  type AgentDocsContext,
  type RegistryIndex,
  type RegistryIndexEntry,
  type RegistryItem,
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

/**
 * A result the agent should treat as a failed call.
 *
 * Still text the model reads — the suggestions in it are the useful part — but
 * flagged, so a client can tell "here is the answer" from "that name is wrong"
 * without parsing prose.
 */
function failure(value: string) {
  return { ...text(value), isError: true };
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
  // Pro is marked where the item is first seen, so an agent choosing between
  // two candidates knows one of them needs a licence before it commits to it.
  const notes = [
    ...(entry.deprecated
      ? [
          `deprecated${entry.deprecated.replacement ? `, use ${entry.deprecated.replacement}` : ""}`,
        ]
      : []),
    ...(entry.status === "stable" ? [] : [entry.status]),
    ...(entry.access === "pro" ? ["Pro"] : []),
  ];
  const suffix = notes.length > 0 ? ` (${notes.join(", ")})` : "";
  const use = entry.guidance ? `\n  Use for: ${entry.guidance.useWhen.join("; ")}` : "";
  return `${entry.name} — ${kind}, ${entry.category}${suffix}\n  ${entry.description}${use}`;
}

/**
 * The genome's account of an item: when to use it, what it is confused with,
 * and the facts read from its source. Shared by free and Pro items, since the
 * index carries all of it for both.
 */
function genomeLines(entry: RegistryIndexEntry): string[] {
  const lines: string[] = [];
  const { guidance, composesWith, capabilities, deprecated, owner } = entry;

  if (deprecated) {
    lines.push(
      `**Deprecated** since ${deprecated.since}: ${deprecated.reason}` +
        (deprecated.replacement
          ? ` Use \`${deprecated.replacement}\` instead — call get_component for it.`
          : " Do not use it in new code."),
      "",
    );
  }
  if (owner) lines.push(`Maintained by: ${owner}`, "");

  if (guidance) {
    lines.push("## When to use it", "");
    for (const phrase of guidance.useWhen) lines.push(`- ${phrase}`);
    if (guidance.avoidWhen.length > 0) {
      lines.push("", "Not for:");
      for (const phrase of guidance.avoidWhen) lines.push(`- ${phrase}`);
    }
    if (guidance.alternatives.length > 0) {
      lines.push("", `Easily confused with: ${guidance.alternatives.join(", ")}`);
    }
    lines.push("");
  }
  if (composesWith && composesWith.length > 0) {
    lines.push(`Often used with: ${composesWith.join(", ")}`, "");
  }
  if (capabilities) {
    lines.push(
      capabilities.client
        ? 'Client component: it declares "use client", so a Server Component can render it but cannot pass it functions.'
        : "No client directive: it renders in a Server Component as it is.",
    );
    if (capabilities.animated) {
      lines.push(
        "Animates. Motion follows the theme's --motion-scale, which reduced motion collapses.",
      );
    }
    lines.push("");
  }
  return lines;
}

/** Each exported component's own props, read from its type by the registry build. */
function propsLines(item: RegistryItem): string[] {
  if (!item.props || item.props.length === 0) return [];
  const lines = ["## Props", ""];
  for (const group of item.props) {
    lines.push(`### ${group.component}`, "");
    if (group.forwards) lines.push(`Forwards every prop to \`${group.forwards}\`.`);
    for (const prop of group.props) {
      const required = prop.required ? " (required)" : "";
      const fallback = prop.default === undefined ? "" : ` = ${prop.default}`;
      const about = prop.description ? ` — ${prop.description}` : "";
      lines.push(`- \`${prop.name}\`: \`${prop.type}\`${required}${fallback}${about}`);
    }
    if (group.element) {
      const omitted = group.omitted.length > 0 ? ` except ${group.omitted.join(", ")}` : "";
      lines.push(`- …and every \`<${group.element}>\` attribute${omitted}.`);
    }
    lines.push("");
  }
  return lines;
}

/** The licence condition for one or more Pro items, worded the same everywhere. */
function licenceNote(entries: RegistryIndexEntry[], cliPackage: string): string {
  return (
    `**Requires a licence:** ${entries.map((entry) => entry.name).join(", ")} ` +
    `${entries.length === 1 ? "is a Pro item" : "are Pro items"}. ` +
    `Sign in once with \`npx ${cliPackage} login\`, or set DOWEL_TOKEN in CI, before installing.`
  );
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
  if ((entry.guidance?.useWhen ?? []).some((phrase) => phrase.toLowerCase().includes(needle))) {
    return 18;
  }
  if (entry.category.toLowerCase() === needle) return 15;
  if (entry.description.toLowerCase().includes(needle)) return 10;
  return 0;
}

/**
 * What to offer for a name the index does not have.
 *
 * Substring matches first, because "table" asked for as a component name most
 * likely means one of the tables; edit distance only when nothing contains it,
 * which is the typo case. An empty name matches everything by substring, so it
 * gets nothing rather than five arbitrary items.
 */
function suggestionsFor(index: RegistryIndex, name: string): string[] {
  if (name.trim().length === 0) return [];

  const substring = index.items
    .map((item) => ({ item, rank: score(item, name) }))
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5)
    .map(({ item }) => item.name);

  return substring.length > 0
    ? substring
    : nearest(
        index.items.map((item) => item.name),
        name,
      );
}

/**
 * One line about one unknown name.
 *
 * Says when the name could never have matched — "Button", "data table" — since
 * the fix there is the spelling rules, not a different component.
 */
function describeUnknown(index: RegistryIndex, name: string): string {
  const near = suggestionsFor(index, name);
  const malformed = !registryItemNameSchema.safeParse(name).success;
  return (
    `"${name}"` +
    (malformed ? " is not a valid registry name (lowercase letters, digits and hyphens)" : "") +
    (near.length > 0 ? ` — did you mean: ${near.join(", ")}?` : " — nothing similar exists.")
  );
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
        `rules, which differ from other libraries in ways worth knowing. After writing UI, ` +
        `call audit_code on it to catch hardcoded colours and bypassed components.`,
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

      // The index is the only list of what exists, so a name is looked up there
      // before anything is fetched: a miss costs no request, and a name that is
      // not in the index never becomes a path.
      if (!entry) {
        const near = suggestionsFor(index, name);
        const malformed = !registryItemNameSchema.safeParse(name).success;

        return failure(
          `No component named "${name}".` +
            (malformed ? " Registry names are lowercase letters, digits and hyphens." : "") +
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
            ...genomeLines(entry),
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
      lines.push(...genomeLines(entry));
      if (item.a11y) {
        lines.push("## Accessibility", "", item.a11y, "");
      }
      lines.push(...propsLines(item));

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
    async ({ names: requested }) => {
      const index = await registry.index();
      const names = [...new Set(requested)];

      // Every name is checked against the index before anything is resolved,
      // and every miss is reported at once. Stopping at the first leaves an
      // agent that asked for three wrong names fixing them one round trip at a
      // time — and the old behaviour, a file lookup per name, turned a bad name
      // into "Not found: <name>.json", which says nothing about what to do.
      const known = new Set(index.items.map((entry) => entry.name));
      const unknown = names.filter((name) => !known.has(name));
      if (unknown.length > 0) {
        return failure(
          [
            `Not in the registry: ${unknown.map((name) => `"${name}"`).join(", ")}.`,
            "",
            ...unknown.map((name) => `- ${describeUnknown(index, name)}`),
            "",
            "No command was produced: installing a name the registry does not have fails. " +
              "Call search_components to check the names.",
          ].join("\n"),
        );
      }

      const resolved = await registry.resolve(names);
      const extra = resolved.filter((entry) => !names.includes(entry.name));
      const npm = [...new Set(resolved.flatMap((entry) => entry.dependencies))];
      const licensed = resolved.filter((entry) => entry.access === "pro");

      const lines = [
        "```bash",
        `npx ${options.cliPackage} add ${names.join(" ")}`,
        "```",
        "",
        `Writes ${String(resolved.length)} registry item(s): ${resolved.map((entry) => entry.name).join(", ")}.`,
        extra.length > 0
          ? `${String(extra.length)} of those are dependencies pulled in automatically: ${extra.map((entry) => entry.name).join(", ")}.`
          : "Nothing extra is pulled in.",
      ];
      if (npm.length > 0) lines.push(`npm packages installed alongside: ${npm.join(", ")}.`);

      // A licensed item still gets its command — it exists, and this is how it
      // is installed — but with the condition stated up front, so the first the
      // user hears of the licence is not an error from the CLI.
      if (licensed.length > 0) {
        lines.push(
          "",
          `${licenceNote(licensed, options.cliPackage)} ` +
            "The source is served only to a licence holder.",
        );
      }

      lines.push(
        "",
        "Safe to re-run. A file the user has edited is never overwritten without `--overwrite`.",
      );

      return text(lines.join("\n"));
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

      // The plan resolves against the whole index, Pro blocks included — "a CRM"
      // plans `crm`. Its install line does not know about licences, so the
      // condition is stated here rather than discovered when the CLI refuses.
      const licensed = [...plan.blocks, ...plan.components]
        .map((item) => item.entry)
        .filter((entry) => entry.access === "pro");
      if (licensed.length > 0) {
        parts.push(
          "",
          `${licenceNote(licensed, options.cliPackage)} ` +
            "get_component describes a Pro item but cannot show its source.",
        );
      }

      // The plan stops at the composition. Props are on each item, read from
      // its type, and a plausible invented prop is worse than none.
      parts.push(
        "",
        "Call get_component for each of these before writing props: it lists every prop " +
          "the component's type declares. Then check what you wrote with audit_code.",
      );

      return text(parts.join("\n"));
    },
  );

  server.registerTool(
    "audit_code",
    {
      title: "Audit UI code",
      description:
        "Check React/TSX you have written against the design system's rules, before " +
        "presenting it: Tailwind palette or literal colours instead of semantic tokens, " +
        "off-scale arbitrary sizes, physical direction utilities that break right-to-left, " +
        "and native elements where the project has the component installed. The same rules " +
        "as `dowel audit`.",
      inputSchema: {
        code: z.string().min(1).describe("The source to check, e.g. one .tsx file"),
        installed: z
          .array(z.string())
          .optional()
          .describe(
            'Registry names installed in the project, e.g. ["button","input"]. Native elements are only reported when their component is installed.',
          ),
      },
    },
    ({ code, installed }) => {
      const findings = auditSource(code, { installed: new Set(installed ?? []) });

      if (findings.length === 0) {
        return text(
          "No findings." +
            (installed === undefined
              ? " Native elements were not checked: pass `installed` to include them."
              : ""),
        );
      }

      const summary = new Map(AUDIT_RULES.map((rule) => [rule.id, rule.summary]));
      const lines = [`${String(findings.length)} finding(s):`, ""];
      for (const finding of findings) {
        const instead = finding.suggestion ? ` → use ${finding.suggestion}` : "";
        lines.push(
          `- line ${String(finding.line)}: \`${finding.found}\` — ${summary.get(finding.rule) ?? finding.rule}${instead}`,
        );
      }
      lines.push(
        "",
        "Fix these before presenting the code. For a colour, pick the semantic token that " +
          'means what the colour meant (get_guide("theming") lists them), rather than the nearest hue.',
      );
      return text(lines.join("\n"));
    },
  );

  return server;
}
