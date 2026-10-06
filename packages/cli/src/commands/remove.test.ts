import { describe, expect, it } from "vitest";

import type { Config } from "../lib/config";
import { isRemovablePath } from "./remove";

function config(base: string): Config {
  return {
    version: 1,
    typescript: true,
    registry: "https://example.test/r",
    tailwind: { css: "src/index.css" },
    aliases: {
      components: "@/components",
      ui: "@/components/ui",
      lib: "@/lib",
      hooks: "@/hooks",
      utils: "@/lib/utils",
    },
    resolve: { prefix: "@/", base },
    installed: {},
  };
}

describe("isRemovablePath", () => {
  it("allows files inside the directories components install into", () => {
    expect(isRemovablePath(config("src"), "src/components/ui/button.tsx")).toBe(true);
    expect(isRemovablePath(config("src"), "src/lib/utils.ts")).toBe(true);
    // No blocks alias: falls back to <components>/blocks.
    expect(isRemovablePath(config("src"), "src/components/blocks/login.tsx")).toBe(true);
  });

  it("refuses anything else the config might name", () => {
    expect(isRemovablePath(config("src"), "package.json")).toBe(false);
    expect(isRemovablePath(config("src"), "src/index.css")).toBe(false);
    expect(isRemovablePath(config("src"), "src/components/ui/../../../.env")).toBe(false);
    expect(isRemovablePath(config("src"), "/etc/passwd")).toBe(false);
    expect(isRemovablePath(config("src"), "src/components")).toBe(false);
  });

  it("follows an alias that lives outside the project, as in a monorepo", () => {
    // tsconfig paths may point at a sibling package; that is the user's own
    // layout, and removal has to keep working there.
    const shared = config("../shared/src");
    expect(isRemovablePath(shared, "../shared/src/components/ui/button.tsx")).toBe(true);
    expect(isRemovablePath(shared, "../other/secret.ts")).toBe(false);
  });
});
