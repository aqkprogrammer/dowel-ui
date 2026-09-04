---
"@dowel-ui/registry": minor
"@dowel-ui/cli": minor
"@dowel-ui/docs": minor
---

Licensing: entitlement metadata, CLI authentication, and a gated registry path.

**No existing component is licensed, and none becomes licensed by this change.**
`access` defaults to `free`, a registry written before this parses as `free`, and
free is a promise: an item that has ever been installable without a licence must
not quietly stop being one.

**Registry.** Items carry `access: "free" | "pro"`. The index lists everything,
including licensed items — that is the catalogue, and an item nobody can see is
an item nobody buys. What the public directory does not contain is a licensed
item's _body_: those never reach the directory a CDN serves, because a paywall
that can be stepped around by fetching the JSON is not a paywall. They are
emitted as a module instead, so the platform's dependency tracing includes them
in the deployment.

**CLI.** `login`, `logout` and `whoami`. The key is verified against the registry
before it is stored, so a bad key fails when it is pasted rather than days later
during an install. It is stored in the user's config directory at mode 0600 —
never in the project, because a key in `components.json` is a key in git — and
`DOWEL_TOKEN` overrides it for CI. `whoami` masks all but the last four
characters, and `logout` says so when the environment variable is still set and
still winning. `add` and `update` consult the index to decide which items need
credentials, so "you are not signed in" is never reported as "not found".

**Registry host.** `POST /r/license` answers whether a key is good;
`GET /r/pro/<name>` serves a licensed item to whoever is entitled to it. The
licence is checked _before_ the name is looked up, so the paid catalogue cannot
be enumerated by probing 404s, and every response is `no-store, private`.

**Licensing fails closed.** With no provider configured the registry refuses
everything and says why. Allowing by default would give the product away the
first time a deployment was misconfigured, silently. The Polar adapter is
configured entirely by environment — there are no credentials in this repository
— and the development-key provider is double-gated on its own variable _and_ a
non-production environment.
