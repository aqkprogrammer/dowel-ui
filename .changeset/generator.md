---
"@dowel-ui/registry": minor
"@dowel-ui/mcp": minor
"@dowel-ui/docs": minor
---

Generate a screen from a description, grounded in the registry.

`planUi` resolves a prompt against the catalogue and returns the blocks and
components that build it, each with the reason it was chosen. `renderPlan` emits
a starting file; `renderBrief` emits a brief to paste into a coding agent.
Surfaced at `/generate` on the site and as the `plan_ui` MCP tool.

The point is not writing JSX — it is not inventing. A model asked for a billing
page produces `<PricingTable>` and `<InvoiceList>` and a `variant="subtle"` that
was never implemented, and the result reads perfectly and compiles nowhere.
Everything here is drawn from what the registry returned, so it cannot name a
component that is not installable.

It does not guess at props. The registry publishes what a component is and what
it depends on, not the shape of its arguments, so the output stops at the
composition and points at the page where the props are documented — a plausible
invented prop is worse than an obvious gap.

Two things the matcher does deliberately: a curated synonym table bridges what
people type to what items are called ("sign in" → `login`), and the words it
covers are then withheld from generic matching, so "plan" on a billing page does
not also drag in `ai-agent-plan`. The preference for blocks orders real matches
rather than lifting a coincidental one over the bar.

`@dowel-ui/registry/generate` is a new browser-safe entry — the package root
reads the filesystem, and importing it in a client component pulls `node:fs`
into the bundle.
