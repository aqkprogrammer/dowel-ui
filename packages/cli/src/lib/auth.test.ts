import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { branding } from "../branding";
import {
  authPath,
  canCarryCredentials,
  clearToken,
  configDirectory,
  credentialsFor,
  maskToken,
  readToken,
  TOKEN_ENV,
  TOKEN_REGISTRY_ENV,
  writeToken,
} from "./auth";
import { CliError } from "./errors";

const roots: string[] = [];

function scratchEnv(): NodeJS.ProcessEnv {
  const root = mkdtempSync(join(tmpdir(), "dowel-auth-"));
  roots.push(root);
  return { XDG_CONFIG_HOME: root };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("configDirectory", () => {
  it("respects XDG_CONFIG_HOME, rather than scattering a file into ~/.config anyway", () => {
    expect(configDirectory({ XDG_CONFIG_HOME: "/custom" })).toBe("/custom/dowel");
  });

  it("falls back to the platform default when it is unset or empty", () => {
    expect(configDirectory({ XDG_CONFIG_HOME: "" })).toContain(".config");
    expect(configDirectory({})).toContain(".config");
  });
});

describe("readToken", () => {
  it("finds nothing when nothing has been stored", () => {
    expect(readToken(scratchEnv())).toBeUndefined();
  });

  it("reads what was written", () => {
    const env = scratchEnv();
    writeToken("licence-key", env);

    expect(readToken(env)).toEqual({
      token: "licence-key",
      source: "file",
      registry: branding.registryUrl,
    });
  });

  it("lets the environment win, because CI has no interactive login", () => {
    const env = scratchEnv();
    writeToken("from-file", env);
    env[TOKEN_ENV] = "from-env";

    expect(readToken(env)).toEqual({
      token: "from-env",
      source: "env",
      registry: branding.registryUrl,
    });
  });

  it("ignores an environment variable that is only whitespace", () => {
    const env = scratchEnv();
    writeToken("from-file", env);
    env[TOKEN_ENV] = "   ";

    expect(readToken(env)?.source).toBe("file");
  });

  it("says what is wrong with a corrupted file instead of crashing", () => {
    const env = scratchEnv();
    const path = authPath(env);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "not json");

    expect(() => readToken(env)).toThrow(CliError);
  });

  it("rejects a file that parses but is not credentials", () => {
    const env = scratchEnv();
    const path = authPath(env);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, JSON.stringify({ token: "" }));

    expect(() => readToken(env)).toThrow(CliError);
  });
});

describe("writeToken", () => {
  it("stores the key outside the project, where git cannot pick it up", () => {
    const env = scratchEnv();
    const path = writeToken("k", env);

    expect(path).toBe(authPath(env));
    expect(path).not.toContain("components.json");
  });

  it("writes a file only its owner can read", () => {
    const env = scratchEnv();
    const path = writeToken("k", env);

    // 0o600. A licence key world-readable on a shared machine is a licence key
    // everyone on that machine has.
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("tightens permissions on a file that already existed with looser ones", () => {
    const env = scratchEnv();
    const path = writeToken("first", env);
    chmodSync(path, 0o644);

    writeToken("second", env);

    // The mode argument to writeFileSync applies only on creation, so signing
    // in again over a loose file would otherwise keep it loose.
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });
});

describe("clearToken", () => {
  it("removes what was stored, and says whether there was anything", () => {
    const env = scratchEnv();
    expect(clearToken(env)).toBe(false);

    writeToken("k", env);
    expect(clearToken(env)).toBe(true);
    expect(existsSync(authPath(env))).toBe(false);
  });
});

describe("maskToken", () => {
  it("shows only the last four characters", () => {
    expect(maskToken("abcdefghijklmnop")).toBe("••••••••••••mnop");
    expect(maskToken("abcdefghijklmnop")).not.toContain("abcdefgh");
  });

  it("reveals nothing at all from a very short key", () => {
    expect(maskToken("abcd")).toBe("••••");
    expect(maskToken("ab")).toBe("••");
  });

  it("never grows a long key into a hint about its length", () => {
    const long = "x".repeat(200);
    expect(maskToken(long).length).toBeLessThanOrEqual(16);
  });
});

describe("canCarryCredentials", () => {
  it("allows HTTPS, and plain HTTP only to this machine", () => {
    expect(canCarryCredentials("https://registry.example/r")).toBe(true);
    expect(canCarryCredentials("http://localhost:3333/r")).toBe(true);
    expect(canCarryCredentials("http://127.0.0.1/r")).toBe(true);
    expect(canCarryCredentials("http://registry.example/r")).toBe(false);
    expect(canCarryCredentials("not a url")).toBe(false);
  });
});

describe("credentialsFor", () => {
  it("sends nothing when there is nothing to send", () => {
    expect(credentialsFor(branding.registryUrl, scratchEnv())).toBeUndefined();
  });

  it("sends a stored key to the registry it was verified against", () => {
    const env = scratchEnv();
    writeToken("k", env, "https://acme.example/r");

    expect(credentialsFor("https://acme.example/r", env)?.token).toBe("k");
  });

  it("treats a key stored before scoping as belonging to the default registry", () => {
    const env = scratchEnv();
    mkdirSync(join(env.XDG_CONFIG_HOME ?? "", "dowel"), { recursive: true });
    writeFileSync(authPath(env), JSON.stringify({ token: "legacy" }));

    expect(credentialsFor(branding.registryUrl, env)?.token).toBe("legacy");
    expect(() => credentialsFor("https://elsewhere.example/r", env)).toThrow(CliError);
  });

  it("refuses to send a key to a registry a repository chose", () => {
    // components.json is part of the repository. One that names its own
    // server must not receive the key of whoever runs `add` in it.
    const env = scratchEnv();
    writeToken("k", env);

    expect(() => credentialsFor("https://attacker.example/r", env)).toThrow(
      /Not sending your licence key/,
    );
  });

  it("refuses plain HTTP, even to the right host", () => {
    const env = scratchEnv();
    writeToken("k", env, "https://acme.example/r");

    expect(() => credentialsFor("http://acme.example/r", env)).toThrow(/not an HTTPS address/);
  });

  it("scopes an environment key to the default registry unless told otherwise", () => {
    const env: NodeJS.ProcessEnv = { ...scratchEnv(), [TOKEN_ENV]: "ci-key" };
    expect(credentialsFor(branding.registryUrl, env)?.token).toBe("ci-key");
    expect(() => credentialsFor("https://mirror.example/r", env)).toThrow(
      expect.objectContaining({ hint: expect.stringContaining(TOKEN_REGISTRY_ENV) as string }),
    );

    env[TOKEN_REGISTRY_ENV] = "https://mirror.example/r";
    expect(credentialsFor("https://mirror.example/r", env)?.token).toBe("ci-key");
  });
});
