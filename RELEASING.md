# Releasing

Two things ship independently: the **packages** on npm, and the **documentation
site**, which is also the registry the CLI reads.

They are coupled in one direction. The CLI resolves components from
`https://dowel-eight.vercel.app/r`, so **the site must be deployed before the CLI
is published** — otherwise `dowel add button` points at a URL that returns
nothing. The registry URL is compiled into each published version, so a version
shipped against a dead URL stays broken: npm versions are immutable.

---

## Before the first release

These are one-time, and all three are first-come.

### 1. Claim the names

```bash
npm login
```

Organisations are created on the website — <https://www.npmjs.com/org/create>.
There is no `npm org create`; the CLI only has `set`, `rm` and `ls` for managing
members of an org that already exists.

Once logged in, `npm org ls <scope>` is the reliable availability check, and the
only one there is: unauthenticated endpoints cannot distinguish a claimed scope
from a free one. A free scope exits non-zero with `404 Scope not found`; a
claimed one exits zero, even when you are not a member.

```bash
npm org ls <scope>   # 404 = free, exit 0 = already claimed
```

Run it against a scope you know is taken and one you know is not before trusting
the answer — the failure mode of every other method is a false "free".

**`@dowel` is already claimed**, which is why the packages publish under
`@dowel-ui` (checked 2026-09-01, free at the time). The unscoped package name
The CLI publishes as `@dowel-ui/cli`, not as an unscoped `dowel`. npm rejects
that name — "too similar to existing packages del, bower" — under a typosquat
rule that runs **only at publish time**. A 404 from the registry therefore
proves a name is unused, never that it can be claimed; there is no way to check
availability short of attempting the publish. Scoped names skip the check
entirely, which is why `@dowel-ui/cli` is safe.

The npm organisation `dowel-ui` exists and is owned by `aqkprogrammer`.

The site is deployed at `dowel-eight.vercel.app`, which is the registry URL the
published CLI resolves against. `dowel.dev` has not been bought yet; when it is,
link it in the Vercel dashboard and the `.vercel.app` alias keeps working
alongside it, so nothing already published breaks. Switching the CLI's default
to the custom domain is then a normal release, not a migration.

The repository lives at `aqkprogrammer/dowel-ui`. If it later moves to a
`dowel-ui` organisation, GitHub redirects the old URL, so links and remotes
keep working — but `branding.repository` should still be updated and the
docs redeployed.

### 2. Point the repository at its remote

```bash
git remote add origin git@github.com:aqkprogrammer/dowel-ui.git
git push -u origin main
```

### 3. Check the branding is fully applied

```bash
pnpm check:branding --strict
```

Exits non-zero if any placeholder survived the rename.

---

## Deploying the documentation site

The site is a Next.js app at `apps/docs` that also serves the registry from
`public/r`.

### What the build does

`pnpm --filter @dowel-ui/docs build` runs `scripts/prepare.ts` first, which:

1. copies the registry from `packages/registry/r` into `public/r`, and
2. generates the preview imports from the Storybook stories.

**It refuses to build if the registry is older than the component sources**, so
a stale registry cannot be published. Build through turbo — `pnpm build` — which
regenerates the registry first. A bare `next build` will trip the staleness
guard, which is the point.

### Settings for any host

| Setting        | Value                             |
| -------------- | --------------------------------- |
| Root directory | repository root (not `apps/docs`) |
| Install        | `pnpm install --frozen-lockfile`  |
| Build          | `pnpm build`                      |
| Output         | `apps/docs/.next`                 |
| Node           | 24                                |

Build from the repository root: the docs depend on three workspace packages and
turbo builds them in order.

### Registry headers

The registry is immutable per release and safe to cache hard. Serve
`/r/*.json` with:

```
Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
Access-Control-Allow-Origin: *
```

CORS matters: a browser-based playground fetching the registry is blocked
without it, and the CLI is unaffected either way.

### Verify the deployment

```bash
curl -s https://dowel-eight.vercel.app/r/index.json | head -5
```

Then install into a scratch project against the live registry, before
publishing anything:

```bash
mkdir /tmp/dowel-smoke && cd /tmp/dowel-smoke
# a React 19 + Tailwind v4 + TypeScript project
pnpm dlx tsx path/to/dowel/packages/cli/src/index.ts \
  --registry https://dowel-eight.vercel.app/r init --yes
```

---

## Publishing the packages

Versioning is [Changesets](https://github.com/changesets/changesets). Nine
changesets are already written, one per phase.

### 1. Version

```bash
pnpm changeset version
```

Applies every pending changeset: bumps versions, writes each package's
`CHANGELOG.md`, and deletes the consumed changesets. Review the diff — this is
the last point at which a version bump is cheap to change.

`dowel-monorepo` and `@dowel-ui/config` are private and are never published.

### 2. Verify

```bash
pnpm install          # lockfile picks up the new versions
pnpm run audit:all
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI runs exactly this. Run it locally anyway before a publish: a failed publish
is far more awkward to undo than a failed build.

### 3. Publish

```bash
pnpm publish -r --access public
```

`-r` publishes every public workspace package. `--access public` is required
for the first publish of a scoped package (`@dowel-ui/*`); the unscoped `dowel`
is public by default, and the flag is harmless there. Without it npm assumes
private and
rejects it.

### 4. Tag

```bash
git push --follow-tags origin main
```

Then draft a GitHub release from the tag, using the generated changelog entries.

---

## What to check after publishing

The point of a source-first library is the install, so test that rather than the
package contents:

```bash
cd /tmp && pnpm create next-app@latest dowel-check --ts --tailwind --app
cd dowel-check
pnpm dlx @dowel-ui/cli init
pnpm dlx @dowel-ui/cli add button dialog data-table
pnpm build
```

Three things this catches that nothing earlier does:

- **`"use client"` surviving the publish.** Bundling once stripped these
  directives, which makes the package unusable in React Server Components. The
  build is unbundled specifically to prevent it, and this is where a regression
  would show.
- **The alias rewrite** against a real project's `tsconfig`.
- **Peer dependency resolution** in a project that is not this workspace.

---

## Subsequent releases

1. Write a changeset with the change: `pnpm changeset`
2. Merge to `main`
3. `pnpm changeset version`, review, commit
4. Deploy the site **first** — the registry is what the CLI reads
5. `pnpm publish -r`

Deploying before publishing matters on every release, not just the first. A
published CLI that resolves against an older registry will install components
whose source no longer matches what its version claims.

## Rolling back

The registry is a static site: redeploy the previous build and every CLI, at any
version, immediately resolves the old sources again.

npm is not reversible in the same way. `npm deprecate` is the honest tool —
`npm unpublish` breaks anyone who already installed. A bad release is fixed by
publishing a patch, not by removing the bad one.
