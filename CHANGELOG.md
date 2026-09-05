# Changelog

This is the changelog. Releases are cut by hand and recorded here; there are no
per-package changelogs, whatever an earlier version of this line claimed.

## Unreleased

### Licensing: the right endpoint, and a way to check it

Setting Polar up for real found two bugs in the adapter that shipped in 0.7.0,
both of which would only have surfaced as a customer's failed install.

- **It called the wrong endpoint.** `/v1/customer-portal/license-keys/validate`
  takes no authentication, because it exists for desktop and mobile clients
  that cannot hold a secret, and it is rate-limited to a few requests a second
  for that reason. Validation from a server belongs at
  `/v1/license-keys/validate`, authenticated with an organisation token, which
  is what it now uses.
- **`organization_id` is required** by that endpoint, and the config treated it
  as optional. A deployment with a token and no organisation id would have
  failed every check with a malformed-request error, reported to the customer
  as a problem with their key. Both variables are now required together, and a
  half-configured deployment reads as unconfigured — which is at least true.

A third change is about who gets blamed. A 401 or 403 from Polar is about
*our* credentials — a token missing the `license_keys` scopes, or rotated —
and the adapter previously answered "that licence key was not recognised",
sending a paying customer to support over our misconfiguration. Those now fail
as a provider error, so the CLI reports a service problem. Only a 404 is
treated as a bad key.

`GET /r/license/health` reports which provider is active and whether keys can
be validated, naming the licensed items and never a credential — not even a
masked one, since confirming which token is in use is what an attacker wants.
Configuring a paywall otherwise has no feedback short of buying a licence.

## 0.7.0

The release that puts something up for sale, and fixes the bug that finding
out how to sell it uncovered.

Nothing that was free has stopped being free. The registry build now has a
test that names every block which shipped without a licence and fails the
release if any of them changes access; the components and the two `init`
items are covered by the same test.

### The Pro catalogue

Four blocks, all new, all `access: "pro"`. They are whole application surfaces
rather than page sections, and each one found something:

- **crm** — a pipeline with its deals. Open value by stage as one bar with the
  figures listed beside it, a filterable, sortable deal table, the win rate and
  the sales cycle — the last declared lower-is-better, so a slowing pipeline is
  not painted green.
- **command-center** — service health worst-first, incidents by severity with
  the resolved ones after, capacity meters, a filterable log stream, and a ⌘K
  palette of operator actions. The overall status is one sentence computed from
  the worst service, and it is not a live region: a page refreshed by polling
  that re-announces itself on every poll is a page nobody can work beside.
- **ai-workspace** — conversations down one side, the transcript in the middle
  with reasoning, tool calls and sources, and the model's context on the other:
  window usage, attachments, a structured result filling in. Three named
  landmarks, so each can be jumped to and skipped.
- **admin-dashboard** — the shell an admin area shares (navigation, breadcrumb,
  account menu) with `children` for your own pages, and an overview that puts
  what needs attention first and keeps it the only loud part of the page.

What makes them Pro is where the source lives. The registry lists them —
title, description, what they are built from, file count — and serves their
bodies only to a licence holder; the docs site renders their previews from the
same stories the tests run and withholds the code; the MCP server describes
them from the index and says how to get the rest instead of reporting a 404.
`packages/ui` no longer ships `src/blocks` in its npm tarball, for every block:
blocks were never importable from the package (ADR 0011), and a licensed
block's source in a public tarball would have been the paywall gone.

The quality page measures Pro blocks against the same rules as free ones, and
the counts audit reads the index rather than the directory, since a licensed
item is listed but not written.

### Sidebar: the overlay is mounted only on a narrow screen

Composing the AI workspace found it. The mobile sheet was mounted whenever the
rail was open and hidden with `md:hidden`, and a modal dialog that CSS hides is
still modal: on every desktop, whenever the sidebar was open — its default —
the rest of the page was `aria-hidden`, focus was trapped in an element nothing
could reach, and `pointer-events` was off on the body. The live docs had it.

The sheet now mounts only below the breakpoint, watched with `matchMedia`, and
has its own open state, closed to begin with: "expanded by default" is a fact
about the rail, and an overlay that covers the page on first load is a menu
nobody asked for. Labels inside the overlay are always visible, whatever the
rail's collapsed state. The trigger says "Open navigation" or "Close
navigation" there, and drops its `aria-controls`, which pointed at an element
CSS had hidden.

### The site

- **Pricing.** Free, Pro and Teams & Enterprise, with the free tier's promise
  stated before anything else. The Pro button goes to the checkout when
  `PRO_CHECKOUT_URL` is set and says "opening soon" with the repository to watch
  when it is not — a pricing page with a dead Buy button is a page that tells
  everyone the product is not real. Teams is described as it is: a self-hosted
  private registry today, free, with the hosted version and SSO named as
  planned rather than sold.
- **Private registries** — a guide to building and hosting one with
  `@dowel-ui/registry`, which the README had and the site did not.
- **By the numbers** on the front page: components, blocks, AI components and
  the average quality score from the registry and the audits, plus npm
  downloads and GitHub stars fetched at build and refreshed hourly. A figure
  that cannot be fetched is left out, never shown as zero. The version badge on
  the front page, which had said 0.1.0 since there was a front page, now reads
  the package version.
- Blocks and Pricing in the header; the two guides in the docs navigation; a
  footer with somewhere to go.

### Design tokens for Figma

`@dowel-ui/themes` gains `parseTokenCss`, `resolveReferences`, `toDesignTokens`
and friends: they read the same `tokens.css`, `base.css` and preset files the
components use, resolve every `var()` the way the cascade would, and write a
W3C design-tokens document — `core`, `light` and `dark` sets, colours as sRGB
hex converted with the same maths the contrast audit uses. The docs site
serves one file per shipped preset at `/figma/<preset>.tokens.json`, and the
Theme Studio downloads the same file for a preset built there, with the
radius ladder evaluated at the scale set on the page.

## 0.6.0

The largest release so far, and the one that turns a component library into
something you can build a product on: an agent surface, a playground, a theme
studio, per-component quality, five blocks, a scaffolder, licensing, private
registries and a grounded generator — plus two new published packages.

Everything here is additive. Nothing that was installable without a licence has
stopped being one, and no component's API changed.

### New packages

- **`@dowel-ui/mcp`** — a Model Context Protocol server over the registry.
  `search_components`, `get_component` (source on request), `get_guide`,
  `install_command` and `plan_ui`. An agent that has never heard of this library
  writes its own Button — a second one, with a different focus ring and
  hardcoded colours — and the hole it leaves is not noticed until someone tabs
  into it. A mistyped name is answered with the nearest real one rather than
  silence.

- **`create-dowel-app`** — `npx create-dowel-app my-app` asks what you are
  building and which theme, writes a Next.js app, and fetches the components.
  Three templates: `starter`, `saas` and `ai`.

  The templates carry application files and a list of registry names, not the
  components. The scaffolder runs the same CLI a user would, so a project created
  today is built from today's registry rather than from whatever was current when
  the template was written — and a template stays a dozen files instead of a
  hundred. The whole package publishes at 19 kB.

### New components

- **textarea** — twenty-two form components and no multi-line field; the only
  textarea in the library was buried inside `ai-prompt-input`. Sizes, optional
  auto-resize, and vertical-only resizing by default, because the browser default
  is `both` and a field dragged wider than its container is a layout broken by a
  control meant only to be made taller.

  The character count is the part worth explaining. Wired as a live region it
  announces on every keystroke, so a screen reader reads "one hundred and
  forty-one characters remaining" between every letter. Here it is silent while
  there is room and goes live only once the limit is close, which is the point at
  which it is information rather than chatter. It states the remainder in words
  rather than as `141/200`, which is read aloud as two unlabelled numbers, and
  says how far *over* rather than showing a negative.

- **sidebar** — the application's own navigation, and the reason it exists is
  that `create-dowel-app`'s app shell had been hand-rolling one. Two states, not
  one: on a wide screen it collapses to a rail and stays in the page; on a narrow
  one it is an overlay, which needs a focus trap and an Escape key and is
  therefore a Sheet rather than a div with a transform. Build one behaviour and
  hide it at a breakpoint and the page behind stays reachable by Tab while the
  menu covers it.

  The collapsed rail is where these usually fail. Hiding the label leaves a
  control whose only content is an icon, and an icon has no accessible name, so a
  collapsed sidebar becomes a column of links all announced as "link". Labels are
  visually hidden, not removed.

- **breadcrumb** — the current page is a span carrying `aria-current="page"`, not
  a link: a link to the page you are already on does nothing, and in a screen
  reader's list of links it is indistinguishable from the ones that go somewhere.
  Separators are hidden, because "Home slash Projects slash Settings" is the
  design's punctuation leaking into the content. The ellipsis is the exception
  and is named — unlike a separator it is content, saying levels have been left
  out.

- **collapsible** — one region, one trigger, no set semantics. An Accordion of a
  single item gives that item a heading role and a position in a list of one,
  neither of which is true.

- **direction** — tells the primitives which way the writing runs. See
  *Right to left* below.

### New blocks

Eight to thirteen.

- **billing** — plan, metered usage, payment method and invoice history. Every
  usage meter states where it stands in words — "8 of 10 seats used, 2 left", or
  how far over — and the bar is hidden from the accessibility tree so the same
  fact is not announced twice. Each invoice download is named after its invoice
  rather than being one of ten identical "Download" links, which is all a links
  list would show. A card's last four digits are spoken as digits, not as a
  four-figure number.

- **analytics** — the bars are declared as one image with a one-sentence summary
  of the shape, rather than forty separately labelled elements, which reads as
  noise instead of a shape. The exact numbers are a real table, collapsed for
  everyone and revealed for everyone from a control on the page, rather than a
  visually hidden copy only screen readers can reach — the hidden copy is the one
  that goes stale. The range selector is a select, not a tab set: tabs promise
  panels, and a range selector has none.

- **onboarding** — every step states its state in a word, because a green tick
  announces nothing and means nothing to a reader who cannot tell the colours
  apart. Blocked is a distinct state from not-started and says why.

- **ai-dashboard** — what the AI features cost and whether they worked. Spend and
  failure rate are declared lower-is-better, so a rising bill is not painted
  green, which is the mistake most usage dashboards make. The totals row is a
  real table footer rather than a last body row that looks like one.

- **agent-console** — one run, watched: the plan it is working from, the approval
  it is blocked on, and the ledger of what it has already done. Whatever is
  blocking the run renders first, because it is the only part of the page waiting
  on a person.

### Coding agents

`dowel agents` writes documentation for the agents working in a project — a
`.dowel/` reference set, a marked block in `AGENTS.md`, a Claude Code skill and a
Cursor rule — generated from the registry the project installs from and marking
what is already installed. `--check` reports staleness and exits non-zero for CI,
because a catalogue a release behind is worse than none: the agent trusts it.

The site serves `/llms.txt` and `/llms-full.txt`, generated at build time. One
generator feeds the CLI, the MCP server and the site, so they cannot disagree.

### Playground, Theme Studio, Quality and Generate

Four new surfaces on the site, each generated from something rather than written
alongside it.

- **Playground** — every control is derived: variant axes are read from each
  component's own `cva()` call through the TypeScript AST, the rest from the
  `argTypes` its stories already declare. A control cannot offer a value the
  component does not implement.

- **Theme Studio** — build a preset from one colour and see whether it passes
  WCAG AA before shipping it. The check is not a second implementation: `oklch`
  to sRGB and the WCAG ratio now live in `@dowel-ui/themes` and are re-exported
  to the audit that gates CI, so a colour the studio passes is one the build
  passes. The export is the same file format as `presets/*.css`.

- **Quality** — every component and block measured against the rules `audit:api`
  and `audit:tokens` already enforce, read from its own source and test file.
  Checks that do not apply are recorded as such and left out of the score, so the
  denominator means something. Currently 99% across 88 items, with 78 perfect and
  ten carrying one gap each — every one an interactive component tested by click
  but never by keyboard. The page exists to show that rather than round it away.

- **Generate** — describe a screen and get the components that build it, the
  install command, and a brief to paste into a coding agent. Resolved against the
  registry first, so it cannot name a component that is not installable — which is
  what asking a model directly gets you, complete with a `variant` nobody
  implemented. It does not guess at props: the registry publishes what a component
  is, not the shape of its arguments, and a plausible invented prop is worse than
  an obvious gap.

### Licensing

Entitlement metadata, CLI authentication and a gated registry path.

**No existing component is licensed, and none becomes licensed by this release.**
`access` defaults to `free`, a registry written before this parses as `free`, and
free is a promise: an item that has ever been installable without a licence must
not quietly stop being one.

The index lists everything including licensed items — that is the catalogue, and
an item nobody can see is an item nobody buys. What the public directory does not
contain is a licensed item's *body*: those never reach the directory a CDN serves,
because a paywall that can be stepped around by fetching the JSON is not a
paywall.

`login`, `logout` and `whoami`. The key is verified against the registry before it
is stored, so a bad key fails when it is pasted rather than days later during an
install. It is stored in the user's config directory at mode 0600 — never in the
project, because a key in `components.json` is a key in git — and `DOWEL_TOKEN`
overrides it for CI.

`POST /r/license` and `GET /r/pro/<name>` on the site. The licence is checked
*before* the name is looked up, so the paid catalogue cannot be enumerated by
probing 404s, and every response is `no-store, private`.

**It fails closed.** With no provider configured the registry refuses everything
and says why. Allowing by default would give the product away the first time a
deployment was misconfigured, silently, and for as long as nobody noticed. See
`RELEASING.md` for the environment it reads; there are no credentials in this
repository.

### Your own registry

`@dowel-ui/registry` can now build one, not only be read from. `extends` layers
your components on top of another registry, so one URL serves both and `add`
resolves across them. A local item replaces an upstream one of the same name and
the build reports which — overriding upstream's Button is a legitimate thing to
want and a catastrophic thing to do by accident.

Three things are refused at build time rather than left to fail in a consumer's
repository: a file an item names but that does not exist; an import written
against the *installed* path (`@/components/ui/badge`) instead of the authored one
(`@/components/badge`), which rewrites to a doubled segment resolving nowhere; and
a component importing a registry item it never declared.

### Right to left

The component set inverted wrongly in Arabic, Hebrew, Persian and Urdu — the icon
on the wrong side of the label, the indent running the wrong way — across 96
physical properties in 32 files. Nothing about it looked broken in English, which
is why it survived review, and the library audits 322 contrast pairs across every
preset while shipping a set that could not be read right-to-left.

All of them are logical now, and `pnpm audit:rtl` fails the build on any physical
property that has a logical form, and on any icon that points along the reading
direction without being mirrored. Logical CSS mirrors the box an icon sits in and
not the glyph inside it, so a page could invert perfectly and still have a "next"
chevron pointing back the way you came.

An RTL application needs two things: `dir` on the document, which the styling
follows, and the new **`DirectionProvider`** around the tree. The primitives read
direction from React context and assume left-to-right without it, which mirrors a
page everywhere except its menus, selects and sliders — worse than not mirroring
at all, because it looks deliberate.

Two things stay physical on purpose. `Sheet`'s `side="left"` and a toast's
`position="bottom-right"` are named after a side, and a control asked for on the
left that appears on the right is an API telling a lie. The logical versions are
`start`/`end` props, which would be a rename rather than a restyle.

This is not a claim that the components have been reviewed by a reader of a
right-to-left language. The audit checks that nothing is styled or drawn against
the direction, which is necessary and not sufficient.

### Fixed

- **Avatar, Badge and Card were absent from the documentation site**, from the
  components index and the sidebar both, with nothing reporting it.
  `CATEGORY_ORDER` did not name the `display` category and the grouping filtered
  to that list. Categories the curated order does not name are appended now
  rather than dropped.

- **Stories were ordered alphabetically rather than as written.** A module
  namespace object sorts its own keys, so `Object.keys` never returned source
  order and Button's page opened on "As Link". The order is recorded at build
  time, because it cannot be recovered at runtime.

- **34 stories were invisible**, including the `Default` example on 25 component
  pages. `asStory` required a `render` or `args`, which the canonical
  `export const Default: Story = {}` has neither of.

- **`add` did not install missing npm packages when the component files were
  already current.** They were computed after the "already up to date" early
  return, so anything added with `--skip-install` had its source in place and its
  dependencies absent, and the components could not resolve.

- **`audit:package` read a hardcoded list of packages**, so a new one was never
  audited and nothing said so. It discovers the workspace now.

### Requires

Node ≥ 20 and pnpm 11 for development, unchanged. `@dowel-ui/mcp` and
`create-dowel-app` both require Node ≥ 20 at runtime.

## 0.5.1

`@dowel-ui/cli` only. The other packages are unaffected and stay at 0.5.0, and
the registry the site serves is unchanged, so nothing needs redeploying.

### Fixed

- **`init` could not read a path alias from any Next.js project**, and had not
  been able to since the first release. The tsconfig comment stripper was a
  regex: the alias `"@/*"` contains `/*`, which it read as opening a block
  comment, and the first `*/` it then found was inside `"**/*.ts"` in the
  `include` array. Everything between went, `paths` with it, so the JSON no
  longer parsed and the failure was swallowed by the surrounding catch.

  Every stock Next.js tsconfig has both halves. Under `--yes` init refused
  outright while pointing at the block it had just deleted; interactively it
  asked for an alias it could already see, which is why four releases went by
  without anyone noticing. Comments are now stripped by a scanner that knows
  what a string is.

  `project.ts` had no tests, which is the real reason this shipped. It has 15
  now. Found by running the post-publish install test this file's sibling
  documents, against the published 0.5.0.

## 0.5.0

### New components

- **ai-extraction-review** — the check after extraction: the document on one
  side, what the model read out of it on the other, and a decision about every
  field. Invoice capture, KYC onboarding and claims intake all have this screen,
  each built from scratch, because a value that cannot be checked can only be
  trusted. Every extraction demo shows the filled object and stops; no component
  library ships the step after it.

  The link is the component. Each field carries where in the source it was read
  from — highlighted in the document as a `mark`, and quoted in text under the
  value, so a reviewer who cannot see the highlight still has the evidence and a
  sighted one has the comparison in view: "1 March 2026" beside "2026-03-01" is
  a normalisation, not an error, and only reads that way with both present. A
  value with no evidence is said outright, "the model supplied this without
  evidence", because that is the case the review exists to catch and the one a
  filled-object view renders identically to a good value. The running count
  says how many such fields there are before the reviewer starts.

  Evidence is a text offset, not a bounding box. A language model reads text and
  a text layer with offsets is what every OCR pipeline already yields; boxes
  over a rendered page need page rendering, zoom and geometry, and are a
  different component. Offsets from a model are wrong often enough that
  refusing to render on a bad one would blank the whole review, so a span past
  the end is clamped and an inverted one counts as no evidence, which is what it
  is. Overlapping spans — a total inside the line that contains it — cut into
  nested runs rather than two marks fighting over the same characters.

  Decisions are controlled and the component writes nothing. What comes back is
  richer than a form's values: accepted as proposed, corrected from what was
  proposed with the model's value kept beside the reviewer's, or rejected. An
  accepted value that is edited afterwards says "changed since it was accepted"
  and releases the button, because a record that silently kept the old decision
  would be a guess. Nothing is spliced into the source text for assistive
  technology — a document read aloud with field names inserted is not the
  document — and focus anywhere in a field brings its evidence into view without
  moving focus, so a keyboard user is shown the source rather than sent into it.
  Enter accepts, except while an IME is composing, for the same reason the
  prompt input checks.

  The model is pure and separately importable: `summarizeReview` answers "is
  this review finished" on the server from the decisions the client sent, rather
  than from a flag it sent alongside them.

- **ai-suggested-value** — an AI-proposed value for any form control, offered
  beside it rather than written into it. Autofill is the most common shape AI
  takes inside ordinary software — enrich this contact, fill this form from the
  upload — and nearly every implementation writes the value into the field as
  if the person had typed it. A plausible, wrong value then rides through on
  their own Submit, and once submitted the record cannot tell a value the model
  supplied from one a human typed, which is the fact an audit later needs.

  So the suggestion stays pending until accepted, and acceptance is reported
  rather than performed: the component hands the value to `onAccept` and never
  touches the control. That is what lets it wrap a select, a date or a number
  where ghost text can only complete a string — `ai-inline-completion` does
  text, this does the rest. Afterwards the field says it was filled by AI,
  says if it was edited since, and Undo puts back what was there. Inside a
  `FormControl` the id and ARIA it passes down are forwarded to the control,
  and an existing `aria-describedby` is merged rather than replaced.

  The suggestion is the control's description, so a reader who lands on the
  field hears it. Announcing on arrival is opt-in, because a form filling
  twenty fields at once would narrate all twenty; when it is on, the row is
  already in the accessibility tree, since a live region that appears at the
  same moment as its content announces nothing.

  Deliberately no "accept all". A button that takes every suggestion at once is
  the review deleting itself.

- **cron-editor** — a schedule as a cron expression, with the sentence beside
  it that makes `0 9 * * 1` readable and the next five runs in a named zone.
  GitHub Actions, Vercel, Airflow, Sentry and every admin panel with a
  "run this nightly" setting draw this control by hand; the packages that
  exist are bound to Ant Design or ship their own stylesheet, the problem the
  diff viewer already solved once.

  The dialect is POSIX five-field cron — what crontab, GitHub Actions, Vercel,
  Kubernetes and Airflow read — with the `@daily` shortcuts. Not Quartz: no
  seconds field and no `L`, `W` or `#`, because an expression this editor
  produces has to run where it is pasted. The model is pure and separately
  importable, so `nextRuns` can compute the next run on the server from the
  same expression the editor produced.

  Two things every reimplementation gets wrong, both tested. When day of month
  and day of week are both restricted, cron fires when either matches, and the
  sentence says "or" because "and" is what readers assume. And a wall-clock
  time that does not exist on the day the clocks go forward is skipped rather
  than run at a made-up instant, while an ambiguous one in autumn runs once,
  at its first occurrence.

  Next runs are headed by the zone they are in, since a time with no zone is
  the classic scheduling mistake, and a schedule that never runs — the 30th of
  February — says so rather than showing an empty list. Days 29 to 31 say in
  text that shorter months skip them. An invalid expression says why and is
  not applied.

  Both files are within the per-file budget, but together the entry is the
  first past the audit's sprawl line, at 38 kB against 36. The line is a
  report rather than a gate and asks to be argued with: the model is half the
  entry and is the part worth owning, and the builder cannot lose a control
  without losing a frequency. Left as it is, and noted so nobody has to
  wonder whether it was seen.

- **secret-field** — an API key, token or signing secret in the three states
  it actually has: shown once at creation and never again; hidden but
  revealable, for a secret the server can show again; and gone, where a prefix
  and the last four remain and the only thing left to do is regenerate.
  Stripe, GitHub, OpenAI and Vercel each draw this by hand. The nearest thing
  any library ships is a password input, which is for entering a secret you
  know, not for handling one you have just been given.

  "Shown once" is a first-class state rather than a toast, because it is the
  one that costs people money: the key is on screen, the tab closes, and the
  next hour goes on regenerating it and updating every client. The field says
  it in a sentence beside the value, and the way out is a button that says
  what it means — "I have saved it" — rather than the value vanishing on
  navigation. While hidden, the secret is not in the DOM: the preview is what
  renders, so a screenshot or an extension sees what the server itself keeps.
  Reveals are reported, since an audit log of who looked is the reason the
  hidden state exists, and copy works while hidden because a key is for
  pasting, not reading.

  Copying is announced, and so is failure, with what to do instead. A missing
  clipboard API fails the same way as a refused one rather than throwing out
  of the click. Regenerating is confirmed inline with the consequence stated,
  because it revokes the current key.

- **confirm-typed** — type the name to confirm. The GitHub pattern for the
  action that cannot be undone, copied by every product and absent from every
  component library, and usually built wrong in the one place it matters:
  what happens when the text does not match. The common version disables the
  button and says nothing, so a keyboard or screen reader user presses it, or
  Enter, and nothing happens at all.

  Here a mismatch is said. The button stays reachable, dimmed rather than
  disabled, and pressing it or Enter before the text matches announces what
  was expected, marks the field invalid and returns focus to it. The match is
  announced once, on the transition, naming the action that became available.
  Typing itself stays silent, because a verdict on every keystroke is noise.
  Surrounding whitespace never decides it, since a reader cannot see it to
  know why they failed.

  Pasting is allowed, deliberately. Blocking it is a popular piece of friction
  that punishes exactly the people who cannot type a long name easily — switch
  users, voice users, anyone with a tremor — and stops nobody who can
  select-all and copy. The point is that the name passed through the reader's
  attention, not their keyboard.

- **permission-matrix** — roles across, permissions down, a checkbox at every
  crossing. Every admin panel has one and every admin panel builds it, because
  the hard part is not the checkboxes: a role inherits from another, so a box
  is ticked without anyone having ticked it; an Owner has everything and none
  of it can be unticked; a section of eight permissions wants one control; and
  sixty checkboxes are sixty tab stops unless something is done about it.

  Something is done about it. This is a grid in the WAI-ARIA sense — one tab
  stop, arrow keys between cells, Home and End along a row — which is the
  right call here and was the wrong one for the diff viewer: a diff is read,
  a matrix is operated. Every checkbox is named by both coordinates, so a
  reader arriving by arrow key knows where they are without re-reading the
  headers.

  An inherited grant is a checked box that cannot be unchecked here, with the
  role it came from beside it and in the box's description. A disabled control
  would be the obvious rendering, and it would take the box out of the tab
  order and the arrow-key path, so a keyboard user would step over the one
  cell whose state needs explaining. Changes are reported, never applied, and
  a group toggle reports every permission it touched in one call — only the
  ones that can change, since inherited grants stay either way — so an
  application saves one change rather than eight.

  The model is pure and exported: a server can answer "may this role do this"
  from the same grants the matrix edits, with the same rule for inheritance,
  which is resolved transitively and survives a cycle.

- **dns-record** — "add this record at your DNS provider". Vercel, Resend,
  Cloudflare, Postmark and every product that verifies a domain or routes its
  mail draws this card by hand, and they all learn the same three things the
  hard way.

  The parts are copied separately, because a provider's form has a Name
  field, a Type field and a Value field, and one button that copies the whole
  line copies something nobody can paste anywhere. The Name field is a trap:
  some providers want the host relative to the zone, some want the full name,
  and some take the relative form and append the zone themselves, so a full
  name pasted in becomes `_dmarc.acme.com.acme.com` and the check fails for a
  reason nobody can see. The host is shown both ways, with the sentence that
  says which to use, and `dnsHostForms` is exported so a backend that stores
  the full name and one that stores the relative host both render the same
  card.

  A failed check says what was found. "Not verified" sends people back to
  stare at a record that is correct and has not propagated; "found v=spf1
  -all" sends them to the typo. Nothing found is said as nothing found, with
  how long that can take, because it is not the same as wrong. The status is
  a live region so the answer to a check arrives where it was asked for, and
  copy results are announced separately so they never replace a check result
  mid-sentence.

- **sync-status** — "offline, 3 changes will save when you're back". Linear,
  Notion, Figma and Google Docs each built it, and nothing in a component
  library touches network state at all. It is small, and it is the difference
  between an app that loses work and one that says it is holding it.

  `navigator.onLine` is believed in one direction only. False is reliable;
  true means there is an interface, not that the server is reachable, so an
  application's own failed request is the real signal and outranks it. The
  hook is exported so the rest of an app shares the same reading, and the
  server render assumes online, since a page with no interface to report has
  no business saying offline.

  Announcements are for transitions, not states. Every save flips "Saving…"
  to "Saved", and a live region on that text narrates the whole session. So
  the visible text is not live; a separate region says something only when
  the situation changes — went offline with what will happen to the changes,
  came back with what is being saved, could not save — which is when a reader
  who is typing needs to be told. On by default for that reason, and it can
  be turned off.

- **session-expiry** — "your session ends in two minutes, stay signed in?"
  Every product with an idle timeout builds this, and WCAG 2.2.1 says what it
  has to do: warn before the time runs out and give at least twenty seconds
  to extend it with a simple action. Most implementations get the first half
  and fail the second in one of two ways: the warning can be dismissed
  without choosing, so a reader who closed it to see the page underneath is
  signed out with no further word; or the countdown is a live region, so a
  screen reader user hears a number every second for two minutes and cannot
  hear the question.

  So this is an alert dialog that cannot be waved away. Escape and the
  backdrop do nothing, because dismissing a session warning without choosing
  is choosing nothing, and focus opens on the safe choice rather than on
  "Sign out now". The countdown ticks on screen and is announced at four
  moments — when the warning opens, at one minute, thirty seconds and ten —
  and a threshold a slow tick skipped over is still said once. When time runs
  out, `onExpire` fires once and the dialog says so with a slot for whatever
  the application offers next; it signs nobody out, because the server did.

  The clock is read in an effect, never during render, so the server renders
  nothing rather than a countdown from the wrong instant. Supply `now` to
  drive it yourself, or in tests.

- **shortcut-recorder** — press the keys you want. Linear, Slack, VS Code,
  Figma and Superhuman each wrote one, and no component library ships the
  recorder, only the `kbd` that displays the result. The recorder is the
  hard part: a button that, when pressed, stops being a button and starts
  being a keyboard listener, and has to come back.

  Three things it does that a listener bolted onto an input does not. It
  reads letters from `code`, not `key`, so Option-K records as Option K and
  not as the ˚ the Mac produced. It stores `Mod`, not Command or Control, so
  a binding saved on one machine is right on the other — the decision every
  app makes and few make explicitly. And it refuses a bare printable key by
  saying why, because a shortcut that fires while someone types a sentence is
  the bug every app that allowed it later fixed.

  Tab and Escape are never recorded: Tab leaves, Escape cancels, and a
  recorder that captures both is a keyboard trap with a nice label. A chord
  another command already uses is said, with that command's name, and applied
  only if the person says to use it anyway. The model is pure and exported,
  so the same parser can validate a saved binding on the server.
### Fixed

- **secret-field's fixture is no longer a live-shaped Stripe key.** The story
  and the test used `sk_live_…` as sample data, and GitHub's push protection
  blocked the push on it — correctly, since that prefix belongs to a
  real-money credential and nothing about the string said otherwise. The
  replacement cannot be mistaken for one. The component's doc comment keeps
  the bare prefix, which is a prefix and not a key, and is the point being
  made there.

## 0.4.0

### New components

- **ai-disclosure** — telling someone they are looking at AI. Not one registry
  ships this — not AI Elements, assistant-ui, prompt-kit, CopilotKit or shadcn —
  while every one of them ships the chat surface that needs it.

  The research flagged that this component's case rested on an EU AI Act
  Article 50 claim nobody had read. It was checked before building, and it holds
  more sharply than assumed: Article 50 has applied since 2 August 2026, with
  penalties up to €15M or 3% of worldwide turnover. So the four `kind`s are not
  invented — they are the human-visible situations the Article creates:
  interaction (50(1)), generated and manipulated media (50(4), "deep fakes"),
  and public-interest text, plus the assisted case the same paragraph exempts
  where there is human review.

  What it cannot do is stated in the source, the metadata and on the docs page:
  Article 50(2) requires synthetic output to be marked *in a machine-readable
  format*, in the artifact, by whoever generated it. No React component can do
  that. This is a disclosure control, not a compliance product, and nothing in
  it is legal advice.

  Provenance is rendered as claims, never as proof. "Made with Acme Diffusion 3"
  looks like a fact and is a string somebody put in a file, so the panel names
  who asserts it and says in words whether anyone checked — defaulting to "not
  checked", because a component that stays quiet about verification reads as
  verified. `verified` is supplied, never computed: checking a C2PA manifest
  means parsing signed COSE and walking a certificate chain, which would mean a
  wasm blob in the browser that you cannot read, and cannot be trusted
  client-side anyway, since the page doing the checking is the page making the
  claim.

  The Commission's three icons are free to use without attribution and are
  deliberately not bundled — an official mark inside a component library ends up
  on content nobody checked — so `icon` is a prop. Their own line holds either
  way: using them "does not establish legal compliance by itself".

- **time-range-picker** — the control Grafana, Datadog, Sentry, PostHog,
  Vercel, Honeycomb, Cloudflare and Amplitude each maintain a bespoke copy of,
  and which no React package ships. It looks like a date picker and is not one:
  its value is an expression, `now-6h/h..now`, so it is still the last six hours
  tomorrow, where two resolved timestamps are six hours of last Tuesday forever.
  That is what lets a dashboard URL survive being bookmarked and reloaded.

  The grammar is a deliberate subset of the one those products converged on, and
  the model is pure and separately importable: `resolveTimeRange(expression,
  { now, timeZone })` for anyone who wants to build a query without rendering a
  picker. Two details are the ones every reimplementation gets wrong, and both
  have tests. Snapping rounds the opening side down and the closing side up, so
  `now/d..now/d` is all of today rather than a window of zero length; and day,
  week, month and year offsets are calendar arithmetic, so a month back from the
  31st is the end of a shorter month rather than an overflow into the next one,
  and a day back is the same wall-clock time even where a zone changed offset
  overnight.

  Two omissions are deliberate, on the research's advice: no timezone combobox —
  `timeZone` is a prop, because it is a 400-entry list and a decision an app
  makes once — and no comparison range, which belongs to whatever draws the
  chart.

  An invalid expression says why and is not applied. A chart quietly re-scoping
  itself to a window nobody asked for is worse than one that refuses.

- **diff-viewer** — two versions of a file, side by side or unified, with the
  changed words inside a line marked rather than the whole line flagged, and
  unchanged runs collapsed with the count of what was hidden stated rather than
  silently dropped. Hunks can be accepted or rejected, which is the case Dowel
  exists for: an agent proposing a change to a file. Decisions are controlled —
  the component reports the decision and applies nothing, because writing to a
  file is the application's call.

  The diff algorithm is jsdiff's, not a reimplementation. What every packaged
  *viewer* welds on is a styling strategy — emotion in
  `react-diff-viewer-continued`, HTML strings and a stylesheet in `diff2html` —
  and that is exactly what design tokens cannot reach and what is awkward under
  RSC. jsdiff itself is BSD-licensed, dependency-free, and ships types.

  It renders a semantic table, not a `role="grid"`: a grid would promise
  cell-by-cell arrow navigation that does not exist here and makes no sense for
  reading code. Every row states added, removed or unchanged in text, because a
  plus sign and a green tint are not information, and line numbers are hidden
  from assistive technology — announcing two numbers before every line makes a
  diff unlistenable.

- **log-viewer** — a streaming console: level facets, substring or regex
  filtering with the matches highlighted in place, expandable structured fields,
  and follow mode that detaches when you scroll up. The incumbent,
  `react-lazylog`, was last published in 2022 on `react-virtualized` and cannot
  run on React 19, while still taking around 15,000 downloads a week.

  Two accessibility decisions are deliberate rather than incidental.
  `role="log"` implies `aria-live="polite"`, which is right for a few events and
  unusable for a console — a screen reader would read every line of a build and
  nothing else would be audible — so announcing is off by default and opt-in.
  And virtualization means most rows are simply not in the DOM, which assistive
  technology cannot reach; `onDownload` is the escape, because a viewer that
  pretends the virtual window is the whole log is not honestly accessible.

  Adds `@tanstack/react-virtual`, the second TanStack dependency. It is
  measurement-only and headless; every pixel of DOM, ARIA and filtering is in
  the component's own source.

### Fixed

- **audit:bundle** enforces its source budget per file, which is what its own
  docstring has always said. It summed the whole registry entry instead, which
  was identical for the single-file components that made up the library and only
  diverged once an entry had two files — at which point it failed a component
  for having taken the rule's own advice and split up. Entry totals are still
  reported, and flagged past a looser threshold, so splitting cannot hide bulk.

- **audit:counts** is new, and checks every place the component count is written
  down against the registry. It is stated in two READMEs and the npm
  description, and it has now drifted twice — 52 when there were 56, and 56 when
  there were 60 — shipping wrong to npm both times, because nothing was looking.
  The numbers stay hand-written, since they sit in prose a generator would
  ruin; they are now impossible to get wrong quietly.

- **`dowel --version`** reports the real version. It printed a hardcoded `0.1.0`
  that had drifted from the published release; it is read from the package
  manifest at runtime now, so it cannot fall out of step again.


## 0.3.0

### Naming

- `dowel-cli` is marked private and will not be published. npm refuses the name
  as "too similar to existing package del-cli" — the second refusal on this
  pattern after `dowel` itself, which was too similar to `del` and `bower`. The
  check runs only at publish, so a 404 from the registry proves a name is
  unused, never that it can be claimed. `npx @dowel-ui/cli` is the way in.

### New components

- **ai-approval-request** — the gate between an agent deciding to act and it
  acting, which completes the sequence: plan, approve, execute, account for.
  Two things separate it from the confirmations that exist. The proposed
  arguments are editable, so "approve this but fix the address first" is
  possible — every surveyed implementation returns a boolean over a read-only
  payload, forcing a choice between approving something wrong and denying it
  outright. And it renders while the arguments are still arriving, rather than
  returning null until the tool input completes and showing nothing at the
  moment approval becomes relevant.

- **ai-agent-plan** — what an agent intends to do, and how far through it is.
  Not a stepper: a wizard's steps are fixed, while an agent revises its plan as
  it learns. Revision is therefore the feature rather than an edge case, and a
  structural change is announced — watching a list quietly grow is not the same
  as being told the model added a step. Status changes stay silent, because
  announcing every transition would talk over the reader continuously.

  Pairs with `ai-action-ledger`: the plan is what it intends, the ledger is what
  it did. Approval, the step between them, is still unbuilt.

- **file-upload** — a dropzone over a real `input[type=file]`, plus the queue
  almost nobody ships: per-file progress, cancel, retry with backoff, and a
  concurrency limit. The transport is injected as a single `upload` function, so
  the component never constructs a request — a presigned S3 PUT, a multipart
  POST and tus are all the consumer's to write. `xhrUpload` ships as a working
  example rather than a dependency, and uses XMLHttpRequest because `fetch`
  still cannot report upload progress in any shipping browser.

  Split across two files on purpose: `upload-queue.ts` is the part worth owning
  and is testable without rendering anything.

- **tags-input** — a list of short values: invited emails, allowed domains,
  stop sequences. The behaviour worth shipping is what happens to input that
  fails validation. Every implementation surveyed either refuses to create the
  token or creates it and silently discards it, and both leave the reader with
  a field that did not do what they asked and nothing to correct. Here an
  invalid entry becomes a token like any other, marked and carrying its reason.
  Refusals — duplicates, hitting the limit — are announced rather than looking
  like nothing happened.

  Deliberately no suggestion list. A token field with an anchored listbox is a
  multi-select combobox, and there are already 544 lines of hand-rolled combobox
  ARIA in this library; a second copy would be the kind of duplication that
  drifts. Multi-select belongs in Combobox.

### Motion

- **`--motion-scale`** — one multiplier re-times the whole system, the way
  `--radius-scale` re-proportions every corner. Every duration token derives
  from it, so `0` stops choreography outright and `1.4` makes it deliberate.
- **Reduced motion is now layered rather than blanket.** It collapses the scale,
  which covers everything this library animates, and the `!important` blanket
  that catches consumer animation now exempts `data-motion="indicator"`. A
  spinner and a streaming caret keep reporting at half rate via
  `--motion-scale-indicator`, because a frozen spinner is not a gentler
  experience — it says the application has hung. Three components qualify:
  spinner, the ai-response caret, and progress while indeterminate.
- **`ai-structured-output` fields settle.** "A token arrived" and "this field is
  final" look identical in a streamed object; the settle is that distinction
  made visible. It plays on the transition into settled and never on a field
  that was already final at mount.
- New `pnpm audit:motion`, in `audit:all` and therefore CI. It fails on a
  duration that does not derive from the scale, on a reduced-motion block that
  only overrides rules, and on any component claiming indicator status without
  being on an explicit allowlist. Both failure modes were verified by breaking
  them deliberately.

### Not done

- Origin-aware overlays, which I had proposed as work. All five anchored
  overlays — popover, select, dropdown-menu, tooltip, combobox — already set
  `transform-origin` from Radix. Dialog is centred and modal, so Radix exposes
  no origin for it and it correctly has none. The earlier claim that this was
  half-finished was wrong.

## 0.2.0

### Documentation

- Every published package now has a README. `@dowel-ui/react` shipped 0.1.1 with
  a blank npm page and no keywords, which is the first thing anyone evaluating
  it sees. All four carry one now, with keywords for search.
- The root README claimed the project was "not yet deployed or published" and
  listed phase 2 as "Next" with everything after it "Planned". All nine phases
  were complete, four packages were on npm and the site was live. Rewritten
  against what actually exists.

### New components

Five from the component research, in two tranches.

- **meter** — a measurement against a capacity, `role="meter"` rather than
  `progressbar`. Segment widths are a share of capacity, not of the total.
- **metric-delta** — a KPI with polarity, so rising churn is not painted green,
  and no percentage invented from a zero baseline.
- **record-diff** — field-level before and after for audit entries, taking the
  union of both records so removals are not lost.
- **ai-action-ledger** — what an agent actually did, classified revertible,
  compensable or irreversible. The ecosystem ships pre-execution approval and
  nothing post-execution; this is the other half.
- **ai-structured-output** — an object arriving field by field, with layout
  reserved up front. States plainly that no per-field completion signal exists
  in the stack, and what it infers instead.
- **ai-inline-completion** — ghost text in a real textarea. Scoped to textarea
  and input deliberately: contenteditable would make it an editor.

### Fixed

- Story decorators used `max-w-*` with no width, so inside the docs preview's
  centred grid a component with no intrinsic width collapsed to a few pixels.
  The inline completion field rendered 26px wide.

## 0.1.1

### Naming

- **Fix:** the CLI publishes as `@dowel-ui/cli`, not as an unscoped `dowel`. npm
  refuses that name — "too similar to existing packages del, bower" — under a
  typosquat rule that runs only at publish time. A 404 from the registry proves
  a name is unused; it does not prove the name can be claimed, and nothing short
  of attempting the publish distinguishes the two. Scoped names skip the check.
- `branding` gains `cliPackage` alongside `cliName`. They were the same string
  and so were used interchangeably — the npm package after `npx`, and the binary
  the package installs. They are no longer the same string, and conflating them
  is what let the wrong assumption spread through the docs.
- `init` now closes with the `npx @dowel-ui/cli add button` form. Anyone who
  reached it through npx has no `dowel` on their PATH, so the bare binary was
  pointing them at a command they do not have.

### Packaging

- **Fix:** `@dowel-ui/react` published its entire test and story suite — 110
  files a consumer can never use, a third of the tarball. `@dowel-ui/registry`
  shipped its test file too. Both now exclude them through the `files` field.
  690 files and 1457 kB unpacked become 580 files and 1071 kB.
- New `pnpm audit:package` check, wired into `audit:all`. It asks npm itself
  what it would pack rather than re-deriving the `files` semantics, and fails on
  any test, story, storybook, tsconfig, vitest-config, env or coverage file in a
  publishable package. It found the `@dowel-ui/registry` case immediately.
- The existing bundle audit measures registry source and built modules, neither
  of which is the npm tarball, so nothing in the gate had been looking at what
  actually gets published.

Note: `dowel@0.1.0` was never published — the first publish stopped before
reaching it — so the CLI starts at 0.1.1.

## 0.1.0

### Naming

- The library is now **Dowel**: `@dowel-ui/*` packages and an unscoped `dowel`
  CLI command. The documentation site and registry are hosted on Vercel until a
  custom domain is registered. A dowel is
  the hidden pin that joins two pieces without visible fasteners.
- The `@dowel` scope was already claimed on npm, so the packages publish under
  `@dowel-ui` — the same shape as `@radix-ui` and `@tanstack`. The component
  package is `@dowel-ui/react` rather than `@dowel-ui/ui`, which would have read
  redundantly at every import. The CLI is published unscoped as `dowel`, which
  would have made `npx dowel add button` work without a scope prefix. This turned
  out to be wrong — see 0.1.1.
- **Fix:** `rebrand` hardcoded the original `libname` placeholders for the domain
  and CLI name, so a second rename silently left both untouched. Every
  replacement is now derived from the current `branding.config.ts`, and the
  tokens are matched longest-first so one is never rewritten inside another.
- **Fix:** `check:branding` derived its placeholder list from
  `branding.config.ts`, which `rebrand` rewrites — so after a rename it reported
  the real branding as an unreplaced placeholder. The list now lives in the
  script, which the rebrand does not touch.

### Phase 9 — Audits and polish

- Four runnable audits, enforced in CI: colour contrast, token usage, API
  consistency and bundle size.
- **Fix:** the contrast audit found 88 WCAG failures across the palette. Four
  token values moved so each clears 4.5:1 both as text and as a fill;
  `--warning-foreground` is now light; input borders meet the 3:1 required to
  identify a form control; the ocean, emerald and amber presets were darkened.
- **Fix:** `toolVariants` was not exported, unlike every other cva component.
- `remove` deletes installed components, keeping edited files unless forced and
  refusing to remove one another component still imports. `add` now records
  dependency edges so that check works offline.

### Phase 8 — Blocks

- Eight blocks: login, sign-up, forgot-password, dashboard, admin users,
  settings, pricing and AI chat.
- Blocks are registry entries with their own install location and full
  transitive dependency resolution.
- `CardTitle` gains `asChild`, so a card heading can be set to the level the
  page needs.
- **Fix:** a checkbox inside a `FormField` labelled with a hard-coded `htmlFor`
  had no accessible name.
- **Fix:** heading order — card titles under a page `h1` skipped a level.
- **Fix:** a data table's action column rendered an empty header cell.

### Phase 7 — Documentation site

- A Next.js documentation site built on the library's own components: the ⌘K
  search is `Command`, the code blocks are `CodeBlock`, the nav and theme
  switcher are `Button`, `DropdownMenu` and the token system.
- The site hosts the registry. The CLI installs from it over HTTP, closing the
  loop from component source to someone else's project.
- Component pages are generated from the registry, and previews are the
  Storybook stories, so neither can drift from what ships.
- **Fix:** the package build stripped `"use client"` directives when merging
  modules into chunks, making the published package unusable under React Server
  Components. Output is now unbundled.
- **Fix:** `Button` was missing `"use client"` despite attaching an event
  handler. An audit now checks every component.

### Phase 6 — AI

- Eleven components: Conversation, Message, Response, Prompt Input, Tool Call,
  Reasoning, Sources, Model Selector, Token Usage, Agent Status and Code Block.
  No new dependencies.
- The transcript is an ordered list, not a live region; state is announced
  through a separate polite region. Tests assert the absence of `aria-live`.
- The composer does not submit while an IME composition is active.
- **Breaking (unreleased):** `Message` takes `from` instead of `role`, which
  shadowed the global ARIA attribute and tripped consumers' linters.
- `SelectItem` gains an optional `label` prop, separating what the trigger shows
  from the option's full content.

### Phase 5 — Data

- Seven components: Table, Data Table, Pagination, Command, Empty State,
  Progress and Activity Feed.
- Command implements the ⌘K palette in-house rather than depending on `cmdk`,
  which has had no release since March 2025. Groups hide their heading when all
  their items are filtered out.
- Data Table presents a TanStack Table v9 instance. Its controls declare the
  shape they need, so a table without sorting fails to compile at the sortable
  header instead of crashing at runtime.
- Table is a real `<table>` with a focusable scroll wrapper, so an overflowing
  table is reachable by keyboard.
- **Fix:** hiding a column removed its header but still rendered its cells,
  shifting every row out of alignment with the columns above it.

### Phase 4 — CLI and registry

- `@libname/registry`: a deterministic build that emits static registry JSON
  from the component sources, with a `sha256` content hash per file.
- `@libname/cli`: `init`, `add`, `list` and `update`.
- `add` resolves registry dependencies transitively, installs npm packages, and
  rewrites imports to the project's own path alias.
- Install hashes are recorded from the first release, so `update` can tell a
  file the user edited from one that changed upstream. Re-running `add` is a
  no-op, and never overwrites local edits without `--overwrite`.
- `--registry` accepts an HTTPS URL or a directory, so private mirrors work and
  the tests run against a registry built in the same commit.
- The CLI refuses Tailwind v3, JavaScript projects and non-React projects with a
  message saying what to do instead, rather than producing a broken install.

### Phase 3 — Forms

- Nine form components: Checkbox, Radio Group, Switch, Slider, Select, Form,
  Combobox, Calendar and Date Picker.
- Combobox implements the ARIA combobox pattern directly rather than depending
  on `cmdk`, which has had no release since March 2025.
- Form wires field accessibility with no form-library dependency, and never
  points `aria-describedby` at an element that was not rendered.
- Calendar wraps `react-day-picker` — the phase's only new dependency — as a
  token-driven design layer.
- Date Picker is the first registry entry with transitive dependencies,
  composing Popover, Calendar and Button.
- **Fix:** Slider forwarded no accessible name to its thumbs, so a labelled
  slider was still announced unnamed. Added `thumbLabels` and `thumbValueTexts`.
- **Fix:** Date Picker opened on the current month rather than the month of the
  already-selected date.

### Phase 2 — Interactive components

- Nine overlay and disclosure components: Dialog, Sheet, Drawer, Popover,
  Tooltip, Dropdown Menu, Tabs, Accordion and Toast.
- Toast ships an imperative API (`toast()`, `toast.promise()`) callable from
  outside React, built on Radix Toast rather than on `sonner`.
- Drawer implements drag-to-dismiss on Radix Dialog rather than depending on
  `vaul`, which has had no release since December 2024.
- Overlay motion layer in the theme package: two shared keyframe pairs cover
  every floating surface and every edge-anchored panel.
- `PopoverContent` warns in development when it has no accessible name.
- No new runtime dependencies.

### Phase 1 — Foundation

- pnpm + Turborepo monorepo with `@libname/config`, `@libname/themes` and
  `@libname/ui`.
- Two-tier OKLCH design token system with light/dark modes and seven theme
  presets (default, ocean, emerald, violet, rose, amber, monochrome).
- Ten foundation components: Alert, Avatar, Badge, Button, Card, Input, Label,
  Separator, Skeleton, Spinner.
- Typed registry metadata with an integrity test that verifies declarations
  against real source imports.
- Vitest + Testing Library + axe, Storybook 10 with the a11y addon, ESLint and
  Prettier, and CI running the full quality gate.
