import { describe, expect, it } from "vitest";

import { blockMetas } from "./blocks";
import { componentMetas } from "./components";
import { COMPONENT_CATEGORIES, COMPONENT_STATUSES, type ComponentMeta } from "./schema";

/**
 * Registry integrity.
 *
 * A registry that lies about a component's dependencies produces a broken
 * install for every user who runs `add`, and the failure surfaces in *their*
 * project rather than ours. So the declared metadata is checked against the
 * imports actually present in the source on every test run.
 */

const metaModules = {
  ...import.meta.glob<{ meta: ComponentMeta }>("../components/*/meta.ts", { eager: true }),
  ...import.meta.glob<{ meta: ComponentMeta }>("../blocks/*/meta.ts", { eager: true }),
};

const sourceFiles = {
  ...import.meta.glob<string>("../components/*/*.{ts,tsx}", {
    eager: true,
    query: "?raw",
    import: "default",
  }),
  ...import.meta.glob<string>("../blocks/*/*.{ts,tsx}", {
    eager: true,
    query: "?raw",
    import: "default",
  }),
};

const packageJson = import.meta.glob<string>("../../package.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

const declaredNpmDependencies = new Set(
  Object.keys(
    (
      JSON.parse(Object.values(packageJson)[0] ?? "{}") as {
        dependencies?: Record<string, string>;
      }
    ).dependencies ?? {},
  ),
);

/** Provided by the consuming app, never installed by the CLI. */
const PEER_PACKAGES = new Set(["react", "react-dom", "react/jsx-runtime"]);

/** Written by `<cli> init`, so components may import it without declaring it. */
const INSTALLED_BY_INIT = new Set(["@/lib/utils", "@/lib/styles"]);

function componentDir(metaPath: string): string {
  return metaPath.replace(/\/meta\.ts$/, "");
}

function componentName(metaPath: string): string {
  return componentDir(metaPath).split("/").pop() ?? "";
}

/** Collects module specifiers from `import`/`export ... from` and side-effect imports. */
function extractSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    if (match[1]) specifiers.push(match[1]);
  }
  for (const match of source.matchAll(/\bimport\s+["']([^"']+)["']/g)) {
    if (match[1]) specifiers.push(match[1]);
  }
  return specifiers;
}

/** `@scope/pkg/sub` -> `@scope/pkg`, `pkg/sub` -> `pkg`. */
function packageNameOf(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
}

interface ResolvedImports {
  npm: Set<string>;
  registry: Set<string>;
  internal: Set<string>;
  relative: Set<string>;
}

function resolveImports(sources: string[]): ResolvedImports {
  const resolved: ResolvedImports = {
    npm: new Set(),
    registry: new Set(),
    internal: new Set(),
    relative: new Set(),
  };

  for (const source of sources) {
    for (const specifier of extractSpecifiers(source)) {
      if (PEER_PACKAGES.has(specifier)) continue;

      if (specifier.startsWith("@/components/")) {
        const name = specifier.split("/")[2];
        if (name) resolved.registry.add(name);
      } else if (specifier.startsWith("@/")) {
        resolved.internal.add(specifier);
      } else if (specifier.startsWith(".")) {
        resolved.relative.add(specifier);
      } else {
        resolved.npm.add(packageNameOf(specifier));
      }
    }
  }

  return resolved;
}

const metaEntries = Object.entries(metaModules);

describe("registry metadata", () => {
  it("finds at least one component", () => {
    expect(metaEntries.length).toBeGreaterThan(0);
  });

  describe.each(metaEntries)("%s", (metaPath, module) => {
    const meta = module.meta;
    const dir = componentDir(metaPath);
    const dirName = componentName(metaPath);

    const shippedSources = meta.files
      .map((file) => sourceFiles[`${dir}/${file}`])
      .filter((source): source is string => typeof source === "string");

    it("exports a well-formed meta object", () => {
      expect(meta.name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(9);
      expect(COMPONENT_CATEGORIES).toContain(meta.category);
      expect(COMPONENT_STATUSES).toContain(meta.status);
      expect(meta.files.length).toBeGreaterThan(0);
    });

    it("uses its directory name as its registry name", () => {
      expect(meta.name).toBe(dirName);
    });

    it("lists only files that exist", () => {
      for (const file of meta.files) {
        expect(
          sourceFiles[`${dir}/${file}`],
          `${dir}/${file} is listed but missing`,
        ).toBeTypeOf("string");
      }
      expect(shippedSources).toHaveLength(meta.files.length);
    });

    it("ships an index, a test and a story", () => {
      expect(sourceFiles[`${dir}/index.ts`]).toBeTypeOf("string");
      expect(sourceFiles[`${dir}/${dirName}.test.tsx`]).toBeTypeOf("string");
      expect(sourceFiles[`${dir}/${dirName}.stories.tsx`]).toBeTypeOf("string");
    });

    it("declares exactly the npm packages its source imports", () => {
      const { npm } = resolveImports(shippedSources);
      expect([...npm].sort()).toEqual([...meta.dependencies].sort());
    });

    it("declares exactly the registry entries its source imports", () => {
      const { registry } = resolveImports(shippedSources);
      expect([...registry].sort()).toEqual([...meta.registryDependencies].sort());
    });

    it("does not let a component depend on a block", () => {
      // Blocks are assembled from components; the reverse would make a
      // component drag a whole page section into a project that wanted a button.
      if (meta.kind === "block") return;
      const blockNames = new Set(blockMetas.map((block) => block.name));
      for (const dependency of meta.registryDependencies) {
        expect(
          blockNames.has(dependency),
          `${meta.name} depends on block "${dependency}"`,
        ).toBe(false);
      }
    });

    it("only imports internal modules that `init` installs", () => {
      const { internal } = resolveImports(shippedSources);
      for (const specifier of internal) {
        expect(
          INSTALLED_BY_INIT.has(specifier),
          `${specifier} is imported but no CLI step installs it`,
        ).toBe(true);
      }
    });

    it("only uses relative imports that resolve inside the shipped file set", () => {
      const { relative } = resolveImports(shippedSources);
      for (const specifier of relative) {
        const target = specifier.replace(/^\.\//, "");
        const matches = meta.files.some((file) => file.replace(/\.tsx?$/, "") === target);
        expect(matches, `${specifier} is imported but not in meta.files`).toBe(true);
      }
    });

    it("declares dependencies that are actually installed in this workspace", () => {
      for (const dependency of meta.dependencies) {
        expect(
          declaredNpmDependencies.has(dependency),
          `${dependency} is declared in meta but missing from @dowel-ui/react dependencies`,
        ).toBe(true);
      }
    });
  });

  it("lists every entry in the registry barrels", () => {
    // The barrels are what the registry build reads. An entry that exists on
    // disk but is missing from one would simply never be publishable, with no
    // other signal that anything was wrong.
    const onDisk = metaEntries.map(([, module]) => module.meta.name).sort();
    const inBarrels = [...componentMetas, ...blockMetas].map((meta) => meta.name).sort();
    expect(inBarrels).toEqual(onDisk);
  });

  it("keeps components and blocks in separate barrels", () => {
    expect(componentMetas.every((meta) => meta.kind !== "block")).toBe(true);
    expect(blockMetas.every((meta) => meta.kind === "block")).toBe(true);
  });

  it("has no duplicate registry names", () => {
    const names = metaEntries.map(([, module]) => module.meta.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
