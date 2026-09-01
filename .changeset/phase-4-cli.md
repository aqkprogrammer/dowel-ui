---
"@dowel-ui/registry": minor
"dowel": minor
---

Add the CLI and registry.

`init` sets a project up, `add` installs components and everything they depend
on, `list` shows what exists, and `update` compares what you have against the
registry.

`add` records a content hash of every file it writes, so `update` can tell a
file you edited from one that changed upstream — re-running `add` is a no-op,
and your edits are never overwritten without `--overwrite`.

`--registry` accepts an HTTPS URL or a directory on disk, so private forks and
mirrors work without a fork of the CLI.
