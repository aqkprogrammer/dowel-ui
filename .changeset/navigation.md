---
"@dowel-ui/react": minor
"create-dowel-app": patch
---

Add `sidebar`, `breadcrumb` and `collapsible`.

The library had three navigation components — tabs, command, pagination — and
nothing for an application's own navigation. That is why `create-dowel-app`'s
app-shell template hand-rolled a nav: there wasn't one to use. It now uses these,
which is the point of noticing.

**`sidebar`** has two states, not one. On a wide screen it collapses to a rail
and stays in the page; on a narrow one it is an overlay, which needs a focus trap
and an Escape key and is therefore a Sheet rather than a div with a transform —
build one behaviour and hide it at a breakpoint and the page behind stays
reachable by Tab while the menu covers it. The collapsed rail is where these
usually fail: hiding the label leaves a control whose only content is an icon,
and an icon has no accessible name, so a collapsed sidebar becomes a column of
links all announced as "link". Labels are visually hidden, not removed. The
navigation landmark must be named, because a page has several. The active entry
carries `aria-current="page"`, and the trigger says what pressing it will do
rather than what the state currently is.

**`breadcrumb`**: the current page is a span with `aria-current="page"`, not a
link — a link to the page you are already on does nothing, and in a list of links
it is indistinguishable from the ones that go somewhere. Separators are hidden,
because "Home slash Projects slash Settings" is the design's punctuation leaking
into the content. The ellipsis is the exception and is named: it is content,
saying levels have been left out.

**`collapsible`**: one region, one trigger, no set semantics. An Accordion of a
single item gives that item a heading role and a position in a list of one,
neither of which is true.
