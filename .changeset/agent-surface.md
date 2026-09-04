---
"@dowel-ui/registry": minor
"@dowel-ui/cli": minor
"@dowel-ui/mcp": minor
---

Teach coding agents what the library has.

`dowel agents` writes documentation for the agents working in a project — a
`.dowel/` reference set, a marked block in `AGENTS.md`, a Claude Code skill and a
Cursor rule — generated from the registry the project installs from and marking
what is already installed. `--check` reports staleness and exits non-zero for CI.

`@dowel-ui/mcp` is a new Model Context Protocol server over the same registry:
`search_components`, `get_component` (source included on request), `get_guide`
and `install_command`. A mistyped name is answered with the nearest real one
rather than silence.

The documentation site now serves `/llms.txt` and `/llms-full.txt`, generated at
build time from the same registry, so neither can fall behind a release.
