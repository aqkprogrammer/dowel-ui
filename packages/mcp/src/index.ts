#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { branding } from "./branding";
import { createServer } from "./server";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

/**
 * Reads a `--flag value` pair from argv.
 *
 * Hand-rolled rather than pulled from a parser: this binary is launched by an
 * MCP client from a JSON config, takes two options, and every dependency here
 * is a dependency of every agent session that starts the server.
 */
function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const registryUrl = flag("registry") ?? process.env.DOWEL_REGISTRY ?? branding.registryUrl;
  const importFrom =
    flag("import-from") ?? process.env.DOWEL_IMPORT_FROM ?? `${branding.packageScope}/react`;

  const server = createServer({
    registryUrl,
    docsUrl: branding.registryUrl.replace(/\/r$/, ""),
    cliPackage: branding.cliPackage,
    libraryName: branding.libraryName,
    importFrom,
    version,
  });

  // stdout is the protocol channel. Anything written to it that is not a JSON-RPC
  // message corrupts the stream, which is why there is no logging here at all —
  // diagnostics belong on stderr or nowhere.
  await server.connect(new StdioServerTransport());
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
