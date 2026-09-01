import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { add } from "../src/commands/add";
import { init, insertTokens, TOKENS_MARKER } from "../src/commands/init";
import { list } from "../src/commands/list";
import { remove } from "../src/commands/remove";
import { update } from "../src/commands/update";
import { readConfig } from "../src/lib/config";
import { CliError } from "../src/lib/errors";
import { createProject, LOCAL_REGISTRY } from "./fixtures";

/**
 * End-to-end against real scratch projects and the registry built in this same
 * commit. Dependency installation is skipped — spawning a package manager would
 * make these tests network-bound and slow without exercising any of our logic.
 */

const created: string[] = [];

function project(...args: Parameters<typeof createProject>): string {
  const root = createProject(...args);
  created.push(root);
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const root of created.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

beforeAll(() => {
  if (!existsSync(join(LOCAL_REGISTRY, "index.json"))) {
    throw new Error(
      `No registry at ${LOCAL_REGISTRY}. Run \`pnpm --filter @dowel/registry build\` first.`,
    );
  }
});

async function initialise(root: string) {
  await init({ cwd: root, registry: LOCAL_REGISTRY, yes: true, skipInstall: true });
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("init", () => {
  it("writes a config describing the project it found", async () => {
    const root = project();
    await initialise(root);

    const config = readConfig(root);
    expect(config.typescript).toBe(true);
    expect(config.tailwind.css).toBe("src/index.css");
    expect(config.resolve).toEqual({ prefix: "@/", base: "src" });
    expect(config.aliases.ui).toBe("@/components/ui");
  });

  it("writes the utilities every component imports", async () => {
    const root = project();
    await initialise(root);

    expect(read(root, "src/lib/utils.ts")).toContain("export function cn(");
    expect(read(root, "src/lib/styles.ts")).toContain("focusRing");
  });

  it("appends the design tokens after the Tailwind import", async () => {
    const root = project();
    await initialise(root);

    const css = read(root, "src/index.css");
    expect(css.indexOf('@import "tailwindcss"')).toBeLessThan(css.indexOf("@theme"));
    expect(css).toContain("--color-neutral-950");
    expect(css).toContain("--radius-scale");
  });

  it("keeps what the stylesheet already contained", async () => {
    const root = project();
    await initialise(root);
    expect(read(root, "src/index.css")).toContain("margin: 0;");
  });

  it("adapts to a different alias and directory layout", async () => {
    const root = project({ prefix: "~/", base: "app" });
    await initialise(root);

    const config = readConfig(root);
    expect(config.aliases.ui).toBe("~/components/ui");
    expect(existsSync(join(root, "app/lib/utils.ts"))).toBe(true);
  });

  it("finds a stylesheet that is not called globals.css", async () => {
    const root = project({ cssPath: "app/main.css" });
    await initialise(root);
    expect(readConfig(root).tailwind.css).toBe("app/main.css");
  });

  it("is idempotent", async () => {
    const root = project();
    await initialise(root);
    const first = read(root, "src/index.css");

    await initialise(root);
    expect(read(root, "src/index.css")).toBe(first);
  });

  describe("refuses a project it cannot support", () => {
    it("rejects Tailwind v3 rather than writing v4 syntax into it", async () => {
      const root = project({ tailwind: "^3.4.19" });
      await expect(initialise(root)).rejects.toThrow(/Tailwind CSS v3 is not supported/);
    });

    it("rejects a project with no Tailwind at all", async () => {
      const root = project({ tailwind: null });
      await expect(initialise(root)).rejects.toThrow(/Tailwind CSS is not installed/);
    });

    it("rejects a JavaScript project rather than shipping broken output", async () => {
      const root = project({ typescript: false });
      await expect(initialise(root)).rejects.toThrow(/JavaScript projects are not supported/);
    });

    it("rejects a non-React project", async () => {
      const root = project({ react: null });
      await expect(initialise(root)).rejects.toThrow(/does not look like a React project/);
    });
  });
});

describe("add", () => {
  it("refuses to run before init", async () => {
    const root = project();
    await expect(
      add(["button"], {
        cwd: root,
        registry: LOCAL_REGISTRY,
        yes: true,
        overwrite: false,
        skipInstall: true,
      }),
    ).rejects.toThrow(CliError);
  });

  async function addTo(root: string, names: string[], overwrite = false) {
    await add(names, {
      cwd: root,
      registry: LOCAL_REGISTRY,
      yes: true,
      overwrite,
      skipInstall: true,
    });
  }

  it("writes the component into the configured directory", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["card"]);

    expect(existsSync(join(root, "src/components/ui/card.tsx"))).toBe(true);
    expect(read(root, "src/components/ui/card.tsx")).toContain("export function Card(");
  });

  it("pulls in registry dependencies without being asked", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["button"]);

    // Button imports Spinner; installing one without the other would not compile.
    expect(existsSync(join(root, "src/components/ui/spinner.tsx"))).toBe(true);
  });

  it("resolves transitive dependencies through more than one level", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["date-picker"]);

    for (const file of ["date-picker", "calendar", "popover", "button", "spinner"]) {
      expect(existsSync(join(root, `src/components/ui/${file}.tsx`))).toBe(true);
    }
  });

  it("installs a shared dependency once", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["button", "badge"]);

    const config = readConfig(root);
    expect(Object.keys(config.installed)).toContain("spinner");
  });

  it("rewrites imports to the project's own alias", async () => {
    const root = project({ prefix: "~/", base: "app" });
    await initialise(root);
    await addTo(root, ["button"]);

    const source = read(root, "app/components/ui/button.tsx");
    expect(source).toContain('from "~/components/ui/spinner"');
    expect(source).toContain('from "~/lib/utils"');
    expect(source).not.toContain('from "@/');
  });

  it("records a hash for everything it wrote", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["badge"]);

    const config = readConfig(root);
    const files = config.installed.badge?.files ?? {};
    expect(Object.keys(files)).toEqual(["src/components/ui/badge.tsx"]);
    expect(Object.values(files)[0]).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is a no-op when run again", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["badge"]);

    const before = read(root, "src/components/ui/badge.tsx");
    await addTo(root, ["badge"]);
    expect(read(root, "src/components/ui/badge.tsx")).toBe(before);
  });

  it("never overwrites a file the user has edited", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["badge"]);

    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// my own version\n");

    await addTo(root, ["badge"]);
    expect(readFileSync(path, "utf8")).toBe("// my own version\n");
  });

  it("replaces an edited file only when told to", async () => {
    const root = project();
    await initialise(root);
    await addTo(root, ["badge"]);

    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// my own version\n");

    await addTo(root, ["badge"], true);
    expect(readFileSync(path, "utf8")).toContain("export function Badge(");
  });

  describe("blocks", () => {
    it("installs a block into the blocks directory", async () => {
      const root = project();
      await initialise(root);
      await addTo(root, ["login"]);

      expect(existsSync(join(root, "src/components/blocks/login.tsx"))).toBe(true);
    });

    it("pulls in every component the block is assembled from", async () => {
      const root = project();
      await initialise(root);
      await addTo(root, ["login"]);

      for (const component of [
        "button",
        "card",
        "checkbox",
        "form",
        "input",
        "label",
        "separator",
      ]) {
        expect(
          existsSync(join(root, `src/components/ui/${component}.tsx`)),
          `${component} was not installed`,
        ).toBe(true);
      }
    });

    it("resolves a block's whole component tree, not just its direct imports", async () => {
      const root = project();
      await initialise(root);
      await addTo(root, ["ai-chat"]);

      // ai-chat needs button; button needs spinner. Nothing declares spinner
      // directly, so this only works if resolution is transitive.
      expect(existsSync(join(root, "src/components/ui/spinner.tsx"))).toBe(true);
      expect(existsSync(join(root, "src/components/ui/ai-conversation.tsx"))).toBe(true);
    });

    it("rewrites a block's imports to the project's alias", async () => {
      const root = project({ prefix: "~/", base: "app" });
      await initialise(root);
      await addTo(root, ["login"]);

      const source = read(root, "app/components/blocks/login.tsx");
      expect(source).toContain('from "~/components/ui/button"');
      expect(source).toContain('from "~/lib/utils"');
      expect(source).not.toContain('from "@/');
    });

    it("records the block's install hash like any other entry", async () => {
      const root = project();
      await initialise(root);
      await addTo(root, ["dashboard"]);

      const config = readConfig(root);
      const files = config.installed.dashboard?.files ?? {};
      expect(Object.keys(files)).toEqual(["src/components/blocks/dashboard.tsx"]);
      expect(Object.values(files)[0]).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
  });

  it("reports an unknown component clearly", async () => {
    const root = project();
    await initialise(root);
    await expect(addTo(root, ["nope"])).rejects.toThrow(/not found/i);
  });

  it("requires at least one name", async () => {
    const root = project();
    await initialise(root);
    await expect(addTo(root, [])).rejects.toThrow(/Name at least one component/);
  });
});

describe("list", () => {
  it("lists the registry as JSON, marking what is installed", async () => {
    const root = project();
    await initialise(root);
    await add(["button"], {
      cwd: root,
      registry: LOCAL_REGISTRY,
      yes: true,
      overwrite: false,
      skipInstall: true,
    });

    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await list({ cwd: root, registry: LOCAL_REGISTRY, json: true });

    const output = JSON.parse(log.mock.calls[0]?.[0] as string) as {
      name: string;
      installed: boolean;
    }[];

    expect(output.find((item) => item.name === "button")?.installed).toBe(true);
    expect(output.find((item) => item.name === "dialog")?.installed).toBe(false);
    // Only components, not the utils or theme items.
    expect(output.some((item) => item.name === "theme")).toBe(false);
  });

  it("works before init", async () => {
    const root = project();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await list({ cwd: root, registry: LOCAL_REGISTRY, json: true });
    expect(log).toHaveBeenCalled();
  });

  it("filters by category", async () => {
    const root = project();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await list({ cwd: root, registry: LOCAL_REGISTRY, json: true, category: "overlay" });
    const output = JSON.parse(log.mock.calls[0]?.[0] as string) as { category: string }[];

    expect(output.length).toBeGreaterThan(0);
    expect(output.every((item) => item.category === "overlay")).toBe(true);
  });
});

describe("remove", () => {
  async function setup(names: string[] = ["badge"]) {
    const root = project();
    await initialise(root);
    await add(names, {
      cwd: root,
      registry: LOCAL_REGISTRY,
      yes: true,
      overwrite: false,
      skipInstall: true,
    });
    return root;
  }

  function removeFrom(root: string, names: string[], force = false) {
    return remove(names, { cwd: root, yes: true, force });
  }

  it("deletes an untouched component", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    expect(existsSync(path)).toBe(true);

    await removeFrom(root, ["badge"]);
    expect(existsSync(path)).toBe(false);
    expect(readConfig(root).installed.badge).toBeUndefined();
  });

  it("keeps a file the user has edited", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// mine\n");

    await removeFrom(root, ["badge"]);
    // Deleting is the one irreversible thing here; the user's work is not ours
    // to throw away.
    expect(readFileSync(path, "utf8")).toBe("// mine\n");
  });

  it("deletes an edited file only when forced", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// mine\n");

    await removeFrom(root, ["badge"], true);
    expect(existsSync(path)).toBe(false);
  });

  it("refuses to remove something another component still needs", async () => {
    const root = await setup(["button"]);

    // button imports spinner; removing spinner alone would break button.
    await expect(removeFrom(root, ["spinner"])).rejects.toThrow(/Nothing was removed/);
    expect(existsSync(join(root, "src/components/ui/spinner.tsx"))).toBe(true);
  });

  it("allows removing a dependency alongside its dependent", async () => {
    const root = await setup(["button"]);

    await removeFrom(root, ["button", "spinner"]);
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/components/ui/spinner.tsx"))).toBe(false);
  });

  it("removes a block without touching the components it used", async () => {
    const root = await setup(["login"]);

    await removeFrom(root, ["login"]);
    expect(existsSync(join(root, "src/components/blocks/login.tsx"))).toBe(false);
    // The components are still installed and may be used by other code.
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(true);
  });

  it("refuses to remove something that is not installed", async () => {
    const root = await setup();
    await expect(removeFrom(root, ["dialog"])).rejects.toThrow(/Not installed/);
  });

  it("requires at least one name", async () => {
    const root = await setup();
    await expect(removeFrom(root, [])).rejects.toThrow(/Name at least one component/);
  });
});

describe("update", () => {
  async function setup() {
    const root = project();
    await initialise(root);
    await add(["badge"], {
      cwd: root,
      registry: LOCAL_REGISTRY,
      yes: true,
      overwrite: false,
      skipInstall: true,
    });
    return root;
  }

  it("reports a freshly installed component as up to date", async () => {
    const root = await setup();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await update([], { cwd: root, registry: LOCAL_REGISTRY, overwrite: false, yes: true });

    const output = log.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("up to date");
  });

  it("restores a file that was deleted", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    rmSync(path);

    await update([], { cwd: root, registry: LOCAL_REGISTRY, overwrite: false, yes: true });
    expect(existsSync(path)).toBe(true);
  });

  it("leaves a locally modified file alone", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// mine\n");

    await update([], { cwd: root, registry: LOCAL_REGISTRY, overwrite: false, yes: true });
    expect(readFileSync(path, "utf8")).toBe("// mine\n");
  });

  it("replaces a locally modified file when told to", async () => {
    const root = await setup();
    const path = join(root, "src/components/ui/badge.tsx");
    writeFileSync(path, "// mine\n");

    await update([], { cwd: root, registry: LOCAL_REGISTRY, overwrite: true, yes: true });
    expect(readFileSync(path, "utf8")).toContain("export function Badge(");
  });

  it("refuses to update something that is not installed", async () => {
    const root = await setup();
    await expect(
      update(["dialog"], { cwd: root, registry: LOCAL_REGISTRY, overwrite: false, yes: true }),
    ).rejects.toThrow(/Not installed/);
  });

  it("refuses when nothing is installed at all", async () => {
    const root = project();
    await initialise(root);

    const config = readConfig(root);
    writeFileSync(
      join(root, "components.json"),
      `${JSON.stringify({ ...config, installed: {} }, null, 2)}\n`,
    );

    await expect(
      update([], { cwd: root, registry: LOCAL_REGISTRY, overwrite: false, yes: true }),
    ).rejects.toThrow(/Nothing is installed/);
  });
});

describe("insertTokens", () => {
  it("inserts after the Tailwind import so @theme is processed", () => {
    const result = insertTokens(
      '@import "tailwindcss";\n\nbody { margin: 0; }\n',
      "@theme { }",
    );
    expect(result.indexOf("@import")).toBeLessThan(result.indexOf("@theme"));
    expect(result).toContain("body { margin: 0; }");
  });

  it("appends when there is no Tailwind import to anchor to", () => {
    const result = insertTokens("body { margin: 0; }\n", "@theme { }");
    expect(result).toContain("@theme { }");
  });

  it("does not insert twice when the block carries no marker", () => {
    const once = insertTokens('@import "tailwindcss";\n', "@theme { }");
    expect(insertTokens(once, "@theme { }")).toBe(once);
  });

  it("does not re-insert after the user has edited their tokens", () => {
    const original = insertTokens(
      '@import "tailwindcss";\n',
      `${TOKENS_MARKER}\n@theme { --color-primary: red; }`,
    );
    const edited = original.replace("red", "blue");

    // The content no longer matches what was published, but the marker says the
    // project has already been initialised — re-inserting would trample the edit.
    expect(insertTokens(edited, `${TOKENS_MARKER}\n@theme { --color-primary: red; }`)).toBe(
      edited,
    );
  });
});
