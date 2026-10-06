# Dowel AgentBench

A harness for one question: **does Dowel's agent support change what a coding
agent builds?** It runs the same prompt in two copies of the same project — one
with Dowel's agent files and MCP server, one without — and scores both diffs
with checks that are already automated.

It does not rank agents against each other. It compares two conditions for one
agent, which measures what Dowel controls. A ranking of vendors invites disputes
over prompts and settings, and terms-of-service problems; "the same agent, with
and without our files" has neither.

No results are included in this commit. The harness has been run end to end
with the `noop` and `reference` adapters only, which spend nothing; the first run
of a real agent is a person's, with their own account.

## The two conditions

Both start from the same project, built entirely from this checkout:

1. `create-dowel-app` (the local build) creates a Next.js app from the starter
   template, with the default theme, without fetching components.
2. The local CLI, reading the local registry (`packages/registry/r`), runs
   `init` and `add` with the starter template's components (`button`, `card`,
   `badge`) and the task's `install` list.
3. The npm packages those components import are written into `package.json` at
   the versions `packages/ui` is built with in this commit. `add` would install
   whatever is latest that day; a benchmark cannot.

Then they differ in one way:

| Condition    | Has                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `with-dowel` | Everything above, plus what `dowel agents` writes (`AGENTS.md`, `.dowel/`, `.claude/skills/dowel-ui/SKILL.md`, `.cursor/rules/dowel-ui.mdc`) and a `.mcp.json` for the local MCP build |
| `without`    | Everything above, and nothing else. Preparation fails if any of those files is present                                                                                                 |

So a difference between the columns is a difference the agent files and the
MCP server made — not one in what was installed. The `without` agent can still
open `components.json` and read `src/components/ui`; that is the realistic
baseline, a project that has Dowel but has not told its agent about it.

The workspace is committed with git as a baseline, the agent runs, and
everything it changed — new files included — is captured as `diff.patch`.

## What is measured

Every check is a program. Two people scoring the same diff get the same
numbers.

| Metric                    | How                                                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route created             | The file in the task's `route` exists after the run.                                                                                                                                                                                                                                  |
| Typecheck passes / errors | `tsc --noEmit` with the workspace's own TypeScript. Only when dependencies were installed (`--install`); otherwise reported as skipped, never as passed.                                                                                                                              |
| Audit findings            | `dowel audit --json` (this commit's CLI) over the changed files: the six rules of [ADR 16](../../docs/architecture/0016-doctor-and-audit.md) — palette and arbitrary colours, inline colours, off-scale sizes, physical directions, native elements bypassing an installed component. |
| Invented components       | Imports from the UI or blocks alias (`@/components/ui/x`, `@/components/blocks/x`, or a relative path into them) where `x` is no file of any registry item. Counted whether or not the agent also created the file.                                                                   |
| Uninstalled imports       | Imports of real registry modules that are not installed, so would not resolve.                                                                                                                                                                                                        |
| Expected components used  | The share of the task's `expect` list imported — directly, or through a block or component that is built from it (using the `login` block uses the `input` inside it).                                                                                                                |
| Accessibility lint errors | The `jsx-a11y` rules exactly as this repository configures them for its own components (read from `@dowel-ui/config`), over the changed `.tsx` and `.jsx` files.                                                                                                                      |
| Files changed             | Context, not a score.                                                                                                                                                                                                                                                                 |

A check that did not run is recorded as skipped and left out of `n`. A typecheck
that never ran is not a typecheck with no errors.

What the agent reports about itself — wall time, cost, turns — is kept in each
result and totalled in the summary for the person paying. It is not compared:
none of it says whether the page is any good.

### What is not measured, and why

- **Visual quality.** Whether a page looks right is a judgement, and a number
  standing in for a judgement is the one figure here nobody could reproduce.
  The roadmap leaves it out until there is a way to measure it that two people
  would agree on.
- **Time to completion** as a quality metric, for the same reason, and because
  it depends on the vendor's load at the moment of the run.
- **`next build` and axe on the rendered page.** The roadmap lists both, and
  neither is in this first harness: `next build` needs dependencies installed
  and minutes per run, and axe needs the page served and a browser. `tsc` and
  the static accessibility rules are here instead. They are the next checks to
  add.
- **Whether the page does what the prompt asked.** Recall against a short
  `expect` list is a proxy for "used the right components", not for "works".
  The diffs and transcripts are kept so a person can read them.

## The tasks

Ten, in `tasks/<id>/task.json`, validated by `taskSchema` in `src/tasks.ts`:

| Field     | Meaning                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `prompt`  | What a person would type. Identical in both conditions; it names the URL, never the library or a component. |
| `route`   | The file a Next.js app serves that URL from, e.g. `src/app/settings/page.tsx`.                              |
| `install` | Registry items installed in both conditions before the agent starts.                                        |
| `expect`  | The components a good solution would use, for recall.                                                       |

`install` deliberately includes near neighbours — `dialog` beside
`alert-dialog`, `table` beside `data-table`, `progress` beside `meter`,
`tabs` beside `stepper` — because choosing between them is where agents go
wrong ([ADR 17](../../docs/architecture/0017-agents-and-models.md)). Blocks are
not pre-installed: a task would otherwise be "import the block".

`expect` is kept to choices the component guidance settles: `alert-dialog` for
an irreversible delete, `meter` for a quota, `stepper` for a wizard,
`data-table` with its own pagination rather than a separate `pagination`. Where
two answers are both reasonable — `switch` or `checkbox` for email preferences,
`table` or `data-table` for a short invoice list — neither is expected.

A test checks that every name in every task exists in this commit's registry,
is free, and has pinned npm versions, so anyone can rerun every task.

## Running it

Build first, so the local scaffolder, CLI, MCP server and registry exist:

```bash
pnpm install
pnpm build
```

Then, from this package:

```bash
pnpm bench list                                    # agents, tasks and runs
pnpm bench run --agent noop --tasks login          # the pipeline, for free
pnpm bench run --agent claude-code --install --repeat 3 --yes-i-understand-this-costs-money
pnpm bench report <runId>                          # re-aggregate summary.json
```

`run` prints what it will do — agent, tasks, conditions, number of runs,
whether dependencies will be installed, the commit — before it starts. An agent
that bills an account (`claude-code`) is refused without
`--yes-i-understand-this-costs-money`.

| Option                            | Default                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `--tasks a,b`                     | all ten                                                     |
| `--conditions with-dowel,without` | both                                                        |
| `--repeat <n>`                    | 1                                                           |
| `--install`                       | off; `pnpm install` per workspace, needed for the typecheck |
| `--timeout <minutes>`             | 20, per agent run                                           |
| `--workspaces <dir>`              | `$TMPDIR/dowel-agentbench`                                  |

Results go to `results/<runId>/<agent>/<condition>/<task>/<repeat>/`:

- `result.json` — the workspace (baseline commit, installed items, agent files
  present), the agent's exit code and reported usage, and every score with its
  evidence (the findings, the invented imports, the lint messages).
- `transcript.json` — what the agent printed, parsed if it was JSON.
- `diff.patch` — everything the agent changed against the baseline.

and `results/<runId>/summary.json` holds, per agent and condition, the mean and
median of each metric with `n`, and the same per task.

The conditions alternate within each task rather than running in two blocks,
so a change in the vendor's service over a long run falls on both sides.

### Agents

| Adapter       | What it does                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude-code` | `claude -p <prompt> --output-format json --permission-mode bypassPermissions --setting-sources project --strict-mcp-config`, plus `--mcp-config <workspace>/.mcp.json` in `with-dowel` only |
| `noop`        | Changes nothing. The floor, and a free check of the pipeline.                                                                                                                               |
| `reference`   | Copies `tasks/<id>/reference.tsx` into the route. A known-good answer, used by the tests to check the scoring.                                                                              |

Every `claude-code` flag was checked against `claude --help` for Claude Code
2.1.245. `--setting-sources project` keeps the runner's own user settings —
plugins, hooks, a globally configured Dowel MCP server — out of both
conditions while still loading the skill the workspace contains.
`--strict-mcp-config` does the same for user-level MCP servers. `--bare` is not
used: it would also turn off CLAUDE.md and skill discovery, which are what the
`with-dowel` condition tests.

The usage fields read from Claude Code's JSON result (`num_turns`,
`total_cost_usd`, `duration_api_ms`, `is_error`) are named after the Agent SDK's
result type. They have not been checked against a real run's output; every one
is optional, and the full output is kept in `transcript.json` whatever it holds.

Adapters for other agents — Codex, Gemini CLI, Cursor's CLI, Aider — are
welcome. Each must use flags verified against the help output of the installed
CLI, and say which version that was. An adapter that guesses at flags either
fails in the step that costs money or runs with settings its results do not
describe.

## Reproducibility

- **Pinned to a commit.** The scaffolder, CLI, MCP server and registry are this
  checkout's builds, never npm; npm dependencies are pinned to the versions
  `packages/ui` uses. Each result records the commit and whether the checkout had
  uncommitted changes, and a summary refuses to mix commits.
- **Isolated workspaces.** Projects are created outside the repository, so an
  agent does not pick up this monorepo's own CLAUDE.md or AGENTS.md (Claude Code
  reads every CLAUDE.md up to the filesystem root), and ESLint and TypeScript do
  not find its configs. Environment variables from `pnpm` itself are stripped
  before anything runs in a workspace.
- **Isolated settings.** See the `claude-code` flags above. A new workspace path
  also means Claude Code has no auto-memory for it.
- **Not isolated:** the model behind the agent. Vendors update models and
  serving without notice; the agent's version string is recorded, the model's
  is whatever the agent reports in its transcript.

## Publishing a run

A run is local until someone chooses to publish it. To publish:

1. Copy the whole run directory — every result, transcript and diff, failures
   included — into `results/published/<runId>/`. Dropping the runs that went
   badly is the one edit that makes a benchmark worthless.
2. `pnpm bench report <runId>` to regenerate its `summary.json` there.
3. Commit it.

`results/` is gitignored except for `published/`. The docs site's
[/agentbench](https://dowel-eight.vercel.app/agentbench) page shows published
summaries and nothing else; with none published it says so.

## Threats to validity

- **Small n.** Ten tasks, and each cell is as many runs as `--repeat` asked for.
  With n of 3 per task and condition, a difference of one invented component on
  one task is noise. Read `n` before the mean, and the per-task rows before the
  totals.
- **Agents are not deterministic.** The same prompt in the same workspace
  produces different diffs. Repeats are the only defence; the harness makes them
  cheap to ask for, not cheap to pay for.
- **Task selection.** The tasks were written by the people who wrote Dowel, about
  the kinds of screen Dowel has components for. That favours `with-dowel` on
  recall by construction. A task set written by someone else would be a stronger
  test.
- **`expect` is a judgement.** It is kept short and limited to choices the
  component guidance settles, and it is in the open to be argued with — but it
  is still one person's list.
- **The `without` agent can find Dowel anyway.** It is installed and
  `components.json` is in the root. That is intended: the question is what the
  agent files add on top, not whether an agent can find a library at all.
- **Static checks only.** Nothing is rendered. A page can pass every check here
  and be broken in a browser.
