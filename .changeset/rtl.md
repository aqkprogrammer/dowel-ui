---
"@dowel-ui/react": minor
---

Make the component set work right-to-left, and add an audit so it stays that way.

96 physical properties across 32 files — `ml-`, `pl-`, `left-`, `text-right` —
each with an exact logical equivalent. A component built that way inverts wrongly
in Arabic, Hebrew, Persian and Urdu: the icon sits on the wrong side of the
label, the indent runs the wrong way, the caret points out of the field instead
of into it. Nothing about it looks broken in English, which is why it survived
review. The library audits 322 contrast pairs across every preset and then
shipped a set that could not be read right-to-left.

`pnpm audit:rtl` fails on any physical property that has a logical form, and
runs in CI with the rest. A style that must follow the _visual_ side whatever the
language has to say why in a comment — asserting it is not enough, because "this
one is fine" with no reason is how a rule erodes.

Two things the audit knows about, both found by converting and then checking:

- **Centring is not a direction.** `left-1/2` with `-translate-x-1/2` is
  symmetric and already correct both ways; `start-1/2` flips while `translate-x`
  does not, landing the element half a width off the middle. Matched as a pair,
  so `left-1/2` without the translate is still a finding.
- **Sheet's `left` and `right` sides stay physical.** The variant is _named_
  `left`, and a sheet asked for on the left that opens on the right in Arabic is
  an API telling a lie. The logical version is a `start`/`end` side, which is a
  rename rather than a restyle.

**New: `direction`.** Logical CSS follows `dir` on its own; the primitives
underneath do not — they read direction from React context and assume
left-to-right without a provider. The result was a page that mirrored everywhere
except its menus, selects and sliders, which is worse than not mirroring at all
because it looks deliberate. An RTL application needs both `dir` on the document
and `DirectionProvider` around the tree.
