import { CodeBlock } from "@dowel-ui/react/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dowel-ui/react/table";
import type { Metadata } from "next";

import { InstallCommand } from "~/components/install-command";
import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";
import { getBlocks, getComponents } from "~/lib/registry";

export const metadata: Metadata = {
  title: "AI agents",
  description:
    "Teach Claude, Cursor and every other coding agent what this library has, so they stop writing a second Button.",
};

const SITE_URL = branding.registryUrl.replace(/\/r$/, "");

const TARGETS = [
  {
    target: "dowel",
    writes: ".dowel/conventions.md, components.md, ai.md, themes.md",
    what: "The reference set. Read by any agent that reads the repository.",
  },
  {
    target: "agents",
    writes: "AGENTS.md",
    what: "A marked block appended to the file, replaced in place on regeneration. The rest of the file is yours.",
  },
  {
    target: "claude",
    writes: ".claude/skills/dowel-ui/SKILL.md",
    what: "A Claude Code skill, loaded when the work is React UI.",
  },
  {
    target: "cursor",
    writes: ".cursor/rules/dowel-ui.mdc",
    what: "A Cursor project rule, scoped to .tsx and .jsx files.",
  },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "dowel": {
      "command": "npx",
      "args": ["-y", "@dowel-ui/mcp"],
      "env": {
        "DOWEL_IMPORT_FROM": "@/components/ui"
      }
    }
  }
}`;

const MCP_TOOLS = [
  {
    tool: "search_components",
    what: "Find what already exists, by name, description or category.",
  },
  {
    tool: "get_component",
    what: "One component in full — accessibility notes, what it installs alongside, and optionally its source.",
  },
  {
    tool: "get_guide",
    what: "Conventions, theming, the AI components, or the whole catalogue.",
  },
  {
    tool: "install_command",
    what: "The exact command, and everything it will write.",
  },
];

export default function AiAgentsPage() {
  const componentCount = getComponents().length;
  const blockCount = getBlocks().length;

  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">AI agents</h1>

      <Prose>
        <p>
          A coding agent that has never heard of {branding.libraryName} does the worst possible
          thing: it writes its own Button. A second button, with a different focus ring,
          different disabled semantics and hardcoded colours — and now the design system has a
          hole in it that nobody notices until someone tabs into it.
        </p>
        <p>
          The fix is not a better prompt. It is giving the agent the catalogue, generated from
          the registry so it cannot go stale.
        </p>

        <h2>In your project</h2>
        <p>
          One command writes documentation for every agent that works in this repository. It
          reads the registry you install from and your <code>components.json</code>, so the
          catalogue is accurate and marks what you already have.
        </p>
      </Prose>

      <InstallCommand args="agents" />

      <div className="not-prose my-4">
        <Table aria-label="What each target writes">
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Writes</TableHead>
              <TableHead>What it is for</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TARGETS.map((row) => (
              <TableRow key={row.target}>
                <TableHead scope="row" className="font-mono text-xs text-foreground">
                  {row.target}
                </TableHead>
                <TableCell className="font-mono text-xs">{row.writes}</TableCell>
                <TableCell>{row.what}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Prose>
        <p>
          Name targets to narrow it: <code>{branding.cliName} agents claude cursor</code>. With
          none, it writes them all.
        </p>
        <p>
          It is generated output, so regenerate it after an upgrade rather than editing it.{" "}
          <code>--check</code> writes nothing, reports what is stale and exits non-zero, which
          is what you want in CI — a catalogue that has fallen a release behind is worse than
          none, because the agent trusts it.
        </p>
      </Prose>

      <Prose>
        <h2>MCP server</h2>
        <p>
          The files above are a snapshot. The MCP server is the live version: the agent queries
          the registry directly, gets a component&rsquo;s real source rather than a description
          of it, and is told when it has typed a name that does not exist.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="json" title=".mcp.json" code={MCP_CONFIG}>
          {MCP_CONFIG}
        </CodeBlock>
      </div>

      <Prose>
        <p>
          Set <code>DOWEL_IMPORT_FROM</code> to the alias your components live under — the
          server has no way to see your <code>components.json</code>, and an agent told the
          wrong import path writes code that does not resolve. Point <code>DOWEL_REGISTRY</code>{" "}
          at a fork or an internal mirror if you have one.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <Table aria-label="MCP tools">
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>What it answers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MCP_TOOLS.map((row) => (
              <TableRow key={row.tool}>
                <TableHead scope="row" className="font-mono text-xs text-foreground">
                  {row.tool}
                </TableHead>
                <TableCell>{row.what}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Prose>
        <h2>llms.txt</h2>
        <p>
          For an agent that can fetch a URL but cannot run a server, this site serves the whole
          catalogue as plain text — generated from the same registry, at build time, so it is
          never a release behind.
        </p>
        <ul>
          <li>
            <a href={`${SITE_URL}/llms.txt`}>/llms.txt</a> — the index: every one of the{" "}
            {componentCount} components and {blockCount} blocks, with a link to its page.
          </li>
          <li>
            <a href={`${SITE_URL}/llms-full.txt`}>/llms-full.txt</a> — everything in one
            request: conventions, accessibility rules, theming, the AI components, and
            per-component detail.
          </li>
        </ul>

        <h2>What the agent is told</h2>
        <p>
          Not a general lecture on accessibility, which gets ignored. A short list of the places
          this library differs from the ones a model has already read a million lines of:
        </p>
        <ul>
          <li>
            A loading <code>Button</code> uses <code>aria-disabled</code>, never{" "}
            <code>disabled</code> — disabling a control mid-action strands keyboard focus.
          </li>
          <li>
            <code>Alert</code> is not a live region by default. One that exists on first paint
            announces for no reason.
          </li>
          <li>
            <code>Separator</code>, <code>Skeleton</code> and <code>Spinner</code> are
            decorative. Do not add ARIA to them by reflex.
          </li>
          <li>Semantic tokens only. Never raw hex, never Tailwind&rsquo;s own palette.</li>
          <li>Check for a block before assembling a page out of primitives.</li>
        </ul>
      </Prose>
    </article>
  );
}
