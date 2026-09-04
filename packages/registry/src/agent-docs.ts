import type { RegistryIndex, RegistryIndexEntry, RegistryItem } from "./schema";

/**
 * Documentation written for coding agents rather than for people.
 *
 * This lives beside the registry rather than in the CLI or the docs site
 * because all three need to emit the same text: the CLI writes it into a
 * consumer's repository, the site serves it at /llms.txt, and the MCP server
 * answers with it. Three hand-maintained copies would disagree within a
 * release, and an agent acting on a stale catalogue writes code that does not
 * compile.
 *
 * Everything here is derived from the registry index. Nothing is a hardcoded
 * list of component names — that is the failure mode this replaces.
 */

export interface AgentDocsContext {
  index: RegistryIndex;
  /**
   * Full registry items, when the caller has them.
   *
   * The index carries no accessibility notes, so callers that can afford to
   * fetch every item (the docs build, the MCP server) get richer output than
   * ones that cannot (the CLI, which would otherwise make 81 requests).
   */
  items?: RegistryItem[];
  /** Base URL the CLI installs from. */
  registryUrl: string;
  /** Base URL of the documentation site, no trailing slash. */
  docsUrl: string;
  /** npm package name of the CLI, e.g. `@dowel-ui/cli`. */
  cliPackage: string;
  libraryName: string;
  /** Registry names already present in the project, if known. */
  installed?: string[];
  /**
   * What components are imported from in this project.
   *
   * Source-first installs resolve to the project's own alias; the published
   * package is a separate, supported way to consume the same components. An
   * agent told the wrong one writes imports that do not resolve.
   */
  importFrom: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  foundation: "Foundation",
  form: "Forms",
  overlay: "Overlays",
  navigation: "Navigation",
  display: "Display",
  data: "Data",
  feedback: "Feedback",
  layout: "Layout",
  ai: "AI",
};

const CATEGORY_ORDER = [
  "foundation",
  "form",
  "overlay",
  "navigation",
  "display",
  "data",
  "feedback",
  "layout",
  "ai",
];

function label(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** Ordered by curation where curated, alphabetical for anything new. */
function categoriesOf(entries: RegistryIndexEntry[]): string[] {
  const present = new Set(entries.map((entry) => entry.category));
  const known = CATEGORY_ORDER.filter((category) => present.has(category));
  const rest = [...present].filter((category) => !CATEGORY_ORDER.includes(category)).sort();
  return [...known, ...rest];
}

function byType(index: RegistryIndex, type: RegistryIndexEntry["type"]): RegistryIndexEntry[] {
  return index.items
    .filter((entry) => entry.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function components(index: RegistryIndex) {
  return byType(index, "registry:ui");
}

function blocks(index: RegistryIndex) {
  return byType(index, "registry:block");
}

/**
 * Accessibility rules that differ from what a model has seen elsewhere.
 *
 * An agent trained on every other React library will reach for `disabled` on a
 * loading button and a live region on every alert. Stating only the deltas is
 * deliberate: a general accessibility lecture is ignored, a short list of
 * "here this is different" is followed.
 */
const ACCESSIBILITY_DELTAS = [
  "A loading `Button` uses `aria-disabled` + `aria-busy` and guards its own click handler. Never add `disabled` to it — disabling a control mid-action strands keyboard focus.",
  '`Alert` is not a live region by default. One that exists on first paint announces for no reason. Opt in with `live="polite"` or `live="assertive"` only when the alert appears in response to something.',
  "`Separator`, `Skeleton` and `Spinner` are decorative and stay out of the accessibility tree unless given a label. Do not add `role` or `aria-label` to them by reflex.",
  '`PopoverContent` carries `role="dialog"` and warns in development without an accessible name. Always give it `aria-label` or `aria-labelledby`.',
  "Never use colour as the only signal. The `monochrome` preset exists as a standing check on exactly this — if a state is unreadable under it, the component is wrong.",
];

const TOKEN_RULES = [
  "Use semantic tokens (`bg-background`, `text-foreground`, `border-border`, `ring-ring`, `bg-primary`, `text-muted-foreground`). Never raw hex, and never Tailwind's own palette (`bg-slate-900`, `text-gray-500`) — those do not follow the theme and break every preset and dark mode.",
  "Spacing, radius and type come from the scale. `rounded-md` and `rounded-lg` re-proportion with `--radius-scale`; an arbitrary `rounded-[7px]` does not.",
  "Durations derive from `--motion-scale`. Do not hardcode transition timings.",
  "Compose class names with `cn()` from the project's utils, so consumer overrides win over defaults.",
];

export function conventionsDoc(context: AgentDocsContext): string {
  const { libraryName, cliPackage, importFrom, docsUrl } = context;

  return `# ${libraryName} — conventions

Rules for writing code in this project. ${libraryName} is **source-first**: its
components are files in this repository, not a dependency you can reason about
from its README. They are yours to edit, and edits are preserved across updates.

## The rule that matters most

**Do not hand-write a component that ${libraryName} already has.** Check the
catalogue in \`components.md\` first. Writing a second Button — with different
focus rings, different disabled semantics, different tokens — is the single
most common and most damaging thing to do here.

## Adding a component

\`\`\`bash
npx ${cliPackage} add <name>
\`\`\`

This writes the source into the project and installs whatever it depends on.
\`add\` is safe to re-run: an untouched file is left alone, an edited one is
never overwritten without \`--overwrite\`.

Do not \`npm install\` a component. Do not copy source out of the documentation
by hand — the CLI resolves the dependency graph and rewrites imports to this
project's path alias, and doing it manually gets both wrong.

## Importing

\`\`\`tsx
import { Button, Card, CardContent } from "${importFrom}";
\`\`\`

## Styling

${TOKEN_RULES.map((rule) => `- ${rule}`).join("\n")}

## Accessibility

Targeted at WCAG 2.2 AA, verified with axe per component. Where ${libraryName}
differs from what you have seen in other libraries:

${ACCESSIBILITY_DELTAS.map((rule) => `- ${rule}`).join("\n")}

## Before you build a page

Check \`components.md\` for a **block** that already covers it. A block is a
whole section — a login form, a settings page, a chat surface — and installing
one brings every component it is assembled from. Building a dashboard out of
individual primitives when \`add dashboard\` exists is wasted work.

## Reference

- Documentation: ${docsUrl}
- Full text for models: ${docsUrl}/llms-full.txt
`;
}

export function componentsDoc(context: AgentDocsContext): string {
  const { index, libraryName, cliPackage, installed } = context;
  const have = new Set(installed ?? []);
  const known = installed !== undefined;
  const ui = components(index);
  const blk = blocks(index);

  const lines: string[] = [
    `# ${libraryName} — catalogue`,
    "",
    `${String(ui.length)} components and ${String(blk.length)} blocks, generated from ` +
      `\`${index.generatedFrom}\`. This is the complete list — anything not here does not exist.`,
    "",
  ];

  if (known) {
    lines.push(
      "`✓` marks what is already installed in this project. Everything else needs",
      `\`npx ${cliPackage} add <name>\` before it can be imported.`,
      "",
    );
  }

  const mark = (entry: RegistryIndexEntry) =>
    known ? (have.has(entry.name) ? "✓ " : "  ") : "";

  for (const category of categoriesOf(ui)) {
    lines.push(`## ${label(category)}`, "");
    for (const entry of ui.filter((item) => item.category === category)) {
      const status = entry.status === "stable" ? "" : ` _(${entry.status})_`;
      lines.push(`- ${mark(entry)}**${entry.name}** — ${entry.description}${status}`);
    }
    lines.push("");
  }

  lines.push(
    "## Blocks",
    "",
    "Whole sections. Installing one installs every component it is built from.",
    "",
  );
  for (const entry of blk) {
    const deps = entry.registryDependencies.length;
    const resolves = deps > 0 ? ` _(resolves ${String(deps)} components)_` : "";
    lines.push(`- ${mark(entry)}**${entry.name}** — ${entry.description}${resolves}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function aiDoc(context: AgentDocsContext): string {
  const { index, libraryName, cliPackage } = context;
  const ai = components(index).filter((entry) => entry.category === "ai");

  return `# ${libraryName} — AI components

${String(ai.length)} surfaces for AI features. Reach for these before building
anything custom for a model-facing interface.

Most component sets ship a chat transcript and stop. Real AI features are
extraction, enrichment, autofill and agents that *change things* — so the parts
that matter are the ones around the transcript, not the transcript itself.

${ai.map((entry) => `- **${entry.name}** — ${entry.description}`).join("\n")}

## Choosing between them

- Rendering a conversation → \`ai-conversation\` with \`ai-message\` and \`ai-response\`.
- The composer → \`ai-prompt-input\`, with \`ai-model-selector\` if the model is switchable.
- A tool the model called → \`ai-tool\`. Its arguments and result belong there, not in prose.
- Asking permission *before* a tool runs → \`ai-approval-request\`.
- Reporting what it did *after* → \`ai-action-ledger\`, which is also where reversibility belongs. A deletion can be undone, a refund can only be offset, a sent email cannot be taken back — the ledger is where that distinction is shown.
- An object streaming in field by field → \`ai-structured-output\`, which reserves layout up front so nothing jumps.
- Ghost text in a real textarea → \`ai-inline-completion\`. Escape always returns Tab to focus management, so a keyboard user is never trapped.
- A value the model proposes for a form field → \`ai-suggested-value\`.
- Reviewing what was pulled out of a document → \`ai-extraction-review\`.
- Long-running work → \`ai-agent-status\` and \`ai-agent-plan\`.
- Where an answer came from → \`ai-sources\`. Cost → \`ai-token-usage\`. Chain of thought → \`ai-reasoning\`.

## Whole surface at once

\`\`\`bash
npx ${cliPackage} add ai-chat
\`\`\`
`;
}

export function themesDoc(context: AgentDocsContext): string {
  const { libraryName } = context;

  return `# ${libraryName} — theming

Tokens are two-tier. **Tier 1** is raw scales: an OKLCH neutral ramp, a radius
ladder, a 15px-base type scale, elevation, motion. **Tier 2** is semantic
aliases — \`--primary\`, \`--background\`, \`--border\`, \`--ring\` — and components
consume Tier 2 *exclusively*.

Re-skinning the system means reassigning Tier 2. It never means editing a
component file. If you find yourself changing a colour inside a component, the
change belongs in the token layer instead.

## Presets

\`default\`, \`ocean\`, \`emerald\`, \`violet\`, \`rose\`, \`amber\`, \`monochrome\`.

\`\`\`html
<html data-theme="ocean" class="dark">
\`\`\`

\`data-theme\` selects the preset; the \`dark\` class selects the mode. They are
independent — every preset works in both.

\`monochrome\` is not only a style. It is a standing check that no component uses
colour as its only signal, so verify new work under it.

## Two properties that re-proportion everything

- \`--radius-scale\` — one multiplier behind every corner in the system. \`1\` is the designed default, \`0\` is fully square.
- \`--motion-scale\` — one multiplier every duration derives from. Under \`prefers-reduced-motion\` it collapses, but indicators that report ongoing state are *slowed* rather than stopped via \`--motion-scale-indicator\`, because a frozen spinner reads as a hung application.

## Contrast

All semantic pairs are verified against WCAG 2.2 AA across both modes and every
preset, in CI. A new token pair has to pass the same check — do not introduce
one without running \`audit:contrast\`.
`;
}

/** Frontmatter-carrying skill file for Claude Code. */
export function skillDoc(context: AgentDocsContext): string {
  const { index, libraryName, cliPackage, importFrom } = context;
  const ui = components(index);
  const blk = blocks(index);
  const names = ui.map((entry) => entry.name).join(", ");

  return `---
name: ${libraryName.toLowerCase()}-ui
description: >-
  Build React interfaces with ${libraryName}, the source-first component system
  installed in this project. Use whenever writing or editing React UI here —
  any button, form, dialog, table, dashboard or AI surface. Covers the
  ${String(ui.length)}-component catalogue, the ${String(blk.length)} blocks, design tokens, theming
  and the accessibility rules that differ from other libraries.
---

# ${libraryName}

Source-first React components. They are **files in this repository**, not a
dependency — installed with a CLI, then owned and edited like any other code.

## Do this first

Never hand-write a component ${libraryName} already has. The catalogue:

${names}

Blocks (whole sections, each resolving its own components):
${blk.map((entry) => entry.name).join(", ")}

## Adding one

\`\`\`bash
npx ${cliPackage} add button card dialog
\`\`\`

Resolves dependencies, installs npm packages, rewrites imports to this
project's alias. Safe to re-run — it will not overwrite a file you have edited
without \`--overwrite\`.

## Importing

\`\`\`tsx
import { Button, Card, CardContent } from "${importFrom}";
\`\`\`

## Styling rules

${TOKEN_RULES.map((rule) => `- ${rule}`).join("\n")}

## Accessibility rules that differ here

${ACCESSIBILITY_DELTAS.map((rule) => `- ${rule}`).join("\n")}

## Reference files

- \`.dowel/components.md\` — the full catalogue with descriptions
- \`.dowel/ai.md\` — the AI components and when to use each
- \`.dowel/themes.md\` — tokens, presets, radius and motion scales
- \`.dowel/conventions.md\` — the rules above, in full
`;
}

/** Cursor project rule (`.cursor/rules/*.mdc`). */
export function cursorRule(context: AgentDocsContext): string {
  const { index, libraryName, cliPackage, importFrom } = context;
  const ui = components(index);

  return `---
description: ${libraryName} component system — use for all React UI in this project
globs: ["**/*.tsx", "**/*.jsx"]
alwaysApply: false
---

${libraryName} is source-first: its ${String(ui.length)} components are files in this
repository. Never hand-write one that already exists.

Add: \`npx ${cliPackage} add <name>\`
Import: \`import { Button } from "${importFrom}"\`

Available: ${ui.map((entry) => entry.name).join(", ")}

${TOKEN_RULES.map((rule) => `- ${rule}`).join("\n")}
${ACCESSIBILITY_DELTAS.map((rule) => `- ${rule}`).join("\n")}

Full catalogue and reasoning: \`.dowel/\`
`;
}

export const AGENTS_MARKER_START = "<!-- dowel:start -->";
export const AGENTS_MARKER_END = "<!-- dowel:end -->";

/**
 * The block written into a project's AGENTS.md.
 *
 * Marker-wrapped rather than written as a whole file: AGENTS.md belongs to the
 * project and usually already says things about the project. Replacing it would
 * destroy that; appending without markers would duplicate the section on every
 * regeneration.
 */
export function agentsSection(context: AgentDocsContext): string {
  const { index, libraryName, cliPackage, importFrom } = context;
  const ui = components(index);

  return `${AGENTS_MARKER_START}

## UI components — ${libraryName}

This project uses ${libraryName}, a **source-first** component system: its
${String(ui.length)} components live in this repository as editable files.

- **Never hand-write a component that already exists.** The full catalogue is in \`.dowel/components.md\`.
- Add one with \`npx ${cliPackage} add <name>\` — never \`npm install\`, never copy source by hand.
- Import from \`${importFrom}\`.
- Style with semantic tokens only (\`bg-background\`, \`text-muted-foreground\`), never raw hex and never Tailwind's own palette.
- Building a page? Check \`.dowel/components.md\` for a **block** first.
- Building an AI feature? \`.dowel/ai.md\` lists surfaces you will not find elsewhere.
- Accessibility deltas from other libraries are in \`.dowel/conventions.md\`. Read them before adding ARIA by reflex.

${AGENTS_MARKER_END}`;
}

/** Replaces the marked block, or appends it if there is none. */
export function upsertAgentsSection(existing: string, section: string): string {
  const start = existing.indexOf(AGENTS_MARKER_START);
  const end = existing.indexOf(AGENTS_MARKER_END);

  if (start !== -1 && end !== -1 && end > start) {
    return existing.slice(0, start) + section + existing.slice(end + AGENTS_MARKER_END.length);
  }

  const base = existing.trimEnd();
  return base.length > 0 ? `${base}\n\n${section}\n` : `${section}\n`;
}

/**
 * The llms.txt index.
 *
 * Deliberately a map rather than a dump: it names every component and points at
 * the one URL that carries everything, so a model with a small budget can find
 * the right page and one with a large budget can take the lot.
 */
export function llmsTxt(context: AgentDocsContext): string {
  const { index, libraryName, docsUrl, cliPackage } = context;
  const ui = components(index);
  const blk = blocks(index);

  const lines = [
    `# ${libraryName}`,
    "",
    `> Source-first React components for SaaS and AI products. ${String(ui.length)} components ` +
      `and ${String(blk.length)} blocks, installed as code you own rather than imported from a ` +
      `dependency. Built on Tailwind v4 and OKLCH design tokens, targeted at WCAG 2.2 AA.`,
    "",
    `Install: \`npx ${cliPackage} add <name>\` writes the component's source into your project.`,
    "Re-running is safe — files you have edited are never overwritten without `--overwrite`.",
    "",
    `Generated from ${index.generatedFrom}.`,
    "",
    "## Start here",
    "",
    `- [Everything, in one file](${docsUrl}/llms-full.txt): the complete catalogue with descriptions, accessibility notes and conventions`,
    `- [Installation](${docsUrl}/docs/installation)`,
    `- [CLI](${docsUrl}/docs/cli)`,
    `- [Theming](${docsUrl}/docs/themes)`,
    `- [Accessibility](${docsUrl}/docs/accessibility)`,
    "",
  ];

  for (const category of categoriesOf(ui)) {
    lines.push(`## ${label(category)}`, "");
    for (const entry of ui.filter((item) => item.category === category)) {
      lines.push(
        `- [${entry.name}](${docsUrl}/docs/components/${entry.name}): ${entry.description}`,
      );
    }
    lines.push("");
  }

  lines.push("## Blocks", "");
  for (const entry of blk) {
    lines.push(`- [${entry.name}](${docsUrl}/docs/blocks/${entry.name}): ${entry.description}`);
  }
  lines.push("");

  return lines.join("\n");
}

/** Everything an agent needs, in one request. */
export function llmsFullTxt(context: AgentDocsContext): string {
  const { index, items, libraryName, docsUrl } = context;
  const detail = new Map((items ?? []).map((item) => [item.name, item]));

  const parts = [
    conventionsDoc(context),
    componentsDoc({ ...context, installed: undefined }),
    aiDoc(context),
    themesDoc(context),
  ];

  const lines = [
    `# ${libraryName} — full reference`,
    "",
    `Generated from ${index.generatedFrom}. Canonical source: ${docsUrl}`,
    "",
    "---",
    "",
    parts.join("\n---\n\n"),
  ];

  if (detail.size > 0) {
    lines.push("---", "", "# Per-component detail", "");

    for (const entry of components(index)) {
      const item = detail.get(entry.name);
      lines.push(`## ${entry.title} \`${entry.name}\``, "", entry.description, "");
      lines.push(
        `- Category: ${label(entry.category)} · Status: ${entry.status}`,
        `- Install: \`add ${entry.name}\``,
      );
      if (entry.registryDependencies.length > 0) {
        lines.push(`- Also installs: ${entry.registryDependencies.join(", ")}`);
      }
      if (entry.dependencies.length > 0) {
        lines.push(`- npm: ${entry.dependencies.join(", ")}`);
      }
      if (item?.a11y) {
        lines.push(`- Accessibility: ${item.a11y}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
