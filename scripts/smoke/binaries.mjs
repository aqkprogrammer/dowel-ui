/**
 * Runs the built binaries on whatever Node is on the PATH.
 *
 * The published CLI, MCP server and scaffolder promise a Node version range in
 * `engines`, and everything else in CI runs on one version, newer than the
 * floor. This is the check that the floor is real: the actual `dist` output,
 * started the way `npx` starts it, doing the first thing a user would do.
 *
 * Plain JavaScript with no dependencies, so it runs on the oldest supported
 * Node without a build step of its own.
 *
 *   node scripts/smoke/binaries.mjs
 */

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registry = join(root, "packages", "registry", "r");
const cli = join(root, "packages", "cli", "dist", "index.js");
const mcp = join(root, "packages", "mcp", "dist", "index.js");
const scaffolder = join(root, "packages", "create-dowel-app", "dist", "index.js");

/** @type {string[]} */
const failures = [];

/**
 * @param {string} name
 * @param {() => unknown} fn
 */
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(
      () => console.log(`  pass  ${name}`),
      (error) => {
        failures.push(name);
        console.log(
          `  FAIL  ${name}\n        ${error instanceof Error ? error.message : error}`,
        );
      },
    );
}

/**
 * @param {string} entry
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function run(entry, args, cwd) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`exit ${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

/** The smallest project `init` accepts: React, TypeScript and Tailwind 4. */
function scratchProject() {
  const dir = mkdtempSync(join(tmpdir(), "dowel-smoke-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "smoke",
      private: true,
      dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
      devDependencies: { tailwindcss: "^4.1.0" },
    }),
  );
  writeFileSync(join(dir, "pnpm-lock.yaml"), "");
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { jsx: "react-jsx", paths: { "@/*": ["./src/*"] } } }),
  );
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "index.css"), '@import "tailwindcss";\n');
  return dir;
}

/**
 * Speaks just enough JSON-RPC over stdio to list the server's tools.
 *
 * @returns {Promise<string[]>}
 */
function listMcpTools() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [mcp, "--registry", registry], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("no answer within 15 s"));
    }, 15_000);

    child.stdout.on("data", (/** @type {Buffer} */ chunk) => {
      buffer += chunk.toString("utf8");
      for (const line of buffer.split("\n").slice(0, -1)) {
        /** @type {unknown} */
        const parsed = JSON.parse(line);
        const message = /** @type {{ id?: number; result: { tools: { name: string }[] } }} */ (
          parsed
        );
        if (message.id === 1) {
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
          );
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`,
          );
        }
        if (message.id === 2) {
          clearTimeout(timer);
          child.kill();
          resolve(message.result.tools.map((tool) => tool.name));
        }
      }
      buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
    });
    child.on("error", reject);

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "smoke", version: "0" },
        },
      })}\n`,
    );
  });
}

console.log(`Node ${process.version}`);

for (const path of [cli, mcp, scaffolder, join(registry, "index.json")]) {
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Build the packages and the registry first.`);
    process.exit(1);
  }
}

const project = scratchProject();
try {
  await check("cli: --version", () => run(cli, ["--version"], project));

  await check("cli: init and add into a fresh project", () => {
    run(cli, ["--registry", registry, "init", "--yes", "--skip-install"], project);
    run(cli, ["--registry", registry, "add", "button", "--yes", "--skip-install"], project);
    for (const file of [
      "components.json",
      "src/components/ui/button.tsx",
      "src/lib/utils.ts",
    ]) {
      if (!existsSync(join(project, file))) throw new Error(`${file} was not written`);
    }
    if (!readFileSync(join(project, "src/index.css"), "utf8").includes("@theme")) {
      throw new Error("tokens were not added to the stylesheet");
    }
  });

  await check("cli: doctor and audit run", () => {
    run(cli, ["--registry", registry, "doctor", "--offline", "--json"], project);
    writeFileSync(
      join(project, "src", "page.tsx"),
      'export const P = () => <p className="ms-2" />;\n',
    );
    run(cli, ["audit", "--json"], project);
  });

  await check("create-dowel-app: --help", () => run(scaffolder, ["--help"], project));

  await check("mcp: answers tools/list", async () => {
    const tools = await listMcpTools();
    if (!tools.includes("search_components")) throw new Error(`got ${tools.join(", ")}`);
  });
} finally {
  rmSync(project, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed on Node ${process.version}.`);
  process.exit(1);
}
console.log(`\nAll binaries run on Node ${process.version}.`);
