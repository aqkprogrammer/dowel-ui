# Agent-operable UI — agents can operate your UI and hand it back

Branch: `feat/agent-operable-ui`. Every phase green on `typecheck`, `test` and
`audit:all`. Decisions that outlive this plan are in ADR 0015.

## Goal

Dowel's AI set already covers an agent's work before a tool runs
(`ai-agent-plan`, `ai-approval-request`) and after it has run
(`ai-action-ledger`). This plan covers the part in between: the agent
**operating the page**, and the person **taking the page back** from it.

Three components form the headline, built together because each depends on
the others. Phases 4 and 5 added four more that plug into them:

| Component          | What it is                                                                                                                                                | Status       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `agent-surface`    | A region whose actions are registered as tools. The app's own assistant calls them through `apiRef`, and with `webmcp` a browser agent can call them too. | experimental |
| `control-baton`    | Shows who holds control: the agent, the person, or both sharing it. The person can take over, and can hand back with a note that the agent receives.      | experimental |
| `stream-announcer` | An opt-in way for a screen reader user to hear a streaming response as it arrives. It reads whole sentences only, and has pause, skip and repeat.         | beta         |
| `agent-form`       | Fill, read and submit tools for any form, with the fields read from the form itself. Private fields are never read or filled.                             | experimental |
| `agent-data-table` | Read, sort, search, filter, select and page tools for a TanStack table, calling the same API as the table's own controls.                                 | experimental |
| `agent-approvals`  | The approval step, built on `ai-approval-request`: correct the arguments, approve once or for the session, or deny with a reason.                         | experimental |
| `agent-ledger`     | What the agent did, built on `ai-action-ledger`, with an undo for each call whose tool registered one.                                                    | experimental |
| `ai-suggest-mode`  | Track changes for an agent's edits to text: each change in place, with its reason, accepted or rejected on its own.                                       | beta         |
| `blast-radius`     | What an action will change before it runs: how many things, how, which can't be undone, and a sample by name. Shown in `agent-approvals`.                 | beta         |
| `agent-replay`     | Step through a finished run: each call, what the agent was told, and every take-over and hand-back.                                                       | experimental |
| `prompt-redactor`  | A privacy check before a prompt is sent: emails, card numbers and keys swapped for placeholders, then put back in the reply.                              | beta         |

## Prior art (checked 2026-09-25)

A search was done before anything was called a first. The results changed
what the headline can claim.

| Component          | Closest prior art                                                                                                                                                                                                                                                                                                                                                                                                                              | Can we call it a first?                                                                                                                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent-surface`    | [KendoReact 2026 Q2](https://www.telerik.com/kendo-react-ui/components/ai-tools/web-mcp) puts a `webMcp` prop on about 50 components; its Grid exposes filter, sort and paging, and its Form exposes fill, validate and submit. [Fabrials](https://github.com/grok-insider/fabrials-webmcp) is a shadcn registry with `useWebMCPTool`. Hooks only: `@mcp-b/react-webmcp`, CopilotKit `useFrontendTool({ webmcp })`, assistant-ui, TanStack AI. | **No.** A commercial library already ships components that register their own actions. What we have and have not found elsewhere is the control model around the tools: refusing calls while the person holds control, the hand-back note, and failing closed on approvals. |
| `control-baton`    | Products, not components: ChatGPT agent's "Take over browser", [Browserbase Live View](https://docs.browserbase.com/features/session-live-view), BrowserAct's "Take Control". The nearest components are CopilotKit's `useInterrupt` (it runs the other way: the agent asks the person) and assistant-ui's `AgentHandoff` (between agents, display only).                                                                                      | **Not known to exist.** We found no component library that ships a reusable take-over / hand-back control.                                                                                                                                                                  |
| `stream-announcer` | Guidance only. [Nowah (Jul 2026)](https://nowah.xyz/blog/screen-readers-ai-chat-accessible) recommends announcing each sentence as it completes. AI Elements' Conversation uses `role="log"`; zerojitter debounces a live region by time. None of these have pause, skip or repeat.                                                                                                                                                            | **Shipping it, yes. Inventing it, no.** Reading sentence by sentence is a published idea; we found no component library that ships it.                                                                                                                                      |

GitHub code search is index-limited, and it returned nothing for LibreChat or
Chainlit. Repeat the search before any launch post.

### Wording we can stand behind

- **agent-surface:** "Components register their own actions as tools, for
  your own assistant or for browser agents over WebMCP (experimental; Chrome
  and Edge origin trials)." Never "the first".
- **control-baton:** "We don't know of another component library that ships
  a reusable take-over / hand-back control. The pattern comes from agent
  products such as ChatGPT agent and Browserbase's live view."
- **stream-announcer:** "An opt-in live region that reads streamed replies a
  sentence at a time, with pause, skip and repeat. We don't know of another
  component library that ships one."

## WebMCP, as coded against

This is the spec text of 2026-09-17. It is a community group draft, running as
an origin trial in Chrome (versions 149 to 156) and Edge (from version 150).

- The entry point is `document.modelContext`. It moved there from
  `navigator.modelContext` on 2026-05-27.
- `registerTool(tool, { signal })` returns a promise. A tool is removed by
  aborting its signal. `provideContext()` and `unregisterTool()` are gone.
- A tool has `name`, an optional `title`, `description`, `inputSchema`,
  `execute(input, { signal })` and `annotations`. The annotations are
  `readOnlyHint`, `untrustedContentHint` and `consequentialHint`.
- **The browser does not validate input against `inputSchema`**, so the page
  has to (`tool-input.ts`).
- **`requestUserInteraction` was removed on 2026-06-11**, and consent is still
  an open question in the spec. Approval therefore happens in the page, through
  `onApprovalRequest`.

Everything that depends on the draft is in `agent-surface/webmcp.ts`. That
file accepts both the current draft and the one before it.

## Design

### The control model

A surface is always in one of three states:

| `holder` | Meaning                                                     | Tool calls                                          |
| -------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `shared` | Nobody is driving. An agent may act, and so may the person. | Allowed.                                            |
| `agent`  | An agent run is under way.                                  | Allowed. Operating a control counts as taking over. |
| `person` | The person has taken over, or the agent handed over.        | **Every call is refused, reads included.**          |

Reads are refused too because people often take over to type something the
agent should not see, such as a password or a card number. ChatGPT agent
stops taking screenshots while the person is in control, for the same reason.

The transitions are `grant`, `release`, `takeOver`, `handOver(reason)` and
`handBack(note)`. `handBack` returns control to whoever held it before the
person took over.

### What we decided and why

1. **Tools run the same handlers a person's input does.** `useAgentTool`
   registers a closure over the component's own state setters. A tool is
   never a second code path that can drift out of step with the UI.
2. **Approvals fail closed.** Irreversible writes need approval by default. If
   there is no `onApprovalRequest`, the call is refused, not run. If control
   changes while approval is pending, the call is refused.
3. **Operating a control takes over.** While the agent drives, a person who
   activates or edits something inside the surface takes over. Tabbing and
   reading don't count. The agent's own synthetic clicks don't count either:
   they are untrusted events fired while a call is running.
4. **`data-agent-ui` marks UI that is about the agent**, not part of the page
   it operates: the baton, an approval, the composer. The first live run showed
   why this is needed. Clicking **Allow** on an approval inside the surface
   counted as taking over, so the person took control from the agent and the
   action they had just approved was refused. `control-baton`,
   `ai-approval-request` and `ai-prompt-input` now carry the attribute.
5. **The hand-back note travels with the agent's next result.** A browser
   agent reads nothing from the page except what tools return, so the note is
   put at the start of the next call's text, once.
6. **Summaries use the past tense and titles name the tool.** The ledger and
   the baton say what was done ("Emailed the owners of 2 deals"). Approvals and
   calls still running use the tool's title ("Email deal owners…"). Using the
   past-tense summary in the approval produced "Claude wants to: Emailed…",
   which the demo caught.
7. **`webmcp` is off by default.** A developer who adds a surface to wire up
   their own assistant has not also agreed to expose those actions to every
   browser agent.
8. **`stream-announcer` leaves ADR 0009's default alone.** `ai-conversation`
   still announces state and never content. The announcer is opt-in and off by
   default. It announces a sentence only once the next one has begun, because
   "3." can still turn into "3.5 million". It paces its queue against an
   estimated speech rate, so the backlog stays in the page where pause and skip
   can reach it. Its region is not `role="status"`, which is atomic, and not
   `role="log"`, which would give screen readers a second transcript to
   navigate.
9. **Undo is registered per call, not per tool.** `execute` gets
   `onUndo(fn)`. The closure captures the state from before the call, which
   the agent never sees. A tool with no undo is not listed in the ledger by
   default; listing a sort as "Cannot be undone" would be as misleading as
   offering an undo for it. When the person undoes something, the agent is told
   with its next result.
10. **Approval can say more than yes or no.** `ai-approval-request` already
    let the person correct arguments and allow a tool for the session. The
    surface now honours both. Corrected arguments are validated against the
    same schema as the agent's, and the ledger records which ones the person
    changed.
11. **Mounting `agent-approvals` is the wiring.** It registers itself as the
    surface's approver, and an `onApprovalRequest` prop takes precedence over
    it. If it unmounts while requests are waiting, they are refused.
12. **A form is read from itself.** `agent-form` finds its fields, labels,
    descriptions, options and errors in the DOM. The accessibility of the form
    is what the agent works from. Values are set through the same input events
    typing fires, so React, React Hook Form and uncontrolled fields all see an
    ordinary edit.
13. **Private fields are the person's alone.** Passwords, one-time codes, card
    numbers and anything inside `[data-agent-private]` are never read or
    filled. When one of them is required and empty, the submit tool tells the
    agent to hand control to the person.
14. **Submitting a form is irreversible unless you say otherwise.** Unknown
    consequences are treated as permanent, so a submit waits for approval.
15. **Tools for a table exist only for the features it has.** A table without
    sorting is offered no `sort` tool. View changes register no undo, so they
    stay out of the ledger.

## Phases

### Phase 0: Plan and prior-art check

This document, and the search above.

### Phase 1: `stream-announcer`

- `speakable.ts` turns markdown into prose. A code block becomes "Code block,
  tsx, 3 lines". Links keep their text, table rows become lists of cells, and
  headings get a full stop.
- It splits text into sentences with `Intl.Segmenter`, and falls back to
  splitting on punctuation.
- The component has a toggle, pause, skip (its name says how many are queued)
  and repeat. `onAnnounce` lets an app keep a transcript or send the same
  sentences to speech synthesis.

### Phase 2: `agent-surface`

- The provider, `useAgentTool` and `apiRef`: `tools()`, `call()` and the five
  transitions.
- `tool-input.ts` validates input against a subset of JSON Schema and gives
  errors a model can correct from, for example "column must be one of: …".
- `webmcp.ts` is the adapter. While the agent uses an element, the element is
  outlined.

### Phase 3: `control-baton`

- It works inside a surface, or on its own with `holder` (for example, when
  watching a remote browser session).
- There is one action button, so focus stays put as control changes.
- The note field opens with focus in it. Ctrl/⌘+Enter hands back and Escape
  cancels.

### Phase 4: Tools for existing components

Opt-in registry items, so no existing component gains a dependency:

- **`agent-form`**: `<toolName>_fill`, `_read` and `_submit`. The schema is
  built from the form and updated when its fields change. `fill` registers an
  undo that restores the previous values. `submit` goes through the form's own
  submit handler and reports the errors the form shows.
- **`agent-data-table`**: `useDataTableAgentTools(table, options)` gives
  `_rows`, `_sort`, `_search`, `_filter`, `_select` and `_page`, each only when
  the table has that feature. The tests prove that a tool call and a person
  using the column header produce the same table state.
- **Not done:** `tabs`, `select`, `combobox` and `dialog`. `useAgentTool` covers
  them in a few lines each, so they wait until someone needs a packaged version.

### Phase 5: Ledger and approval wiring

- `agent-approvals` and `agent-ledger`, described above.
- The surface gained `onUndo`, `api.undo(callId)`, a call history in context,
  approval answers with corrections and scope, and approver registration.
- **Fixed in `ai-action-ledger`:** a reverted action no longer stays in the
  selection, where it was still counted by "Undo 2 selected".
- The `agent-surface` demo now uses the real `ai-approval-request` and
  `ai-action-ledger` in place of the hand-built banner it had.
- **Not done:** moving the `agent-console` block onto a surface. It is a Pro
  block, so that change belongs in a release of its own.

### Phase 6: Declarative WebMCP for forms

`agent-form` with `declarative`, inside a surface with `webmcp`:

- It writes `toolname`, `tooldescription` and a `toolparamdescription` on
  every field, keeping the ones it wrote up to date and never overwriting yours.
- It sets `toolautosubmit` only when submitting can be undone. For an
  irreversible form, the person pressing submit is the consent.
- A browser agent's submit (`SubmitEvent.agentInvoked`) is stopped and routed
  through the submit tool, so control and approval apply to it. The result
  goes back through `respondWith`. The real submission happens in a new task,
  because a form ignores a submit requested while its own submit event is
  still firing.
- The fill and submit tools are then registered with `webmcp: false`, so the
  browser is not told about the same form twice.

### Phase 8: Four more, before the release

- **`blast-radius`**: a dry run shown inside the approval. Tools gain
  `preview(input)`. It starts at the same moment as the approval question, so
  the question appears immediately and the preview fills in when it arrives.
  When the list is only a sample, the sentence says "at least". Permanent
  changes are listed first.
- **`agent-replay`**: calls and changes of control on one timeline, stepped
  through with buttons, a slider or playback. Calls now record `told`, the
  exact text the agent received. The surface keeps a timestamped
  `controlLog`. Playback stops at the end rather than looping, and doesn't
  announce each step while it plays.
- **`ai-suggest-mode`**: works from edits with reasons, or from a whole rewrite
  diffed word by word. The agent proposes changes and cannot apply them.
  After each decision, focus moves to the next suggestion still waiting.
  Inside a surface, the agent is told what was rejected so it doesn't suggest
  it again, through the new `api.notify`.
- **`prompt-redactor`**: conservative detection. Card numbers must pass the
  Luhn check, IBANs their checksum, and keys must match a known provider's
  format. A value keeps the same placeholder across the whole conversation.
  Values are shown masked and never in full. A kept secret gets a warning.
- **Surface additions:** `preview`, `told`, `controlLog` and `notify`.
- **Found by testing:** a dry run started a microtask late, which meant the
  approval could be answered before its preview had begun. It now starts
  synchronously.

### Phase 7: Release

Changelog, search synonyms, agent docs, counts, `audit:all`, and version 0.10.0
across the lockstep packages. Deploying the site and publishing to npm are the
maintainer's to do, in that order (`RELEASING.md`). Repeat the prior-art search
before any post.

### Screen reader testing

`packages/screen-reader-tests` runs real VoiceOver and NVDA through Guidepup,
plus a `harness` project with a fake listener that proves the scenarios
themselves. JAWS has a manual protocol. See `docs/testing/screen-readers.md`.

The harness paid for itself on its first run. While the reply streams, the
story's button is renamed "Streaming…", so the check for "has it finished?"
was waiting on a button that no longer matched, and missed the first sentence.
A real VoiceOver run would have failed the same way, and the failure would
have looked like the screen reader's fault.

## Open questions

- **Real screen readers have not run yet.** The harness passes. The VoiceOver
  and NVDA runs need a machine or CI runner set up for them, and JAWS needs a
  person. `stream-announcer` stays `beta` until
  `docs/testing/screen-readers.md` says otherwise.
- **`wordsPerMinute` defaults to 240,** which is a guess between a screen
  reader's default speed (roughly 180–200) and the speed experienced users set
  (300 or more). Apps should let the user set it and remember it.
- **Consent in WebMCP.** When the spec replaces `requestUserInteraction`,
  route approvals through it as well as through `onApprovalRequest`.
- **`exposedTo`,** which limits which origins can see a tool, is not exposed
  yet.
- **Taking over by input misses gestures that aren't clicks or edits.** A drag
  on a canvas or a keyboard shortcut does not take over. Such components can
  call `api.takeOver()` themselves.
- **Declarative forms are filled by the browser.** While the person holds
  control, the page can refuse a browser agent's submit, but it cannot stop the
  browser filling fields. Use the imperative tools where that matters.
- **Is a person's submit on an agent-filled form marked `agentInvoked`?** The
  draft does not say. If it is, that submit is sent for approval as well: a
  second confirmation, but a safe one.
- **Asynchronous validation is not reported.** `_submit` reports the errors on
  screen right after submitting. Errors that come back from a server later are
  not included; the agent can call `_read` to see them.

## Per-component checklist

- [x] `components/<name>/{<name>.tsx,.test.tsx,.stories.tsx,index.ts,meta.ts}`
- [x] Registered in `registry/components.ts` and `src/index.ts`
      (`scripts/register-component.ts`)
- [x] Counts in `README.md`, `packages/ui/README.md` and
      `packages/ui/package.json`
- [x] Search synonyms and `agent-docs` guidance
- [x] `typecheck`, `test` and `audit:all`
- [x] Checked in the docs site: the scripted agent run, take over by input,
      hand back with a note, approval, the agent asking for help, a streamed
      response, the ledger's undo, and the agent filling a form

## Progress

| Phase                        | Status                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| 0 Plan and prior art         | done                                                                       |
| 1 `stream-announcer`         | done (beta until the screen reader runs pass)                              |
| 2 `agent-surface`            | done (experimental)                                                        |
| 3 `control-baton`            | done (experimental)                                                        |
| 4 Tools for components       | done: `agent-form`, `agent-data-table`                                     |
| 5 Ledger and approval wiring | done: `agent-approvals`, `agent-ledger`, `ai-action-ledger` fix            |
| 6 Declarative WebMCP         | done (experimental, against the 2026-09-17 draft)                          |
| 8 Four more components       | done: `ai-suggest-mode`, `blast-radius`, `agent-replay`, `prompt-redactor` |
| 7 Release                    | waiting for Phase 8; deploy and publish are the maintainer's               |
| Screen readers               | harness passes; VoiceOver and NVDA ready in CI; JAWS protocol ready        |

## Later

Ideas from the same review, in rough order of how hard they are to copy:
`provenance-text` (who wrote each part of a paragraph), `nl-filter` (natural
language in, filter chips you can edit out), `memory-inspector`,
`expression-editor`, `quantity-input`, `permission-prompt`, and dither charts
you can hear.
