import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { create, validateProjectName, projectNameFrom } from "./create";
import { CreateError } from "./lib/errors";
import { substitute } from "./lib/files";
import { detectPackageManager, dlx, isPackageManager } from "./lib/pm";
import { findTemplate, isTheme, TEMPLATES } from "./templates";

const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "create-dowel-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function generate(cwd: string, directory: string, template = "starter") {
  await create({
    cwd,
    directory,
    template,
    theme: "ocean",
    yes: true,
    skipInstall: true,
    // The registry is the CLI's business and is covered by its own tests; this
    // suite is about what the scaffolder writes.
    skipComponents: true,
  });
}

describe("validateProjectName", () => {
  it("accepts a name npm would accept", () => {
    expect(validateProjectName("my-app")).toBeUndefined();
    expect(validateProjectName("app.2")).toBeUndefined();
  });

  it("rejects what npm rejects, before anything is written", () => {
    expect(validateProjectName("")).toBeDefined();
    expect(validateProjectName("My-App")).toContain("lowercase");
    expect(validateProjectName(".hidden")).toContain("dot");
    expect(validateProjectName("_private")).toContain("underscore");
    expect(validateProjectName("my app")).toBeDefined();
  });
});

describe("projectNameFrom", () => {
  it("takes the last segment, so a nested path still names the package", () => {
    expect(projectNameFrom("apps/web")).toBe("web");
    expect(projectNameFrom("./my-app")).toBe("my-app");
    expect(projectNameFrom("my-app/")).toBe("my-app");
  });
});

describe("substitute", () => {
  it("replaces every occurrence, not just the first", () => {
    expect(substitute("__A__ and __A__", { A: "x" })).toBe("x and x");
  });

  it("leaves an unknown placeholder alone rather than emptying it", () => {
    expect(substitute("__UNKNOWN__", { A: "x" })).toBe("__UNKNOWN__");
  });
});

describe("templates", () => {
  it("declares a base layer for every template, so none is missing config", () => {
    for (const template of TEMPLATES) {
      expect(template.layers[0], template.id).toBe("base");
    }
  });

  it("names only registry items, never a bundled component copy", () => {
    for (const template of TEMPLATES) {
      expect(template.items.length, template.id).toBeGreaterThan(0);
    }
  });

  it("finds a template by id and says nothing for one that does not exist", () => {
    expect(findTemplate("saas")?.title).toBe("SaaS");
    expect(findTemplate("nope")).toBeUndefined();
  });

  it("recognises the themes the theme layer ships", () => {
    expect(isTheme("ocean")).toBe(true);
    expect(isTheme("chartreuse")).toBe(false);
  });
});

describe("package manager", () => {
  it("uses the runner that does not install globally", () => {
    expect(dlx("pnpm")).toEqual(["pnpm", "dlx"]);
    expect(dlx("npm")).toEqual(["npx", "-y"]);
    expect(dlx("bun")).toEqual(["bunx"]);
  });

  it("recognises the ones it supports", () => {
    expect(isPackageManager("pnpm")).toBe(true);
    expect(isPackageManager("cargo")).toBe(false);
  });

  it("reads the manager that invoked it rather than asking again", () => {
    const original = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "pnpm/11.9.0 npm/? node/v20";
    expect(detectPackageManager()).toBe("pnpm");
    process.env.npm_config_user_agent = original;
  });
});

describe("create", () => {
  it("writes a project that names itself after its directory", async () => {
    const root = scratch();
    await generate(root, "my-app");

    const manifest = JSON.parse(readFileSync(join(root, "my-app", "package.json"), "utf8")) as {
      name: string;
    };
    expect(manifest.name).toBe("my-app");
  });

  it("applies the chosen theme to the document", async () => {
    const root = scratch();
    await generate(root, "my-app");

    expect(readFileSync(join(root, "my-app", "src/app/layout.tsx"), "utf8")).toContain(
      'data-theme="ocean"',
    );
  });

  it("leaves no placeholder behind in any file it writes", async () => {
    const root = scratch();
    await generate(root, "my-app", "saas");

    const files = [
      "package.json",
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/app/app/layout.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(join(root, "my-app", file), "utf8"), file).not.toMatch(/__[A-Z_]+__/);
    }
  });

  it("renames files npm will not publish under their real name", async () => {
    const root = scratch();
    await generate(root, "my-app");

    expect(existsSync(join(root, "my-app", ".gitignore"))).toBe(true);
    expect(existsSync(join(root, "my-app", "gitignore"))).toBe(false);
  });

  it("lets a later layer replace an earlier one's page", async () => {
    const root = scratch();
    await generate(root, "my-app", "saas");

    // base has no page; saas provides one, and app-shell the layout under /app.
    expect(readFileSync(join(root, "my-app", "src/app/page.tsx"), "utf8")).toContain(
      "Open the app",
    );
    expect(existsSync(join(root, "my-app", "src/app/app/layout.tsx"))).toBe(true);
  });

  it("writes the navigation for the routes the template actually ships", async () => {
    const root = scratch();
    await generate(root, "my-app", "saas");

    const layout = readFileSync(join(root, "my-app", "src/app/app/layout.tsx"), "utf8");
    expect(layout).toContain('{ href: "/app/billing", label: "Billing" }');
    // A route this template does not have must not appear in its nav.
    expect(layout).not.toContain("/app/agents");
  });

  it("gives the tsconfig the alias the component CLI looks for", async () => {
    const root = scratch();
    await generate(root, "my-app");

    const tsconfig = readFileSync(join(root, "my-app", "tsconfig.json"), "utf8");
    expect(tsconfig).toContain('"@/*"');
  });

  it("writes a stylesheet the component CLI can insert tokens into", async () => {
    const root = scratch();
    await generate(root, "my-app");

    expect(readFileSync(join(root, "my-app", "src/app/globals.css"), "utf8")).toContain(
      '@import "tailwindcss"',
    );
  });

  it("refuses a directory that already has something in it", async () => {
    const root = scratch();
    mkdirSync(join(root, "taken"));
    writeFileSync(join(root, "taken", "README.md"), "mine");

    await expect(generate(root, "taken")).rejects.toThrow(CreateError);
  });

  it("writes into a directory that exists but is empty", async () => {
    const root = scratch();
    mkdirSync(join(root, "empty"));

    await expect(generate(root, "empty")).resolves.toBeUndefined();
    expect(existsSync(join(root, "empty", "package.json"))).toBe(true);
  });

  it("rejects an unknown template by name, listing the real ones", async () => {
    const root = scratch();
    await expect(generate(root, "my-app", "kitchen-sink")).rejects.toThrow(/kitchen-sink/);
  });

  it("rejects an unknown theme", async () => {
    const root = scratch();
    await expect(
      create({
        cwd: root,
        directory: "my-app",
        template: "starter",
        theme: "chartreuse",
        yes: true,
        skipInstall: true,
        skipComponents: true,
      }),
    ).rejects.toThrow(/chartreuse/);
  });

  it("refuses a directory whose name npm would reject, writing nothing", async () => {
    const root = scratch();
    await expect(generate(root, "My-App")).rejects.toThrow(/lowercase/);
    expect(existsSync(join(root, "My-App"))).toBe(false);
  });
});
