import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { walkTextFiles } from "./walk";

/**
 * The walker decides what `rebrand` rewrites and what `check-branding` inspects,
 * so anything it cannot see is invisible to both. That is not theoretical: the
 * LICENSE carried its placeholder copyright through a complete rename because
 * the extension test computed `"E"` for a file with no dot in its name.
 */
describe("walkTextFiles", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "walk-test-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function write(path: string, contents = "x") {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, contents);
  }

  it("finds files with known text extensions", () => {
    write("a.ts");
    write("b.md");
    write("nested/c.css");
    expect(walkTextFiles(root).sort()).toEqual(["a.ts", "b.md", "nested/c.css"]);
  });

  it("finds extensionless text files", () => {
    // The regression. A dotless name must not be mistaken for an extension.
    write("LICENSE");
    write("NOTICE");
    expect(walkTextFiles(root)).toContain("LICENSE");
    expect(walkTextFiles(root)).toContain("NOTICE");
  });

  it("does not mistake a trailing character for an extension", () => {
    // "Dockerfile" ends in "e"; "README" ends in "E". Neither is an extension,
    // and neither should be admitted by accident.
    write("Dockerfile");
    write("somefile");
    expect(walkTextFiles(root)).not.toContain("Dockerfile");
    expect(walkTextFiles(root)).not.toContain("somefile");
  });

  it("skips binaries and unknown extensions", () => {
    write("logo.png");
    write("archive.zip");
    expect(walkTextFiles(root)).toEqual([]);
  });

  it("skips ignored directories", () => {
    write("node_modules/pkg/index.ts");
    write("dist/out.js");
    write("src/real.ts");
    expect(walkTextFiles(root)).toEqual(["src/real.ts"]);
  });

  it("skips the lockfile and changelog, which are noise for branding", () => {
    write("pnpm-lock.yaml");
    write("CHANGELOG.md");
    write("README.md");
    expect(walkTextFiles(root)).toEqual(["README.md"]);
  });

  it("returns paths relative to the root, sorted", () => {
    write("z.ts");
    write("a/b.ts");
    expect(walkTextFiles(root)).toEqual(["a/b.ts", "z.ts"]);
  });
});
