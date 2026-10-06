import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { login } from "../src/commands/auth";
import { readToken, writeToken } from "../src/lib/auth";
import { fetchIndex } from "../src/lib/registry-client";
import { LOCAL_REGISTRY } from "./fixtures";

/**
 * A private registry: the same static files, behind a server that wants a key
 * for every request. Plain HTTP on loopback, which is the one place the CLI
 * will send a key without TLS.
 */

const KEY = "acme-secret";
const seen: IncomingHttpHeaders[] = [];
let server: Server;
let base: string;
let publicServer: Server;
let publicBase: string;
let config: string;

function serve(requireKey: boolean): Promise<[Server, string]> {
  const instance = createServer((request, response) => {
    seen.push(request.headers);
    if (requireKey && request.headers.authorization !== `Bearer ${KEY}`) {
      response.writeHead(401).end();
      return;
    }
    if (request.url === "/r/index.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(readFileSync(join(LOCAL_REGISTRY, "index.json")));
      return;
    }
    response.writeHead(404).end();
  });
  return new Promise((resolve) => {
    instance.listen(0, "127.0.0.1", () => {
      const address = instance.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve([instance, `http://127.0.0.1:${String(port)}/r`]);
    });
  });
}

beforeAll(async () => {
  [server, base] = await serve(true);
  [publicServer, publicBase] = await serve(false);
});

afterAll(() => {
  server.close();
  publicServer.close();
});

afterEach(() => {
  seen.length = 0;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (config) rmSync(config, { recursive: true, force: true });
});

function isolate(): void {
  config = mkdtempSync(join(tmpdir(), "dowel-private-"));
  vi.stubEnv("XDG_CONFIG_HOME", config);
  vi.stubEnv("DOWEL_TOKEN", "");
}

describe("a private registry", () => {
  it("says it needs a key, and how to sign in, when there is none", async () => {
    isolate();
    await expect(fetchIndex(base)).rejects.toThrow(/requires a key/);
  });

  it("answers the 401 with the key stored for it", async () => {
    isolate();
    writeToken(KEY, process.env, base);
    const index = await fetchIndex(base);
    expect(index.items.length).toBeGreaterThan(0);
    // The first request went without the key; only the retry carried it.
    expect(seen.map((headers) => headers.authorization)).toEqual([undefined, `Bearer ${KEY}`]);
  });

  it("refuses to answer with a key that belongs to another registry", async () => {
    isolate();
    writeToken(KEY, process.env, "https://registry.other.example/r");
    await expect(fetchIndex(base)).rejects.toThrow(/Not sending your licence key/);
    expect(seen.every((headers) => headers.authorization === undefined)).toBe(true);
  });

  it("reports a stored key the registry no longer accepts", async () => {
    isolate();
    writeToken("revoked", process.env, base);
    await expect(fetchIndex(base)).rejects.toThrow(/did not accept the key/);
  });

  it("can be signed in to: login checks the key against the index", async () => {
    isolate();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await login({ registry: base, token: KEY, yes: true });
    expect(readToken(process.env, base)?.token).toBe(KEY);
  });

  it("will not store a key it does not accept", async () => {
    isolate();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await expect(login({ registry: base, token: "wrong", yes: true })).rejects.toThrow(
      /did not accept/,
    );
    expect(readToken(process.env, base)).toBeUndefined();
  });
});

describe("a public registry", () => {
  it("never receives a key it did not ask for", async () => {
    isolate();
    writeToken(KEY, process.env, publicBase);
    await fetchIndex(publicBase);
    expect(seen.map((headers) => headers.authorization)).toEqual([undefined]);
  });
});
