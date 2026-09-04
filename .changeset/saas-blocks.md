---
"@dowel-ui/react": minor
---

Five new blocks, taking the set from 8 to 13.

**`billing`** — plan, metered usage, payment method and invoice history. Every
usage meter states where it stands in words ("8 of 10 seats used, 2 left", or
how far over it is), and the bar is hidden from the accessibility tree so the
same fact is not announced twice. Each invoice download is named after its
invoice rather than being one of ten identical "Download" links. A card's last
four digits are spoken as digits, not as a four-figure number.

**`analytics`** — metrics, a series over time, and the breakdown behind it. The
bars are declared as one image with a one-sentence summary of the shape, rather
than forty separately labelled elements; the exact numbers are a real table,
collapsed for everyone and revealed for everyone. The range selector is a
select, not tabs — tabs promise panels, and a range selector has none.

**`onboarding`** — a setup checklist. Every step states its state in a word,
because a green tick announces nothing. Blocked is a distinct state from
not-started and says why. The current step carries `aria-current`.

**`ai-dashboard`** — tokens, spend, failure rate, a breakdown by model and the
runs still going. Spend and failure rate are `lower-is-better`, so a rising bill
is not painted green. Totals are a real `tfoot`, not a body row that looks like
one. Statuses in the list do not announce their own changes.

**`agent-console`** — one run, watched: the plan, the approval it is blocked on,
and the ledger of what it has already done. Whatever is blocking the run renders
first, above the plan and the history.
