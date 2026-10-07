# 19. Enterprise foundations: private keys, governance, and what is not built

- **Status:** Accepted
- **Date:** 2026-10-06
- **Phase:** Roadmap phase 7

## Context

An organisation could already build its own registry (`buildCustomRegistry`,
with `extends`) and point projects at it. Two things stopped that being a
real internal design system: the registry had to be public, because the CLI
only ever sent a key for Pro items; and nothing could say who owned an item,
or that it had been retired in favour of another.

The rest of what is usually meant by "enterprise" — organisations, roles,
audit logs, usage analytics, SSO — needs a server, identities and a billing
relationship. This record covers the two things built, and writes the rest
down as interfaces, so that whoever builds it later builds against a design
rather than starting from one.

## A private registry is any registry that answers 401

No new protocol. The registry is the same static directory, behind whatever
the organisation already uses to check a token: a reverse proxy, an edge
function, a VPN gateway.

- **The first request goes without a key.** A public registry never receives
  one it did not ask for, including the Pro licence on a free request.
- **A 401 is answered once,** with the key stored for that registry's origin
  and no other. `credentialsFor` refuses — loudly — to send a key that belongs
  elsewhere, which is the same check that stops a cloned repository's
  `components.json` collecting keys (PR #23).
- **Keys are stored per registry.** The credentials file became a list. A
  person with a Pro licence who signs in to their company's registry keeps
  both. Files in the earlier single-key format are still read, and upgraded on
  the next write.
- **`login --registry` works without a licence endpoint.** The official
  registry checks keys at `/license`. A static private registry has no such
  route, so a 404 there falls back to fetching the index with the key: if it
  opens, the key is good. A bare 401 from either is a rejected key.
- **The MCP server** has no interactive login, so it reads the pair CI uses —
  `DOWEL_TOKEN` and `DOWEL_TOKEN_REGISTRY` — and sends the key only when the
  second names the registry it is reading.

## Governance is metadata, honoured everywhere

Three optional fields on every item, declared in `meta.ts` or a custom
registry's item config:

- `owner` — who maintains it.
- `since` — the version it first shipped in. Not backfilled for this
  registry's existing components: the history is in the changelog, and a
  version guessed from it would be a claim nobody checked.
- `deprecated` — `since`, `reason`, and an optional `replacement`.

**Deprecation never removes.** A deprecated item still installs, because
removing one breaks the next `update` in every project that has it, in
repositories nobody here can see (ADR 13 makes the same argument about
access). Everything else changes:

| Surface    | What it does with a deprecated item                               |
| ---------- | ----------------------------------------------------------------- |
| `add`      | Warns before writing, naming the replacement                      |
| `update`   | Warns, with the `add` command for the replacement                 |
| `list`     | Marks it, with the replacement                                    |
| `doctor`   | A warning check listing installed deprecated items → replacements |
| MCP        | `get_component` leads with the notice; search results mark it     |
| Agent docs | The notice replaces its "Use for" guidance                        |
| Planners   | Never suggested, by the built-in planner or offered to a model    |

The build refuses a replacement, an alternative or a `composesWith` that names
an item the registry does not have, for the organisation's own items. For
items inherited through `extends`, such names are dropped instead: upstream's
free blocks name its Pro blocks as alternatives, and a registry built from
upstream's public files cannot serve those. Building this found exactly that:
`dashboard` → `admin-dashboard`, `ai-chat` → `ai-workspace`, `admin-users` →
`crm`.

## What is not built, written as interfaces

These need a hosted service. They are sketched so the boundaries are settled
before anyone writes the service; none of this exists in code.

```ts
/** A tenant. Owns registries, members, and the policy for both. */
interface Organisation {
  id: string;
  slug: string; // namespaces items: @acme/button
  registries: RegistryRef[];
  members: Membership[];
  sso?: { protocol: "saml" | "oidc"; issuer: string };
}

/**
 * Roles are coarse on purpose. A design system has few kinds of actor, and
 * fine-grained permissions are a support burden before they are a feature.
 */
type Role =
  | "viewer" // install, read docs
  | "contributor" // propose items and changes
  | "maintainer" // approve, publish, deprecate items they own
  | "admin"; // members, keys, policy

interface Membership {
  userId: string;
  role: Role;
}

/** Every write is recorded; reads are not, because installs are not secrets. */
interface AuditEvent {
  at: string;
  actor: string;
  action: "publish" | "deprecate" | "approve" | "key.issue" | "key.revoke" | "member.change";
  item?: string;
  version?: string;
}

/**
 * What a project reports back, if it opts in. Derived from components.json and
 * `dowel audit --json`, both of which already exist locally; the service only
 * aggregates them. Never source code.
 */
interface UsageReport {
  project: string;
  registry: string;
  installed: { name: string; from: string; modified: boolean }[];
  audit: Record<string, number>; // findings per rule
}
```

The decisions these encode:

- **Registries stay static.** The service issues keys and publishes
  directories; the CLI's protocol does not change. A self-hosted registry and
  a hosted one are installed from identically.
- **Usage is opt-in and derived from what the CLI already computes.** A design
  system team wants to know which products are on a deprecated component and
  how much drift each has. `components.json` and `audit --json` already say
  both, per project; nothing new needs to be collected.
- **Approval is per item version, by its owner.** That is what `owner` is for.

## When to build them

The roadmap's phase 8 condition: a team asking for a hosted registry, or for a
view across repositories. Until then, everything on this page is self-hosted
and free, and the pricing page says so.
