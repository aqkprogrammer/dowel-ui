# 16. Doctor, audit, and the verification standard

- **Status:** Accepted
- **Date:** 2026-10-06
- **Phase:** Roadmap phase 3

## Context

Everything the CLI did ended at the install. Whether a project stays
consistent with the design system afterwards — and whether its setup still
works — was left to the project. ADR 12's audits check the library itself and
are hard-wired to this repository's paths, so they say nothing about the code
people write with it.

## `doctor` is a checklist, not a score

A score of 91/100 invites the question of what the other nine points were,
and of who decided a missing token is worth three points and a stale agent doc
one. A checklist answers that before it is asked: each line is one check, its
result, and what to do. Nothing is weighted, so there is nothing to argue
about.

Three outcomes are distinguished:

- **fail** — the project will not build or will not install correctly: a
  missing file, a missing npm package, an alias that no longer resolves.
  `doctor` exits non-zero.
- **warn** — it works, but something is out of date or missing that the
  person probably wants: updates available, stale agent docs, a Pro item with
  no licence on this machine.
- **skip** — the check needs the network and `--offline` was given.

Local edits to installed files are reported as a count inside a passing check,
not as a warning. Editing them is the point of owning the source.

## `audit` flags only what is wrong whenever it appears

An audit that flags what might be fine teaches people to stop reading it. So
each rule matches a pattern that is wrong in every context it can appear in:

| Rule                 | Matches                                                        | Does not match                     |
| -------------------- | -------------------------------------------------------------- | ---------------------------------- |
| `palette-colour`     | `bg-slate-900`, `text-blue-500`                                | `bg-primary`                       |
| `arbitrary-colour`   | `bg-[#1e293b]`, `text-[rgb(…)]`                                | `const BRAND = "#…"`               |
| `inline-colour`      | `style={{ color: "#f00" }}`                                    | colour constants                   |
| `off-scale`          | `p-[13px]`, `rounded-[7px]`, `text-[15px]`                     | `w-[640px]` (a layout constraint)  |
| `physical-direction` | `ml-4`, `text-left`, `border-l`                                | `left-1/2 -translate-x-1/2`        |
| `native-element`     | `<button>`, `<input>`, `<dialog>` with the component installed | the same, when it is not installed |

The component source in this repository is held to a stricter colour rule —
any literal colour at all fails `audit:tokens` — because a component has no
business owning a colour. Application code sometimes does: a chart palette, a
brand mark.

`native-element` only fires when the project has the Dowel component that
replaces the element. Telling someone to use a `<Select>` they have not
installed is a recommendation; telling them their `<select>` bypasses the one
they have is a finding.

The files `add` wrote are skipped by default. They are this library's code,
audited where they are published; reporting them would ask people to fix code
they installed rather than code they wrote.

## One set of rules

The rules live in `@dowel-ui/registry` (`src/rules`), which the CLI already
bundles. `audit:rtl` and `audit:tokens` import the same functions, so a
component is held to exactly the rule a project using it is told about.

Moving them found a bug in the old RTL audit. To exempt utilities like
`bg-left-top`, it skipped any match with `bg-`, `to-` or similar anywhere in
the twelve characters before it, so `bg-muted ml-2` passed. No component had
such a bug hiding behind it. The check now looks only at the text joined to
the match.

## `--fix` only where there is one answer

`physical-direction` is the only rule with a mechanical fix: `ml-4` is
`ms-4` in every context. Every other finding needs a person: which token a
hardcoded blue should become depends on what the blue meant. `--fix` lists
the files it will rewrite and asks first, unless `--yes` is given, and
`audit` then reports what is left.

## `diff`

`update` reported that a file had changed upstream and offered to replace
it. For a file the person had edited, that was a choice between losing their
change and never getting the fix. `diff` shows the upstream change as a
unified diff, so it can be read first, or carried across by hand.

## The verification standard

`/quality` already measured every component against ten checks. The genome
(roadmap phase 2) moved those checks into the registry item, so they are now
the standard, published with the component, rather than a page on the site.

| Check               | Evidence                                       | Applies to                |
| ------------------- | ---------------------------------------------- | ------------------------- |
| Tested              | a test file exists                             | everything                |
| axe assertion       | the tests call `expectNoA11yViolations`        | everything with tests     |
| Keyboard tested     | the tests send keys                            | anything focusable        |
| Storybook stories   | a stories file exists                          | everything                |
| Accessibility notes | `a11y` is written in `meta.ts`                 | everything                |
| Semantic tokens     | no palette class or literal colour             | everything                |
| Motion from tokens  | no literal `duration-*`                        | anything that transitions |
| `className` merged  | `className` goes through `cn()`                | anything taking a class   |
| Visible focus       | interactive elements use the shared focus ring | anything interactive      |
| No fixed widths     | no arbitrary width or height over 40px         | everything                |

Repository-wide, CI adds what one file cannot show: contrast across every
preset (`audit:contrast`), reduced motion (`audit:motion`), right-to-left
(`audit:rtl`), and that an installed copy still resolves its imports
(`audit:installed-imports`).

These are static checks and say so. They prove that a test with an axe
assertion exists, not that the test is good. A "Verified" mark for
third-party components would need the browser checks in roadmap phase 6 —
real-browser axe with contrast enabled, and visual regression — before it
meant enough to be worth giving out.
