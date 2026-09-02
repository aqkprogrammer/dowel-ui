#!/usr/bin/env node
/**
 * A one-word name for `npx`, and nothing else.
 *
 * npx resolves a *package* name, not a binary, so `npx dowel-cli` needs a
 * package actually called `dowel-cli`. This is that package: it pins the real
 * CLI as a dependency and hands straight over to it. Importing the entrypoint
 * runs it — the module parses argv and executes at load.
 *
 * Keep this file free of logic. Every behaviour belongs in @dowel-ui/cli, so
 * the two can never disagree about what a command does.
 */
import "@dowel-ui/cli";
