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

import {
  authPath,
  clearToken,
  configDirectory,
  maskToken,
  readToken,
  TOKEN_ENV,
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

    expect(readToken(env)).toEqual({ token: "licence-key", source: "file" });
  });

  it("lets the environment win, because CI has no interactive login", () => {
    const env = scratchEnv();
    writeToken("from-file", env);
    env[TOKEN_ENV] = "from-env";

    expect(readToken(env)).toEqual({ token: "from-env", source: "env" });
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
