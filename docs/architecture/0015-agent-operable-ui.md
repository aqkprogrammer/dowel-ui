# 15. Agent-operable UI

- **Status:** Accepted
- **Date:** 2026-09-25
- **Phase:** 12

## Context

ADR 9 covered the AI surfaces around a conversation. The agent's work before a
tool runs (plan, approval) and after it (the ledger) were covered. The part in
between was not: an agent operating the page itself, and the person taking the
page back.

Letting components register their actions as tools is no longer new. KendoReact
has shipped WebMCP tools on its components since June 2026, and several hooks
do the same for React (see the prior-art section of
`docs/plans/agent-operable-ui.md`). What we have not found is a component
library that treats **control** as state. That means knowing who holds the
page, refusing the agent while the person holds it, and letting the person hand
it back with something the agent then learns. This record covers that model,
plus the accessibility decision `stream-announcer` makes against ADR 9's
default.

## Control is state, with three values

`shared`, `agent` and `person`, and not a boolean for whether the agent is
running. Each value answers a question the other two cannot:

- **`shared`**: may a browser agent act on this page right now? Yes, and so may
  the person.
- **`agent`**: is a run under way? Then a person operating a control is taking
  over, not collaborating.
- **`person`**: is the agent refused? Yes, every call, **reads included**.
  People often take over to type a password or a card number. An agent that
  can still read the form is watching them type it.

## Fail closed

- If an irreversible write has no `onApprovalRequest`, it is refused, not run.
- If the approval handler throws, that counts as a denial.
- If control changes while approval is pending, the call is refused even if the
  approval then arrives.
- If the person takes over during a running call, its signal is aborted. The
  agent is told the call was stopped, never that it succeeded.

## Operating a control is taking over, except in `[data-agent-ui]`

While the agent drives, a person who activates or edits something in the
surface has taken over. Making them find a button first would mean racing the
agent to it.

Two things are exempt:

- **Events the agent fires itself.** These are untrusted and happen while a
  call is running.
- **Anything inside `[data-agent-ui]`.** This is interface about the agent
  rather than the page: the baton, an approval, the composer.

The first live run showed why the exemption has to exist. Clicking **Allow** on
an approval inside the surface took control from the agent, so the call just
approved was refused. `control-baton`, `ai-approval-request` and
`ai-prompt-input` now carry the attribute. Any approval or chat UI that
consumers build inside a surface should carry it too.

## One file knows about WebMCP

The draft has already moved:

- From `navigator.modelContext` to `document.modelContext`.
- From `provideContext` and `unregisterTool` to registering with an abort
  signal.
- Its consent hook was removed.

`webmcp.ts` isolates all of this and accepts both the current draft and the
one before it. Any other failure (a missing API, a rejected name, a
cross-origin frame without `allow="tools"`) leaves the page working without the
tool. A page must never throw because an experimental API is missing.

WebMCP is **off by default** (`webmcp={false}`). A developer who adds a surface
for their own assistant has not agreed to expose its actions to every browser
agent.

Input is validated in the page because the browser does not validate it. The
errors are written for a model to act on, for example: `column must be one of:
"name", "amount"`.

## The hand-back note rides on the next result

Only a tool result is guaranteed to reach a browser agent. So a hand-back note
is put at the start of the text of the agent's next call, exactly once, even if
that call is refused.

## `stream-announcer` is opt-in, and ADR 9 still holds

ADR 9 decided that a streaming transcript must not be a live region, and that
stays the default. The announcer is off until the listener turns it on. When on:

- **Whole sentences only.** A sentence is spoken once the next one has begun,
  or once the stream ends. "The total is 3." may yet become "3.5 million".
- **The backlog stays in the page.** Chunks are paced against an estimated
  speech rate (`wordsPerMinute`). Anything handed to the screen reader is
  beyond pause and skip.
- **The region is neither `status` nor `log`.** `status` is atomic, so every
  update would re-read everything. `log` would give screen readers a second
  transcript to navigate. It is a plain polite region that only ever gains
  nodes, and it is present from first paint.
- **Markdown is read as prose.** A code block becomes its language and line
  count, because the block itself is there to navigate to.

## Undo is registered per call

A tool's `execute` gets `onUndo(fn)`. The closure keeps whatever state it
needs from before the call, and none of it is sent to the agent. A tool-level
`undo(input)` was considered and rejected: it would need the old state to
travel in the tool's result, which the agent would then read. `agent-ledger`
lists by default only calls worth reverting: writes with an undo, and writes
whose consequences stand. When the person undoes a call, the agent is told
with its next result, the same way it hears a hand-back note, so it does not
simply do the thing again.

## An approval is more than a boolean

`ai-approval-request` already let the person correct arguments and allow a
tool for the session. The surface now accepts an answer shaped like that:

- **Corrected arguments** are validated against the tool's schema before they
  run, and the call records which arguments the person changed.
- **"Always"** lasts until the surface unmounts.
- **A denial with a reason** passes the reason on to the agent.

`agent-approvals` registers itself as the approver when it mounts. An
`onApprovalRequest` prop takes precedence over it. Requests still waiting when
it unmounts are refused, never left hanging.

## A form is read from itself

`agent-form` builds the tool's schema from the form's DOM: accessible names,
descriptions, required marks, options, and the errors a person would see. A
field that is unclear to a screen reader is unclear to the agent too, which is
the right incentive. Values are set with the element's own value setter and
the same input and change events typing fires, so any React form sees an
ordinary edit.

**Some fields are the person's alone.** Passwords, one-time codes, card
numbers and anything inside `[data-agent-private]` are never read or filled.
The agent is told they exist, and whether they have been filled, but never
what is in them.

**Submitting counts as irreversible by default.** A form is usually how
something happens in the world, and unknown consequences are safest treated
as permanent.

## Declarative WebMCP forms go through the same checks

With `declarative`, the form carries WebMCP's `toolname`, `tooldescription`
and `toolparamdescription` attributes. A submit from a browser agent is
intercepted and routed through the submit tool, so control and approval apply
to it too. Its result goes back through `respondWith`. The imperative fill and
submit tools are marked `webmcp: false`, so the browser does not see the same
form twice.

The page cannot stop the browser filling fields while the person holds
control. It can only refuse the submit. Where that difference matters, use the
imperative tools.

## Screen readers are tested with screen readers

`packages/screen-reader-tests` drives VoiceOver and NVDA through Guidepup
against the Storybook stories. A `harness` project runs the same scenarios
with a fake listener, so a failure under a real screen reader is the screen
reader's and not the test's.

The harness justified itself immediately. A locator that stopped matching
mid-stream made the first sentence look unspoken. JAWS is tested by hand, to
the protocol in `docs/testing/screen-readers.md`.

## Four more pieces: dry runs, replay, suggestions, redaction

- **A dry run is part of the approval, not a step before it.** A tool's
  `preview` starts the moment the question is asked, and the answer fills in
  the question already on screen. A sample is never passed off as a total: the
  counts say "at least". A failed dry run is shown, and the person can still
  decide.
- **Replay shows what was recorded, not the page.** Each call now keeps
  `told`, the exact text the agent received, and the surface keeps a
  timestamped `controlLog`. That makes "how did it get there?" answerable
  without keeping snapshots of the page; `renderStep` is for apps that do keep
  them.
- **The agent proposes; the person applies.** `ai-suggest-mode` never writes
  to the text. The result is the original with only the accepted changes in
  it. What was rejected goes back to the agent through `api.notify`, the same
  channel as a hand-back note, so the next draft doesn't bring it back. For
  code, `diff-viewer` already decides line by line.
- **Redaction happens in the page.** `prompt-redactor` swaps values for
  placeholders before sending and puts them back locally in the reply. The
  model never sees the value, and the person sees exactly what was sent.
  Detection is conservative: checksums for card numbers and IBANs, and known
  formats for keys. A false alarm costs a click, and a noisy detector teaches
  people to ignore it.

## Consequences

- `agent-surface` and `control-baton` ship as `experimental`. The spec they
  expose to can still change shape, and `webmcp.ts` is where that will be
  absorbed.
- `stream-announcer` ships as `beta` until it has been tested with NVDA, JAWS
  and VoiceOver. jsdom can show what is placed in the region, but not how any
  screen reader paces it.
- Existing components gain one attribute (`data-agent-ui`) and no dependency.
  `ai-action-ledger` also stops counting reverted actions in its selection, a
  bug the ledger integration exposed.
- `agent-form` and `agent-data-table` ship as experimental too. They depend on
  the surface's contract rather than on WebMCP directly, so a change to the
  spec reaches them only through `webmcp.ts` and the form's declarative
  attributes.
