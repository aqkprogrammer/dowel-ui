# 17. What agents are told, and where a model fits

- **Status:** Accepted
- **Date:** 2026-10-06
- **Phase:** Roadmap phase 4

## Context

Dowel already gave coding agents a catalogue (`dowel agents`), a live registry
(the MCP server) and a planner (`plan_ui`, `/generate`). All three answered
"what exists". None answered "which of these is right for this", which is
where agents actually go wrong: not by inventing a component, but by choosing a
Dialog for a destructive confirmation or a Select for two hundred options.
And nothing checked what an agent wrote afterwards.

The component genome (roadmap phase 2) made the answer available: guidance
written per component, and props and capabilities read from source. This
record covers how it reaches agents, and where a language model is and is not
used.

## The genome reaches every surface the same way

- **Agent files** (`.dowel/components.md`, `ai.md`): each component with
  guidance gets "Use for", "Not for" and "Often with" lines under it. An agent
  that only reads the repository gets the distinctions without a tool call.
- **MCP `get_component`**: when to use it, what it is confused with, whether
  it needs a client boundary, whether it animates, and every prop its type
  declares.
- **MCP `search_components`** matches on the situations in guidance, so
  searching "irreversible" finds `alert-dialog`.
- **`plan_ui`, `/generate` and `dowel plan`** score guidance phrases above a
  description match, because someone wrote them to answer exactly this.

All of it is read from the same registry fields. None of the surfaces keeps
its own copy.

## `audit_code`: the agent checks its own output

The six `dowel audit` rules (ADR 16) are exposed to agents as `audit_code`. An
agent passes the code it wrote and, optionally, what the project has
installed, and gets each finding with its line and, where there is one, the
exact replacement. The server's instructions tell agents to call it after
writing UI.

This is the step most "AI-ready" component libraries leave out: they describe
the components and trust the result. A description is followed most of the
time; a check catches the rest before a person reviews it.

Native elements are only reported when `installed` is given, and the reply
says when it was not. Telling an agent to use a `<Select>` the project does
not have would send it to install one nobody asked for.

## A model chooses; the registry decides what is real

`dowel plan --model` asks Claude to choose the blocks and components for a
described screen. The division of labour is fixed:

1. The model is given the catalogue — every component and block, with its
   description and guidance — and asked for picks, as structured output
   validated against a schema.
2. `planFromPicks` drops any name the registry does not have, reports it, and
   folds a component into a chosen block that already installs it.
3. The plan is rendered by the same code the built-in planner uses.

So the guarantee every plan carries — it cannot name a component that does not
exist — holds whoever does the choosing. A model is better than word matching
at reading intent ("support agents triage tickets with an assistant" wants a
data table, filters and a chat panel); it is worse at staying inside a list,
and step 2 is where that stops mattering.

### Why the CLI, and why opt-in

- **Opt-in, with the person's own credentials.** The built-in planner needs
  no key and no network beyond the registry, and stays the default. Nothing is
  sent to the model but the prompt and the public catalogue, never project
  files.
- **Not on the website.** A model behind `/generate` would need a server-held
  key: a cost paid per anonymous visitor and an abuse surface, for a page that
  works without one. The page continues to say it is a planner, not a model.
- **Not inside the MCP server.** An agent calling MCP is already a model.
  Giving it a second model to consult adds cost and latency without new
  information; it gets the genome and `audit_code` instead.
- **An optional peer dependency.** `@anthropic-ai/sdk` is loaded only when
  `--model` is passed, so the CLI everyone runs through `npx` does not
  download an SDK most of them never use. Without it, `--model` says how to
  add it.

### The request

`claude-opus-5-5`, overridable with `--model <id>`; structured output through
the SDK's zod helper; medium effort, since this is choosing from a list rather
than open-ended reasoning; server-side refusal fallbacks on, so a declined
request is re-run rather than returning nothing; the catalogue as a cached
system block, built only from the index, so it is byte-identical across
requests to the same registry.

### Not verified here

The tests replace the SDK with a stand-in that records the request and returns
fixed picks, so the validation, the error handling and the request shape are
tested offline. No live call was made while building this. The first live run
is a person's, with their own key.

## Also

`create-dowel-app` now writes the agent files when it scaffolds, rather than
suggesting `dowel agents` at the end. The first thing many people do in a new
app is ask an agent to build a page.
