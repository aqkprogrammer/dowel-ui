import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CONFIG_FILE, readConfig } from "./config";

const roots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function projectWith(registry: string): string {
  const root = mkdtempSync(join(tmpdir(), "dowel-config-"));
  roots.push(root);
  writeFileSync(
    join(root, CONFIG_FILE),
    JSON.stringify({
      version: 1,
      typescript: true,
      registry,
      tailwind: { css: "src/index.css" },
      aliases: {
        components: "@/components",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
        utils: "@/lib/utils",
      },
      resolve: { prefix: "@/", base: "src" },
    }),
  );
  return root;
}

describe("readConfig with the registry's previous host", () => {
  it("says so once per run, and changes neither the value nor the file", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const root = projectWith("https://dowel-eight.vercel.app/r");
    const before = readFileSync(join(root, CONFIG_FILE), "utf8");

    // Commands that write components.json back would otherwise rewrite the
    // user's file as a side effect of `add`.
    expect(readConfig(root).registry).toBe("https://dowel-eight.vercel.app/r");
    expect(readConfig(root).registry).toBe("https://dowel-eight.vercel.app/r");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("old address");
    expect(readFileSync(join(root, CONFIG_FILE), "utf8")).toBe(before);
  });
});
