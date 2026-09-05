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

import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";

export const metadata: Metadata = {
  title: "CLI",
  description: "Every command and flag.",
};

const COMMANDS = [
  {
    command: "init",
    what: "Writes components.json, the cn() utility and the design tokens.",
  },
  {
    command: "add <names…>",
    what: "Installs components and everything they depend on.",
  },
  { command: "list", what: "Shows the registry, marking what you already have." },
  {
    command: "update [names…]",
    what: "Compares installed components against the registry.",
  },
  {
    command: "agents [targets…]",
    what: "Writes the catalogue for the coding agents working in this project.",
  },
  {
    command: "login [key]",
    what: "Stores a licence key, for components that require one.",
  },
  { command: "logout", what: "Removes the stored licence key from this machine." },
  { command: "whoami [--check]", what: "Reports whether this machine is signed in." },
];

const FLAGS = [
  { flag: "--registry <url>", what: "A registry base URL, or a directory on disk." },
  { flag: "--cwd <path>", what: "Run against a different project root." },
  { flag: "--yes", what: "Accept defaults and never prompt. For CI." },
  { flag: "--overwrite", what: "Replace files you have edited. Says what it discards." },
  { flag: "--skip-install", what: "Write files without installing npm packages." },
];

const UPDATE_OUTPUT = `  up to date                     src/components/ui/spinner.tsx
  locally modified               src/components/ui/button.tsx
  up to date                     src/components/ui/calendar.tsx

! Only locally modified files differ; none were touched.
Re-run with --overwrite to replace them and lose those edits.`;

export default function CliPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">CLI</h1>

      <Prose>
        <p>
          Run it with your package manager&rsquo;s runner — <code>pnpm dlx</code>,{" "}
          <code>npx</code>, <code>yarn dlx</code> or <code>bunx</code>. There is nothing to
          install globally.
        </p>

        <h2>Commands</h2>
      </Prose>

      <div className="not-prose my-4">
        <Table aria-label="Commands">
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>What it does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMMANDS.map((row) => (
              <TableRow key={row.command}>
                <TableHead scope="row" className="font-mono text-xs text-foreground">
                  {row.command}
                </TableHead>
                <TableCell>{row.what}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Prose>
        <h2>Flags</h2>
      </Prose>

      <div className="not-prose my-4">
        <Table aria-label="Flags">
          <TableHeader>
            <TableRow>
              <TableHead>Flag</TableHead>
              <TableHead>What it does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FLAGS.map((row) => (
              <TableRow key={row.flag}>
                <TableHead scope="row" className="font-mono text-xs text-foreground">
                  {row.flag}
                </TableHead>
                <TableCell>{row.what}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Prose>
        <h2>Your edits are safe</h2>
        <p>
          <code>add</code> records a hash of every file it writes. That is what lets{" "}
          <code>update</code> tell three things apart: a file you have not touched, one you have
          edited, and one that changed upstream.
        </p>
        <p>
          Re-running <code>add</code> on an untouched project does nothing. Re-running it after
          you have edited a component leaves your version alone and says so.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="text" title={`${branding.cliName} update`} code={UPDATE_OUTPUT}>
          {UPDATE_OUTPUT}
        </CodeBlock>
      </div>

      <Prose>
        <h2 id="licensed-components">Licensed components</h2>
        <p>
          Components that require a licence are listed in the registry like any other — with
          their description, what they depend on and how many files they are — but their source
          is served only to a licence holder. <code>login</code> checks the key against the
          registry before storing it, so a bad key fails when you paste it rather than days
          later during an install.
        </p>
        <p>
          The key is stored in your own config directory, readable only by you, and never in the
          project: a key in <code>components.json</code> is a key in git. For CI, set{" "}
          <code>DOWEL_TOKEN</code> from your secrets store instead — it takes precedence over
          anything stored, which is also what <code>logout</code> will tell you if it is still
          set.
        </p>

        <h2 id="private-registries">Private registries</h2>
        <p>
          <code>--registry</code> takes an HTTPS URL or a path on disk, so a fork or an internal
          mirror works without forking the CLI. It can also be set once in{" "}
          <code>components.json</code>.
        </p>
        <p>
          <code>@dowel-ui/registry</code> builds one. An organisation declares its own
          components and <code>extends</code> this registry, and the result is a single URL
          serving both — so <code>add acme-callout</code> installs their component and pulls in
          whatever it depends on from upstream. A local item replaces an upstream one of the
          same name, and the build reports which, because doing that by accident is expensive.
        </p>
        <p>
          The build refuses to emit a file it cannot read, an import written against the
          installed path rather than the authored one, or a component that imports something it
          never declared. Each of those would otherwise fail in a consumer&rsquo;s repository,
          where it is hardest to trace.
        </p>

        <h2>What it will not do</h2>
        <ul>
          <li>
            <strong>Install into a Tailwind v3 project.</strong> The tokens use{" "}
            <code>@theme</code>, which v3 cannot parse.
          </li>
          <li>
            <strong>Install into a JavaScript project.</strong> The published source is
            TypeScript; a half-working transform would be worse than a clear refusal.
          </li>
          <li>
            <strong>Overwrite a file you have edited</strong>, without <code>--overwrite</code>.
          </li>
        </ul>
      </Prose>
    </article>
  );
}
