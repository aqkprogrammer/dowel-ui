---
"@dowel-ui/registry": minor
---

Build your own registry.

The CLI has always installed from any registry — `--registry` takes a URL or a
directory — but producing one meant reimplementing this package. An organisation
that wanted its own components installed the same way had the consumer half and
none of the producer half.

`buildCustomRegistry` takes a config and emits items. `extends` layers it on top
of another registry, so one URL serves both an organisation's components and
everything upstream, and `add` resolves across the two. A local item replaces an
upstream one of the same name and the result reports which — overriding
upstream's Button is a legitimate thing to want and a catastrophic thing to do by
accident.

The authoring shape is declared in this package rather than imported from the
component library, because the registry is the contract: a team publishing their
own components should not have to depend on somebody else's to describe theirs.

Three things are refused at build time rather than left to fail in a consumer's
repository:

- a file an item names but that does not exist;
- an import written against the **installed** path (`@/components/ui/badge`)
  instead of the authored one (`@/components/badge`) — the leading group is
  rewritten at install time, so naming it twice produces a path resolving
  nowhere, and the doubled segment is easy to stare past;
- a component importing a registry item it never declared, which would not be
  installed alongside it.

Also exports `assertResolvable`, which checks that every `registryDependencies`
name exists in the finished registry — the most common way a hand-assembled
registry is broken, and invisible until somebody runs `add`.
