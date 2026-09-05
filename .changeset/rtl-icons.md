---
"@dowel-ui/react": patch
---

Mirror the icons that point along the reading direction, and audit for it.

The class-level RTL pass made the layout follow `dir`, and stopped there. Logical
CSS mirrors the box an icon sits in, not the glyph inside it — so a page could
invert perfectly and still have a "next" chevron pointing back the way you came.
Breadcrumb's separator, Pagination's and DataTable's arrows, and the submenu
indicator in DropdownMenu all pointed the wrong way in Arabic.

`mirrorForDirection` in `@/lib/styles` flips them. Only glyphs whose meaning is
directional: a chevron pointing _down_ to open a select means down in every
language, and a tick is not sided at all.

`audit:rtl` gained an `icon-direction` check that fails on a known directional
path rendered without the mirror. The glyphs are listed by their exact path data
rather than detected — "is this directional?" is not a question a regular
expression can answer, and a heuristic would either flip the tick in a checkbox
or miss a chevron drawn a pixel differently. A new sideways icon gets added to
the list, and adding it is the moment to decide whether it should mirror.

**Toast positions are physical again.** The conversion had turned
`position="bottom-right"` into `end-0`, so it rendered bottom-_left_ in RTL —
the same lie as a Sheet asked for on the left opening on the right, and worse,
because the slide-in comes from the right edge and the toast would fly across
the screen to reach the other side.

Also documents right-to-left on the accessibility page, including what it does
not claim: nothing here has been reviewed by a reader of a right-to-left
language. The audit checks that nothing is styled or drawn against the
direction, which is necessary and not sufficient.
