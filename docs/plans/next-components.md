# Plan: 0.11.0 — the "Later" list, `exposedTo`, and a clean install

**Status:** done, released as 0.11.0 (2026-09-27)

## Goal

Ship the ideas `agent-operable-ui.md` left for later, finish the one open
WebMCP item that is ours to build, and prove that everything the registry
serves installs and builds in a fresh app.

None of these is announced as a first. Before any post about them, repeat a
prior-art search, as for 0.10.0.

## Already done for this release

- **Installed components build.** 22 main files exported less than their
  `index.ts`; `audit:installed-imports` now enforces the rule (PR #10).
- **Full install check.** Every component (213) and block (47) the registry
  serves, installed with the CLI into a fresh Next.js 16 app: `tsc` finds no
  errors and `next build` passes.
- **Real screen readers.** VoiceOver and NVDA pass in CI (PR #9), after the
  harness learned to hear live regions and NVDA's re-reading was fixed.

## New components

Each follows ADR 4 and the per-component checklist in
`agent-operable-ui.md`, ships as `beta`, and stays under the per-file budget.

| Component           | Category | What it is                                                                                                                                      |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `provenance-text`   | ai       | Text that shows who wrote each part — you, an agent, or a pasted source — with each author's share, built from a before/after edit.             |
| `nl-filter`         | data     | Type "failed deploys on main this week", get filter chips you can edit or remove. The app supplies the parser; a plain `field:value` one ships. |
| `memory-inspector`  | ai       | What an assistant remembers about you: search, edit, pin, and forget with an undo window, each memory with where it came from.                  |
| `expression-editor` | form     | A formula field: highlighting, autocomplete for variables and functions, the error where it is, and a live result. Safe evaluator, no `eval`.   |
| `quantity-input`    | form     | A number with a unit: steppers, min and max, conversion when the unit changes, and "5 kg" pasted in parsed.                                     |
| `permission-prompt` | ai       | "Claude wants to read your calendar": what it can and cannot do, and allow once, for the session, always, or deny.                              |
| `chart-sonifier`    | data     | Hear a chart: each series played as pitch over time, with keyboard scrubbing that speaks each value. Works with the dither charts' data.        |

## `agent-surface`: the WebMCP draft of 2026-09-26

- **`exposedTo`.** `registerTool(tool, { exposedTo, signal })` takes origins,
  beyond the tool's own, that may see the tool within the page's frame tree. A
  tool gets `exposedTo`; the surface gets a default. The browser rejects the
  whole registration if one origin is invalid or not potentially trustworthy,
  so the page checks first and says which one in development.
- **`debugging`,** a new annotation for tools meant for developer tooling only.

## Release

0.11.0 across the lockstep packages: changelog, search synonyms, agent docs,
counts, `audit:all`, deploy the site, then publish (`RELEASING.md`).

## Progress

| Item                         | Status |
| ---------------------------- | ------ |
| Installed imports (PR #10)   | done   |
| Full install check           | done   |
| Screen readers in CI (PR #9) | done   |
| Seven components             | done   |
| `exposedTo` and `debugging`  | done   |
| Release                      | 0.11.0 |
