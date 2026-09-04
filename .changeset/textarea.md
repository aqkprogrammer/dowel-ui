---
"@dowel-ui/react": minor
---

Add `textarea`.

Twenty-two form components and no multi-line field; the only textarea in the
library was buried inside `ai-prompt-input`.

Sizes, optional auto-resize up to `maxRows`, and vertical-only resizing by
default — the browser default is `both`, and a field dragged wider than its
container is a layout broken by a control meant only to be made taller.

The character count is the part worth explaining. Wired as a live region it
announces on every keystroke, so a screen reader reads "one hundred and
forty-one characters remaining" between every letter. Here it is silent while
there is room and goes live only once the limit is close, which is the point at
which it is information rather than chatter. It states the remainder in words
rather than as `141/200`, which is read aloud as two unlabelled numbers, and
says how far _over_ rather than showing a negative.
