---
"@dowel-ui/react": minor
---

Add the AI layer: Conversation, Message, Response, Prompt Input, Tool Call,
Reasoning, Sources, Model Selector, Token Usage, Agent Status and Code Block.
No new dependencies.

The transcript is deliberately not a live region — announcing streamed text
token by token is unusable with a screen reader. State is announced through a
separate status region instead, and the components carry tests asserting the
absence of `aria-live` so the decision is not quietly reversed later.

The composer does not send while an IME composition is active, which otherwise
truncates Japanese, Chinese and Korean input mid-word.

`Message` takes `from` rather than `role`, since a prop shadowing the global
`role` attribute trips every consumer's accessibility linter.

`SelectItem` gains an optional `label` prop, so a rich option can show a short
label in the trigger while keeping its description in the list.
