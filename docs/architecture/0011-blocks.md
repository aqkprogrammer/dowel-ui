# 11. Blocks

- **Status:** Accepted
- **Date:** 2026-09-01
- **Phase:** 8

## Context

Blocks are whole page sections — a sign-in form, a settings page, a chat
surface — assembled from the components. They are the fastest way to judge
whether a component library actually composes, because a block that needs a
component to be worked around is a component with a design problem.

## They are registry entries, not a separate product

A block is a registry item with `kind: "block"`, installed under its own
`blocks` alias. That reuses everything already built: metadata validated
against real imports, transitive dependency resolution, content hashes, alias
rewriting, generated documentation pages, and previews that are the Storybook
stories.

`add login` installs the block and the seven components it is assembled from.
`add ai-chat` resolves eleven, and reaches `spinner` — which nothing in the
block imports directly, only through `button`.

Two rules the integrity test now enforces:

- Components and blocks live in separate barrels, and each entry declares which
  it is.
- **A component may not depend on a block.** Blocks are assembled from
  components; the reverse would make a component drag a whole page section into
  a project that only wanted a button.

The `blocks` alias is optional in `components.json` and falls back to
`<components>/blocks`, so a config written before blocks existed still installs
one rather than failing on a missing key.

## Composition found real defects

This is the point of building blocks, and it paid out immediately. Every one of
these is a bug the component tests could not have caught, because each only
appears when components are put together.

**`CardTitle` could not be re-levelled.** It renders an `h3`, which is right
under an `h2` and wrong directly under an `h1`. Both the dashboard and settings
blocks failed the heading-order check. `CardTitle` now takes `asChild`, so the
page can set the level it actually needs — and a stat's _value_ stopped being a
heading at all, because a number is data and putting it in the outline is
noise.

**A checkbox inside a `FormField` had no accessible name.** The block labelled
it with a hard-coded `htmlFor`, but `FormField` generates the control's id, so
the label pointed at nothing. Using `FormLabel` — which exists precisely for
this — fixed it. A good demonstration of why the form wiring is worth having,
found by getting it wrong.

**An action column had an empty `<th>`.** A header cell with no text is a column
a screen reader cannot name. It now carries a visually hidden "Actions".

## Accessibility decisions specific to blocks

Components make components accessible; blocks have to make _situations_
accessible. The recurring theme is announcing changes the user did not ask for.

- **Filtering announces its result count.** Typing in the admin filter silently
  replaces the table. The count is a polite live region, and the filter has a
  real label rather than only a placeholder — which vanishes the moment anyone
  types, taking the field's name with it.
- **Switching billing period announces itself.** It rewrites every price on the
  page at once, which is a large change nobody requested out loud.
- **The reset confirmation does not reveal whether the account exists.**
  Confirming it would turn the form into an account enumeration oracle, and the
  neutral wording covers both cases without lying.
- **Destructive confirmation names what is destroyed** and requires typing the
  account's email, so the button cannot be reached by muscle memory. "Are you
  sure?" tells nobody anything they did not already know.
- **Trends are stated in words.** "up 12.4%", not a coloured arrow — and whether
  a rise is good is configurable, because churn going up is not.
- **Per-row action buttons are named after their row.** Four identical "Actions"
  buttons say nothing about which row you are on.
- **Switches have no Save button.** A switch that needs saving is a broken
  promise; anything staged belongs in a form instead.

## Scope

Eight blocks: login, sign-up, forgot-password, dashboard, admin users, settings,
pricing and AI chat. They cover authentication, application, marketing and AI
surfaces, which is enough to exercise the component set from every direction.

They are starting points, not black boxes. Each documentation page lists every
component the block is assembled from and links to it, because the value is in
being able to take it apart.

## Not included

- **Reset-password and two-factor forms.** Both are mostly token handling, which
  belongs to the application, and neither would exercise anything new.
- **Marketing hero, testimonials, FAQ, footer.** Layout with little behaviour;
  worth adding, but they would not have found any defects.
