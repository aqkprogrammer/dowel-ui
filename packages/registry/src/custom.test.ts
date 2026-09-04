import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { assertResolvable, buildCustomRegistry, defineRegistryConfig } from "./custom";
import { writeRegistry } from "./build";
import type { RegistryItem } from "./schema";

const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "custom-registry-"));
  roots.push(root);
  return root;
}

/** Writes `<root>/<group>/<name>/<file>`, the layout the builder expects. */
function writeItem(root: string, group: string, name: string, file: string, content: string) {
  const directory = join(root, group, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, file), content);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const BASE = {
  title: "Acme Header",
  description: "The header every Acme product uses.",
  category: "layout",
  files: ["acme-header.tsx"],
};

describe("buildCustomRegistry", () => {
  it("publishes an organisation's own component", async () => {
    const root = scratch();
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      "export const AcmeHeader = () => null;",
    );

    const result = await buildCustomRegistry(
      defineRegistryConfig({ root, items: [{ name: "acme-header", ...BASE }] }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("acme-header");
    expect(result.items[0]?.files[0]?.path).toBe("ui/acme-header.tsx");
    expect(result.items[0]?.files[0]?.hash).toMatch(/^sha256:/);
  });

  it("writes a block's files where blocks are installed", async () => {
    const root = scratch();
    writeItem(
      root,
      "blocks",
      "acme-shell",
      "acme-shell.tsx",
      "export const Shell = () => null;",
    );

    const result = await buildCustomRegistry({
      root,
      items: [{ name: "acme-shell", ...BASE, group: "blocks", files: ["acme-shell.tsx"] }],
    });

    expect(result.items[0]?.type).toBe("registry:block");
    expect(result.items[0]?.files[0]?.path).toBe("blocks/acme-shell.tsx");
  });

  it("names the file it cannot read, rather than emitting a broken item", async () => {
    const root = scratch();

    await expect(
      buildCustomRegistry({ root, items: [{ name: "acme-header", ...BASE }] }),
    ).rejects.toThrow(/does not exist/);
  });

  it("refuses a name declared twice", async () => {
    const root = scratch();
    writeItem(root, "ui", "acme-header", "acme-header.tsx", "x");

    await expect(
      buildCustomRegistry({
        root,
        items: [
          { name: "acme-header", ...BASE },
          { name: "acme-header", ...BASE },
        ],
      }),
    ).rejects.toThrow(/more than once/);
  });

  it("refuses a dependency nothing in the registry provides", async () => {
    const root = scratch();
    writeItem(root, "ui", "acme-header", "acme-header.tsx", "x");

    // The most common way a hand-assembled registry is broken, and it is
    // invisible until somebody runs `add`.
    await expect(
      buildCustomRegistry({
        root,
        items: [{ name: "acme-header", ...BASE, registryDependencies: ["button"] }],
      }),
    ).rejects.toThrow(/not in the registry/);
  });
});

describe("extending an upstream registry", () => {
  /** A real upstream on disk: this repository's own registry output. */
  function upstream(): string {
    const out = scratch();
    writeRegistry(out);
    return out;
  }

  it("serves upstream's components alongside the organisation's own", async () => {
    const root = scratch();
    writeItem(root, "ui", "acme-header", "acme-header.tsx", "x");

    const result = await buildCustomRegistry({
      root,
      extends: upstream(),
      items: [{ name: "acme-header", ...BASE, registryDependencies: ["button"] }],
    });

    const names = result.items.map((item) => item.name);
    expect(names).toContain("acme-header");
    expect(names).toContain("button");
    expect(result.inherited).toBeGreaterThan(50);
  });

  it("lets a local item replace an upstream one, and says which", async () => {
    const root = scratch();
    writeItem(root, "ui", "button", "button.tsx", 'export const Button = () => "acme";');

    const result = await buildCustomRegistry({
      root,
      extends: upstream(),
      items: [
        {
          name: "button",
          title: "Acme Button",
          description: "Acme's button, replacing the upstream one.",
          category: "foundation",
          files: ["button.tsx"],
        },
      ],
    });

    // Overriding upstream's Button is legitimate to want and catastrophic by
    // accident; the difference is whether anyone was told.
    expect(result.overridden).toEqual(["button"]);

    const button = result.items.find((item) => item.name === "button");
    expect(button?.title).toBe("Acme Button");
    // The local source, not upstream's — an override that kept upstream's body
    // would be the worst of both.
    expect(button?.files[0]?.content).toBe('export const Button = () => "acme";');
  });

  it("reports no override when nothing collides", async () => {
    const root = scratch();
    writeItem(root, "ui", "acme-header", "acme-header.tsx", "x");

    const result = await buildCustomRegistry({
      root,
      extends: upstream(),
      items: [{ name: "acme-header", ...BASE }],
    });

    expect(result.overridden).toEqual([]);
  });

  it("sorts the merged registry, so the output does not depend on merge order", async () => {
    const root = scratch();
    writeItem(root, "ui", "acme-header", "acme-header.tsx", "x");

    const result = await buildCustomRegistry({
      root,
      extends: upstream(),
      items: [{ name: "acme-header", ...BASE }],
    });

    const names = result.items.map((item) => item.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("assertResolvable", () => {
  function item(name: string, dependencies: string[] = []): RegistryItem {
    return {
      registryVersion: 1,
      name,
      type: "registry:ui",
      title: name,
      description: "Long enough to satisfy the schema.",
      category: "foundation",
      status: "stable",
      dependencies: [],
      registryDependencies: dependencies,
      access: "free",
      files: [
        {
          path: `ui/${name}.tsx`,
          type: "registry:ui",
          content: "x",
          hash: `sha256:${"0".repeat(64)}`,
        },
      ],
    };
  }

  it("accepts a registry whose dependencies all resolve", () => {
    expect(() => {
      assertResolvable([item("button"), item("card", ["button"])]);
    }).not.toThrow();
  });

  it("names every unresolvable edge, not just the first", () => {
    expect(() => {
      assertResolvable([item("card", ["button", "spinner"])]);
    }).toThrow(/card → button[\s\S]*card → spinner/);
  });
});

describe("authoring mistakes the builder refuses", () => {
  it("catches an import written against the installed path", async () => {
    const root = scratch();
    // Looks right — it is where the file ends up — and rewrites to
    // `@/components/ui/ui/badge`, which resolves nowhere.
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      'import { Badge } from "@/components/ui/badge";',
    );

    await expect(
      buildCustomRegistry({
        root,
        items: [{ name: "acme-header", ...BASE, registryDependencies: ["badge"] }],
      }),
    ).rejects.toThrow(/installed path rather than an authored one/);
  });

  it("catches a component importing something it never declared", async () => {
    const root = scratch();
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      'import { Badge } from "@/components/badge";',
    );

    await expect(
      buildCustomRegistry({ root, items: [{ name: "acme-header", ...BASE }] }),
    ).rejects.toThrow(/does not list them in registryDependencies/);
  });

  it("accepts the authored form with the dependency declared", async () => {
    const root = scratch();
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      'import { Badge } from "@/components/badge";\nimport { cn } from "@/lib/utils";',
    );

    const result = await buildCustomRegistry({
      root,
      items: [{ name: "acme-header", ...BASE, registryDependencies: ["badge"] }],
      extends: (() => {
        const out = scratch();
        writeRegistry(out);
        return out;
      })(),
    });

    expect(result.items.find((item) => item.name === "acme-header")).toBeDefined();
  });

  it("does not demand a declaration for the utilities init writes", async () => {
    const root = scratch();
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      'import { cn } from "@/lib/utils";',
    );

    await expect(
      buildCustomRegistry({ root, items: [{ name: "acme-header", ...BASE }] }),
    ).resolves.toBeDefined();
  });

  it("lets a component import its own other files", async () => {
    const root = scratch();
    writeItem(
      root,
      "ui",
      "acme-header",
      "acme-header.tsx",
      'import { useHeader } from "@/components/acme-header/use-header";',
    );

    await expect(
      buildCustomRegistry({ root, items: [{ name: "acme-header", ...BASE }] }),
    ).resolves.toBeDefined();
  });
});
