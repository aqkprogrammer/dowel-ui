# 13. The paid catalogue

- **Status:** Accepted
- **Date:** 2026-09-05
- **Phase:** 10

## Context

0.6.0 built the machinery for a licensed registry item — the `access` field,
the gated route, the licence provider that fails closed, the CLI's `login` —
and shipped it with nothing licensed. This record covers the decisions taken
when something was.

## Free stays free, and a test says which

Every component and the thirteen blocks that were in the public registry
before this release stay `free`, and the registry build test names each of
those blocks and fails if its access changes. The schema's default does the
same job for anything that predates the field. Both exist because the promise
is cheap to make and expensive to break: an item that has been installable
without a licence is one people have installed, and moving it behind a paywall
breaks their next `update` in a repository we cannot see.

The consequence is that Pro is only ever new things. That was also the better
product: what people pay for is whole application surfaces, not the button they
already had.

## Pro items are whole surfaces, not better parts

The four licensed blocks — `crm`, `command-center`, `ai-workspace`,
`admin-dashboard` — are each an application's page rather than a section of
one, assembled from between eight and thirteen components. That is the line:
components and page sections are the library, and are free; applications built
from them are the product. A "premium" button would have made the free tier a
trial, and the pricing page says in its first sentence that it is not.

## What "withheld" means, precisely

- The **index** lists a licensed item in full: title, description, category,
  dependencies, file count, and `access: "pro"`. A catalogue nobody can see is
  a catalogue nobody buys.
- The **body** is served only by the gated route, to a valid licence.
- The **docs site** reads a licensed item's metadata from the same module the
  gated route imports, with every file's `content` blanked before it leaves the
  registry lib, and renders the preview from the block's stories. The preview
  is the compiled component in a client bundle; the source file is what is
  sold, and the two are different things to different people.
- The **npm tarball** of `@dowel-ui/react` excludes `src/blocks` entirely.
  Blocks were never importable from the package (ADR 0011), so nothing changes
  for a consumer; the exclusion exists because `files` included `src`, and a
  licensed block readable out of `node_modules` is the paywall gone. A test
  fails if the exclusion is removed.
- The **MCP server** answers `get_component` for a licensed item from the
  index and says how to get the source, rather than surfacing the 404 it would
  otherwise get from the public path — which reads as "this does not exist"
  when the point is that it does.
- The **quality** page and the **counts** audit treat licensed items like any
  other, reading the build and the index respectively rather than the public
  directory, so the paid half of the catalogue is measured and counted.

## The pricing page does not sell what does not exist

The page has three tiers. Free and Pro are real; the Pro button goes to the
checkout only when `PRO_CHECKOUT_URL` is set and otherwise says "opening soon"
with the repository to watch. Teams & Enterprise is priced "talk to us" and
describes what exists today — a self-hosted private registry, free, documented
on its own page — with the hosted registry, organisation licences and SSO
named as planned. A tier with a price and no product would have been the more
persuasive page and the less honest one.

## What composing the blocks found

`ai-workspace` and `admin-dashboard` both use the sidebar, and both failed
their own tests on first render because the whole page was `aria-hidden`. The
sidebar's mobile sheet was mounted whenever the rail was open and hidden with
CSS, and a modal dialog that is `display: none` is still modal. The live docs
had it. The fix is in the sidebar's own record in the changelog; the lesson is
the one ADR 0011 already stated: a component's tests cannot catch what only
appears when components are put together, which is what blocks are for.

## Not decided here

- **Per-item entitlements.** The `License` type carries an optional
  `entitlements` list, and nothing sets it: one plan covers the catalogue.
- **A hosted registry for Teams.** It needs storage, an identity provider and
  a billing relationship with an organisation, all of which are choices about
  infrastructure rather than about this codebase. The self-hosted path is
  complete and free.
