import { describe, expect, it } from "vitest";

import { isSafeRegistryPath, npmDependencySchema, registryItemNameSchema } from "./schema";

/**
 * The registry decides where files land in someone else's project and what
 * their package manager installs. These are the strings that make that safe.
 */

describe("isSafeRegistryPath", () => {
  it.each(["ui/button.tsx", "lib/utils.ts", "blocks/login/login.tsx", "theme.css"])(
    "accepts %s",
    (path) => {
      expect(isSafeRegistryPath(path)).toBe(true);
    },
  );

  it.each([
    ["", "empty"],
    ["/etc/passwd", "absolute"],
    ["ui/../../.bashrc", "climbing out"],
    ["..", "the parent itself"],
    ["ui/./button.tsx", "a dot segment"],
    ["ui//button.tsx", "an empty segment"],
    ["ui\\..\\..\\x.tsx", "backslash separators"],
    ["C:/Windows/x.tsx", "a drive letter"],
    ["ui/x\0.tsx", "NUL"],
  ])("refuses %j (%s)", (path) => {
    expect(isSafeRegistryPath(path)).toBe(false);
  });
});

describe("npmDependencySchema", () => {
  it.each(["radix-ui", "@tanstack/react-table", "motion@^12.0.0", "diff@>=8", "JSONStream"])(
    "accepts %s",
    (spec) => {
      expect(npmDependencySchema.safeParse(spec).success).toBe(true);
    },
  );

  it.each([
    "git+https://example.com/x.git",
    "https://example.com/x.tgz",
    "file:../x",
    "../x",
    "..",
    "github:user/repo",
    "npm:other@1",
    "-g",
    "x y",
  ])("refuses %s", (spec) => {
    expect(npmDependencySchema.safeParse(spec).success).toBe(false);
  });
});

describe("registryItemNameSchema", () => {
  it("accepts the names the registry uses", () => {
    expect(registryItemNameSchema.safeParse("date-picker").success).toBe(true);
  });

  it.each(["../x", "a/b", "Button", "-x", ""])("refuses %j", (name) => {
    expect(registryItemNameSchema.safeParse(name).success).toBe(false);
  });
});
