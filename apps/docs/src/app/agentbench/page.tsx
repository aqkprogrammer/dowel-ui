import { Badge } from "@dowel-ui/react/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dowel-ui/react/table";
import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { CodePanel } from "~/components/site/code-panel";
import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { benchMetrics, benchRuns, benchTasks } from "~/lib/agentbench.generated";
import { pageMetadata } from "~/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "AgentBench: does agent support change what a coding agent builds?",
  description:
    "A reproducible harness that runs the same prompts with and without the agent files and MCP server, and scores both diffs with automated checks. Only published runs are shown.",
  path: "/agentbench",
  keywords: [
    "coding agent benchmark",
    "mcp server benchmark",
    "agents.md evaluation",
    "ai coding agent ui components",
  ],
});

const REPO = "https://github.com/aqkprogrammer/dowel-ui/tree/main/packages/agentbench";

const CONDITIONS = [
  {
    name: "with-dowel",
    has: "Dowel initialised, the task's components installed, the files `dowel agents` writes (AGENTS.md, .dowel/, a Claude skill, a Cursor rule) and an MCP config for the server.",
  },
  {
    name: "without",
    has: "Dowel initialised and the same components installed. No agent files, no MCP config — preparation fails if any are present.",
  },
];

const RERUN = `pnpm install && pnpm build
cd packages/agentbench
pnpm bench run --agent noop --tasks login       # the pipeline, for free
pnpm bench run --agent claude-code --install --repeat 3 \\
  --yes-i-understand-this-costs-money           # billed to your account
pnpm bench report <runId>`;

type Summary = (typeof benchRuns)[number];
type Stat = Summary["cells"][number]["metrics"][keyof Summary["cells"][number]["metrics"]];

function formatStat(stat: Stat | undefined, rate: boolean): string {
  if (!stat || stat.mean === null) return "—";
  return rate ? `${(stat.mean * 100).toFixed(0)}%` : stat.mean.toFixed(2);
}

function code(text: string) {
  // Backticked spans in the metric and condition descriptions, set as code.
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") ? (
      <code key={index} className="font-mono text-[0.9em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

function PublishedRun({ run }: { run: Summary }) {
  return (
    <section aria-labelledby={`run-${run.runId}`} className="mt-10">
      <h3 id={`run-${run.runId}`} className="font-mono text-sm font-semibold">
        {run.runId}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Commit <code className="font-mono">{run.source.commit.slice(0, 12)}</code>
        {run.source.dirty ? " (with uncommitted changes)" : ""} ·{" "}
        {run.agents
          .map((agent) => `${agent.id}${agent.version ? ` ${agent.version}` : ""}`)
          .join(", ")}{" "}
        · {String(run.tasks.length)} tasks ·{" "}
        {run.dependenciesInstalled ? "dependencies installed" : "typecheck not run"}
      </p>

      {run.agents.map((agent) => {
        const cells = run.cells.filter((cell) => cell.agent === agent.id);
        return (
          <div key={agent.id} className="not-prose mt-4">
            <Table aria-label={`${agent.id}: each metric by condition`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric ({agent.id})</TableHead>
                  {cells.map((cell) => (
                    <TableHead key={cell.condition}>
                      {cell.condition} <span className="font-normal">(mean, n)</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchMetrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableHead scope="row" className="text-foreground">
                      {metric.label}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({metric.better} is better)
                      </span>
                    </TableHead>
                    {cells.map((cell) => {
                      const stat = cell.metrics[metric.id];
                      return (
                        <TableCell key={cell.condition} className="font-mono tabular-nums">
                          {formatStat(stat, metric.rate)}{" "}
                          <span className="text-muted-foreground">
                            n={String(stat?.n ?? 0)}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}

      <div className="not-prose mt-4">
        <Table aria-label="Per task: expected components used and invented components, by condition">
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Expected used</TableHead>
              <TableHead>Invented</TableHead>
              <TableHead>Audit findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.rows.map((row) => (
              <TableRow key={`${row.agent}-${row.condition}-${row.task}`}>
                <TableHead scope="row" className="font-mono text-xs text-foreground">
                  {row.task}
                </TableHead>
                <TableCell>{row.agent}</TableCell>
                <TableCell>{row.condition}</TableCell>
                <TableCell className="tabular-nums">{String(row.runs)}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatStat(row.metrics.recall, true)}
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatStat(row.metrics.invented, false)}
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatStat(row.metrics.auditFindings, false)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default function AgentBenchPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Method first"
        title="AgentBench"
        seed={27}
        description={
          <>
            Does giving a coding agent Dowel&rsquo;s agent files and MCP server change what it
            builds? The same prompt runs in two copies of the same project, one with them and
            one without, and both diffs are scored by programs, not by eye.
          </>
        }
      />

      <div className="max-w-3xl">
        <Prose>
          <h2 id="results">Results</h2>
        </Prose>

        {benchRuns.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">No runs have been published yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The harness and the tasks are below, and anyone can run them. Results appear here
              only when a run — every result, transcript and diff, failures included — is
              committed under <code className="font-mono">results/published/</code>. There are
              no numbers on this page until then.
            </p>
          </div>
        ) : (
          benchRuns.map((run) => <PublishedRun key={run.runId} run={run} />)
        )}

        <Prose>
          <h2 id="conditions">Two conditions, one difference</h2>
          <p>
            It compares conditions for one agent; it does not rank agents. That measures what
            Dowel controls — whether its agent support helps — and avoids the disputes and
            terms-of-service problems a vendor ranking brings.
          </p>
          <p>
            Every workspace is built from one commit: the local scaffolder, CLI, MCP server and
            registry, never what is on npm, with npm dependencies pinned to the versions the
            components are tested with. The agent runs outside the repository, with the
            runner&rsquo;s own user settings and MCP servers excluded.
          </p>
        </Prose>

        <div className="not-prose my-4">
          <Table aria-label="The two conditions">
            <TableHeader>
              <TableRow>
                <TableHead>Condition</TableHead>
                <TableHead>The project has</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONDITIONS.map((condition) => (
                <TableRow key={condition.name}>
                  <TableHead scope="row" className="font-mono text-xs text-foreground">
                    {condition.name}
                  </TableHead>
                  <TableCell>{code(condition.has)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Prose>
          <h2 id="metrics">What is measured</h2>
          <p>
            Each check is a program, so two people scoring the same diff get the same numbers. A
            check that did not run is recorded as skipped and left out of <em>n</em>, never
            counted as a pass.
          </p>
        </Prose>

        <div className="not-prose my-4">
          <Table aria-label="Metrics">
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>How</TableHead>
                <TableHead>Better</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchMetrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableHead scope="row" className="text-foreground">
                    {metric.label}
                  </TableHead>
                  <TableCell>{code(metric.description)}</TableCell>
                  <TableCell>{metric.better}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Prose>
          <h3>Not measured</h3>
          <ul>
            <li>
              <strong>Visual quality.</strong> Whether a page looks right is a judgement, and a
              number standing in for one is the figure nobody could reproduce. It is left out
              until there is a way to measure it that two people would agree on.
            </li>
            <li>
              <strong>Time to completion</strong>, for the same reason. The agent&rsquo;s own
              time and cost are recorded for whoever pays, not compared.
            </li>
            <li>
              <strong>
                <code>next build</code> and axe on the rendered page.
              </strong>{" "}
              Planned, not in this first harness; it checks types and the static accessibility
              rules instead.
            </li>
            <li>
              <strong>Whether the page works.</strong> Recall against a short list is a proxy
              for using the right components. The diffs and transcripts are kept for a person to
              read.
            </li>
          </ul>

          <h2 id="tasks">The tasks</h2>
          <p>
            Ten prompts, typed as a person would, identical in both conditions. Each project
            also has components installed that are easy to confuse with the right one —{" "}
            <code>dialog</code> beside <code>alert-dialog</code>, <code>progress</code> beside{" "}
            <code>meter</code> — because choosing between them is where agents go wrong. The
            expected list holds only choices the component guidance settles.
          </p>
        </Prose>

        <ol className="mt-6 grid gap-4">
          {benchTasks.map((task) => (
            <li key={task.id} className="pane rounded-xl p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{task.title}</h3>
                <code className="font-mono text-xs text-muted-foreground">{task.route}</code>
              </div>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                &ldquo;{task.prompt}&rdquo;
              </p>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-3">
                <dt className="text-muted-foreground">Expected</dt>
                <dd className="flex flex-wrap gap-1">
                  {task.expect.map((name) => (
                    <Link key={name} href={`/docs/components/${name}`}>
                      <Badge size="sm" variant="secondary">
                        {name}
                      </Badge>
                    </Link>
                  ))}
                </dd>
                <dt className="text-muted-foreground">Installed</dt>
                <dd className="font-mono text-muted-foreground">{task.install.join(", ")}</dd>
              </dl>
            </li>
          ))}
        </ol>

        <Prose>
          <h2 id="rerun">Run it yourself</h2>
          <p>
            The harness, the tasks and the method are in <a href={REPO}>packages/agentbench</a>.
            A run writes every result, transcript and diff; publishing one means committing all
            of it, failures included.
          </p>
        </Prose>

        <div className="not-prose my-4">
          <CodePanel language="bash" title="Terminal" code={RERUN} />
        </div>

        <Prose>
          <h2 id="validity">What could make a result wrong</h2>
          <ul>
            <li>
              <strong>Small samples.</strong> Ten tasks, and as many runs per cell as were paid
              for. Read <em>n</em> before the mean, and the per-task rows before the totals.
            </li>
            <li>
              <strong>Agents are not deterministic.</strong> The same prompt gives different
              diffs. Repeats are the only defence.
            </li>
            <li>
              <strong>Task selection.</strong> The tasks were written by the people who wrote
              the components, about screens the library covers. That favours the with-dowel
              condition on recall by construction.
            </li>
            <li>
              <strong>The expected lists are a judgement</strong>, kept short and in the open to
              be argued with.
            </li>
            <li>
              <strong>Static checks only.</strong> Nothing is rendered; a page can pass all of
              this and be broken in a browser.
            </li>
          </ul>
        </Prose>
      </div>
    </SiteShell>
  );
}
