# Releasing

Two things ship independently: the **packages** on npm, and the **documentation
site**, which is also the registry the CLI reads.

They are coupled in one direction. The CLI resolves components from
`https://dowel-eight.vercel.app/r`, so **the site must be deployed before the CLI
is published** — otherwise `dowel add button` points at a URL that returns
nothing. The registry URL is compiled into each published version, so a version
shipped against a dead URL stays broken: npm versions are immutable.

---

## Licensing configuration

Licensed registry items are served by the site, so the site is where the
licensing is configured. Nothing here is in the repository, and nothing here
should be.

| Variable                 | Required         | What it does                                                                      |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------- |
| `POLAR_ACCESS_TOKEN`     | to sell anything | Organisation access token with the `license_keys` scopes.                         |
| `POLAR_ORGANIZATION_ID`  | to sell anything | Whose keys are accepted. The validation endpoint requires it.                     |
| `POLAR_API_URL`          | no               | Defaults to `https://api.polar.sh`. For a sandbox.                                |
| `DOWEL_DEV_LICENSE_KEYS` | no               | Comma-separated keys accepted **only outside production**, for local work.        |
| `PRO_CHECKOUT_URL`       | to sell anything | Where the Pro button on `/pricing` goes. Unset, the page says "opening soon".     |
| `SALES_CONTACT_URL`      | no               | Where Teams & Enterprise conversations start. Defaults to the GitHub discussions. |

**Both Polar variables are required, together.** The endpoint takes
`organization_id` in the body, so a token without one would fail every check
with a malformed-request error that a customer sees as a problem with their
key. A half-configured deployment is therefore treated as unconfigured, which
at least says so.

**It fails closed.** With no provider configured, `POST /r/license` and
`GET /r/pro/<name>` refuse everything and say that licensing is not configured.
That is deliberate: allowing by default would give the paid catalogue away the
first time a deployment was misconfigured, silently, and for as long as nobody
noticed. A 402 on every licensed install is a support ticket; the other way
round is a leak.

`DOWEL_DEV_LICENSE_KEYS` is double-gated — it needs the variable _and_
`NODE_ENV !== "production"` — because a test key that worked in production would
be a free licence for anyone who read the source, and the source is public.

### Selling the first licence

Everything in the repository is done; what remains is outside it, and is the
same three steps on every deployment of this site:

1. **Create the product in Polar.** A yearly product at $79 per developer, to
   match the pricing page, with a **licence key** benefit attached — the
   benefit is what issues keys, and a product without one sells nothing this
   registry can validate.
2. **Generate an organisation access token** with the `license_keys` scopes
   (`license_keys:read` and `license_keys:write`; validation records a
   validation against the key, so read alone is not enough). Copy the
   organisation id from the same settings page.
3. **Set three variables on the host** and redeploy:
   `POLAR_ACCESS_TOKEN`, `POLAR_ORGANIZATION_ID`, and `PRO_CHECKOUT_URL`
   pointing at the product's checkout link.
4. **Confirm it took**, without buying anything:

   ```bash
   curl -s https://dowel-eight.vercel.app/r/license/health
   ```

   `{"provider":"polar","ready":true,...}` means keys will be validated
   upstream. `"unconfigured"` means the variables did not reach the running
   deployment — the commonest cause being that they were added but nothing was
   redeployed.

5. **Buy one and install it.** `dowel login` with the key, then
   `dowel add crm` into a scratch project. That is the whole path, and it is
   worth walking before announcing anything.

Locally, `DOWEL_DEV_LICENSE_KEYS=test-key pnpm docs` exercises the same gated
route without Polar at all, which is the cheaper way to check the CLI's half.

The blocks currently licensed are `crm`, `command-center`, `ai-workspace` and
`admin-dashboard`. The registry build test names every block that has ever
shipped free and fails the release if one of those changes access.

### Marking an item as licensed

Set `access: "pro"` in the component's `meta.ts`. The build then lists it in the
public index — title, description, dependencies, file count — and withholds its
body from `public/r`, emitting it into the module the gated route imports.

**Do not do this to an item that has already shipped free.** `access` defaults to
`free` and a registry written before the field existed parses as `free`, both on
purpose: an item that has been installable without a licence is one people have
installed, and moving it behind a paywall breaks their next `update`. The
registry build test (`build.test.ts`, "keeps everything that has ever shipped
free, free") lists them by name; add a newly licensed block nowhere, and add a
block that ships free to that list when it ships.

Blocks — all of them — are excluded from the `@dowel-ui/react` tarball
(`"!src/blocks"` in its `files`), and a test fails if that exclusion goes.
They were never importable from the package; the exclusion exists so a licensed
block's source cannot be read out of `node_modules`.

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

Versions are bumped by hand, in lockstep, and the release is recorded in the
single root `CHANGELOG.md`.

Changesets is still installed and its config is still here, but `changeset
version` is deliberately not run: it writes a `CHANGELOG.md` into every package,
and this repository keeps one changelog, not six. That was decided at 0.4.0 and
it is what 0.4.0 and 0.5.0 were both cut with. Either finish the job — delete
the dependency — or leave it as the escape hatch it currently is, but do not
half-use it.

### 1. Version

Set the same version in every package that ships, plus the two private ones that
move with them:

```
packages/ui  packages/cli  packages/registry  packages/themes
packages/mcp  packages/create-dowel-app  packages/config  apps/docs
```

`packages/mcp` and `packages/create-dowel-app` are published and shipped at
0.5.1 alongside the CLI they were introduced with, rather than at the 0.5.0 the
rest of that release carries.

`create-dowel-app` ships its `templates/` directory, which is application files
only — the components it installs come from the registry at creation time, so a
template cannot go stale between releases. That also means **the site must be
deployed before it is published**, for the same reason the CLI must: it runs the
CLI against the live registry URL.

`packages/cli-alias` stays where it is; it is private, unpublished, and has been
at 0.2.0 since it was retired. The root `dowel-monorepo` version is not used for
anything and does not move either.

Lockstep is for feature releases, where the registry content changes and every
package should agree on which release it belongs to. A patch confined to one
package moves that package alone — 0.5.1 was `@dowel-ui/cli` by itself — and
when the registry content has not changed, the site does not need redeploying
and the ordering rule below has nothing to order.

Then change `## Unreleased` in the root `CHANGELOG.md` to the new version. The
prose is written as the work lands, not at release time, so this is a heading
edit and nothing more.

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
for the first publish of a scoped package (`@dowel-ui/*`); the unscoped
`dowel-cli` is public by default, and the flag is harmless there. Without it npm
assumes private and rejects it.

Publishing requires a one-time code: the `aqkprogrammer` account has 2FA set to
`auth-and-writes`, so every publish prompts for an OTP, or takes one on the
command line as `--otp=<code>`.

### The `dowel-cli` alias

`packages/cli-alias` publishes as the unscoped **`dowel-cli`**, purely so that
`npx dowel-cli add button` works — `npx` resolves a package name, not a binary,
so a one-word invocation needs a one-word package. It contains no logic: a
single `import "@dowel-ui/cli"`, and an exact pin on that version, so the two
can never disagree.

Because the pin is exact, **the alias must be versioned and published in the
same release as the CLI**. `pnpm publish -r` handles this: `workspace:*` is
rewritten to the concrete version at pack time. Publishing the alias alone
against an older CLI is what to avoid.

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

1. Write the change up in the root `CHANGELOG.md` under `## Unreleased`, as
   part of the commit that makes it
2. Merge to `main`
3. Bump the versions and close the changelog section (step 1 above), then run
   the gate in step 2 and commit as `release: <version>`
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
