# 9. The AI layer

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 6

## Context

Eleven components for conversational and agentic interfaces. Unlike every phase
before it, there is no established pattern library to work from — which means
the accessibility mistakes in this category are not yet anybody's convention,
and are being repeated everywhere.

**Zero new dependencies.** Everything here is built on the primitives and
components already in the library.

## The decision this phase is really about

**A streaming transcript must not be a live region.**

The obvious implementation makes the message list `role="log"` or
`aria-live="polite"` so new content is announced. Under streaming this produces
an announcement per token: a screen reader is interrupted continuously, the
already-read text is re-announced as the node mutates, and the interface becomes
unusable. It is the most common accessibility failure in chat UIs, and it is
made by teams who are trying to do the right thing.

So:

- **`ConversationMessages` is an ordinary ordered list.** Order is meaning here,
  and list semantics give position and count while the reader moves at their own
  pace.
- **`ConversationStatus` is a separate polite live region for _state_** —
  "generating response", "response complete". Never content.
- **`Response` has no live region at all**, and its streaming caret is
  `aria-hidden`.

Both components carry tests asserting the _absence_ of `aria-live` and
`role="log"`, because this is the kind of decision a later change quietly
reverses with the best of intentions.

## Live regions have to exist before they matter

`PromptInputCounter` shows the same principle from the other side. The naive
version switches `aria-live` on once the count approaches the limit — but a
region only announces changes that happen _while_ it is live, so switching it on
at the moment the content changes misses the very update worth hearing.

The region is therefore live from the start and simply empty until the limit is
close. That also keeps ordinary typing silent, which was the original goal.

The first attempt did this with `useEffect` + `setState`, which the React lint
rule correctly rejected as derived state — and which was also wrong for the
reason above.

## Send on Enter, except during IME composition

`PromptInputTextarea` checks `event.nativeEvent.isComposing` before submitting.

For Japanese, Chinese and Korean input, Enter confirms the candidate an IME is
offering — it is part of typing a word, not a request to send. Without the
check, a composer sends a truncated fragment mid-word every time. This is
invisible to anyone testing in English, and it is broken in a large share of
shipped chat interfaces.

## Naming: `from`, not `role`

`Message` originally took `role="user" | "assistant"`, matching the vocabulary
every model API uses. The accessibility linter flagged every usage, and it was
right to: `role` is a global HTML attribute, and a component prop that shadows
it is indistinguishable from the real thing to static analysis.

The consequence is not ours to absorb — **every consumer's linter would flag
ordinary usage of the component.** Renamed to `from`, which also leaves the real
`role` attribute available for anyone who needs to override the semantics. This
is the same rule that made Input's size prop `inputSize`; I broke my own
convention and the tooling caught it.

## Smaller decisions worth keeping

- **Status is always a word.** `Tool` and `AgentStatus` state their condition in
  text, never by colour alone. These states matter most when something has
  failed — exactly when a colour-only signal fails the people who most need it.
- **Agent announcements are off by default.** Six agents each narrating their
  transitions turns a dashboard into noise; enable it for the one being watched.
- **Tool calls and reasoning are collapsed.** They are provenance, not the
  answer. Giving them equal weight buries the answer for everyone.
- **Citations carry their title in the accessible name.** The visible marker is
  a bare number, which conveys nothing; a marker with no destination renders as
  text rather than as a link that goes nowhere.
- **Token usage puts the numbers first** and hides the bar, which only restates
  them. Running out of context is a cliff, not a slope.
- **Payload and code blocks are focusable named regions**, because they scroll
  and an unfocusable scroll box is unreachable by keyboard.
- **Copying announces success _and_ failure.** A clipboard write can be refused
  outright; a tick that only appears visually tells a screen reader user
  nothing.

## What is deliberately not here

- **Markdown rendering.** A renderer is a dependency, a security decision about
  raw HTML, and a styling surface all at once. `Response` accepts rendered
  markup as children and styles it.
- **Syntax highlighting.** Same reasoning. `CodeBlock` takes pre-highlighted
  markup, plus a `code` prop for the clipboard — reading text back out of
  highlighted DOM loses whitespace in ways that break pasted code.
- **File attachment and voice input.** Both are more upload and permission
  plumbing than UI, and doing them properly deserves their own pass.

## A defect this phase surfaced elsewhere

`ModelSelector` showed each model's description in the trigger as well as the
list. The cause was in `Select`: the primitive clones an item's text into the
trigger, so a rich option drags all of it up there.

Fixed by giving `SelectItem` an optional `label` — what the trigger shows —
separate from its children. That is a real improvement to Select for any rich
option, found only because something was built on top of it.
