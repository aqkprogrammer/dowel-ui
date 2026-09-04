<div align="center">

# Dowel

### Source-first React components for SaaS and AI products

**You install the code, not a dependency.**

[![npm](https://img.shields.io/npm/v/@dowel-ui/react?color=5b5bd6&label=%40dowel-ui%2Freact)](https://www.npmjs.com/package/@dowel-ui/react)
[![license](https://img.shields.io/npm/l/@dowel-ui/react?color=5b5bd6)](https://github.com/aqkprogrammer/dowel-ui/blob/main/LICENSE)
[![types](https://img.shields.io/badge/types-included-5b5bd6)](https://www.typescriptlang.org)

[**Documentation**](https://dowel-eight.vercel.app) · [**Components**](https://dowel-eight.vercel.app/docs/components) · [**GitHub**](https://github.com/aqkprogrammer/dowel-ui)

</div>

---

A dowel is the hidden pin that joins two pieces of wood without a visible
fastener. That is the idea here: components that fit together, hold, and then
get out of your way.

```bash
npx @dowel-ui/cli init
npx @dowel-ui/cli add button
```

That second command writes `button.tsx` into your project. Open it. Change it.
It is your file now — there is no package standing between you and the markup.

---

## Why another component library

Most libraries hand you a black box and a theming API. When the design calls for
something the API did not anticipate, you fight it, wrap it, or override it with
`!important`.

Dowel gives you the source instead.

|                      | Dowel                         | Typical library              |
| -------------------- | ----------------------------- | ---------------------------- |
| Where the code lives | **Your repo**                 | `node_modules`               |
| Changing a component | **Edit the file**             | Props, overrides, forks      |
| Upgrades             | **You choose, per component** | All at once, or not at all   |
| Reading the source   | **It is right there**         | Sourcemaps, if you are lucky |
| Runtime you ship     | **Only what you used**        | The library                  |

You can still `npm install @dowel-ui/react` and import from it — that path
works, and is the fastest way to try things. Most people move to the CLI once
they want to change something.

---

## What is in it

**75 components** and **13 blocks**, every one keyboard-operable and audited for
contrast.

**AI** — the reason this library exists
Conversation · Message · Response · Prompt Input · Tool Call · Reasoning ·
Sources · Model Selector · Token Usage · Agent Status · Agent Plan ·
Approval Request · Action Ledger · Structured Output · Inline Completion ·
Disclosure · **Extraction Review** ·
**Suggested Value**

**Forms**
Input · Label · Checkbox · Radio Group · Switch · Slider · Select · Combobox ·
Form · Calendar · Date Picker · Tags Input · File Upload ·
**Time Range Picker** · **Cron Editor** · **Secret Field** ·
**Confirm Typed** · **Shortcut Recorder**

**Overlays**
Dialog · Sheet · Drawer · Popover · Tooltip · Dropdown Menu

**Data**
Table · Data Table · Accordion · Activity Feed · Code Block · Metric Delta ·
Record Diff · **Log Viewer** · **Diff Viewer** · **Permission Matrix** ·
**DNS Record**

**Feedback**
Alert · Toast · Progress · Meter · Skeleton · Spinner · Empty State ·
**Sync Status** · **Session Expiry**

**Navigation & layout**
Tabs · Command · Pagination · Card · Badge · Avatar · Button · Separator

---

## The AI components

Most "AI component libraries" ship a chat transcript and stop. Real AI features
inside real software are extraction, enrichment, autofill and agents that
_change things_ — and those need surfaces nobody else provides.

**`ai-agent-plan` + `ai-approval-request` + `ai-action-ledger`** — the whole
sequence, which no other library covers: what the agent intends, the gate where
you approve it (after correcting the arguments it got wrong), and the record of
what it actually did.

**`ai-action-ledger`** — what the agent actually did, and what can be undone.
Everyone ships approval _before_ a tool runs. Nothing ships the part after,
where a deletion can be reverted, a refund can only be offset by another
transaction, and a sent email cannot be taken back at all. Hiding those three
behind one "Undo" button is a lie you discover after clicking.

**`ai-structured-output`** — an object arriving field by field, with the layout
reserved up front so nothing jumps as it fills in.

**`ai-inline-completion`** — ghost text in a real textarea. Tab accepts,
Alt+Right takes a word, and Escape always gives Tab back to focus management, so
a keyboard user is never trapped in the field.

---

## Blocks

Whole sections, assembled from components. Installing one brings everything it
is built from:

```bash
npx @dowel-ui/cli add ai-chat
# ✓ Added ai-conversation, ai-message, select, ai-model-selector,
#   ai-prompt-input, ai-reasoning, ai-response, ai-sources, ai-token-usage,
#   ai-tool, spinner, button, empty-state, ai-chat
```

Login · Signup · Forgot Password · Dashboard · Admin Users · Settings ·
Pricing · AI Chat

---

## Theming

Two tiers of design tokens, in plain CSS. No config file, no JavaScript theme
object.

```css
:root {
  --primary: oklch(0.55 0.2 275);
  --radius-scale: 1; /* one knob re-proportions every corner in the system */
}
```

Seven presets ship with it, and every one passes **WCAG AA contrast in both
light and dark** — verified by an audit that checks 322 colour pairs across 14
schemes on every commit, not by eye.

---

## Accessibility is not a checklist here

Every component is tested for behaviour, not appearance. A few things that fell
out of taking it seriously:

- `Meter` uses `role="meter"`, not `progressbar` — a level that may never move
  is a different thing from a task heading for completion, and screen readers
  say them differently.
- `MetricDelta` never puts meaning in colour alone. Rising churn is not good
  news, and a red triangle is not information.
- Every pointer gesture has a keyboard equivalent, or the component was not
  built. One candidate was dropped for failing exactly that test.

---

## Requirements

React 19 · TypeScript · Tailwind CSS v4

---

## Install

```bash
# The CLI — writes components into your project as source
npx @dowel-ui/cli init

# Or import from the package
npm install @dowel-ui/react
```

```tsx
import { Button } from "@dowel-ui/react";

export function Save() {
  return <Button variant="primary">Save changes</Button>;
}
```

---

<div align="center">

[**Read the docs →**](https://dowel-eight.vercel.app)

MIT licensed

</div>
