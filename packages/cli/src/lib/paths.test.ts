import { describe, expect, it } from "vitest";

import type { Config } from "./config";
import { CliError } from "./errors";
import { aliasToDirectory, resolveDestination, rewriteImports } from "./paths";

function config(overrides: Partial<Config> = {}): Config {
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
      blocks: "@/components/blocks",
    },
    resolve: { prefix: "@/", base: "src" },
    installed: {},
    ...overrides,
  };
}

describe("aliasToDirectory", () => {
  it("resolves an alias through the configured prefix and base", () => {
    expect(aliasToDirectory(config(), "@/components/ui")).toBe("src/components/ui");
    expect(aliasToDirectory(config(), "@/lib")).toBe("src/lib");
  });

  it("handles a project with no base directory", () => {
    const flat = config({ resolve: { prefix: "@/", base: "" } });
    expect(aliasToDirectory(flat, "@/components/ui")).toBe("components/ui");
  });

  it("handles a non-default prefix", () => {
    const tilde = config({
      resolve: { prefix: "~/", base: "app" },
      aliases: {
        components: "~/components",
        ui: "~/components/ui",
        lib: "~/lib",
        hooks: "~/hooks",
        utils: "~/lib/utils",
      },
    });
    expect(aliasToDirectory(tilde, "~/components/ui")).toBe("app/components/ui");
  });

  it("refuses an alias that does not match the prefix", () => {
    expect(() => aliasToDirectory(config(), "~/components")).toThrow(CliError);
  });
});

describe("resolveDestination", () => {
  it("maps a component into the ui alias", () => {
    expect(resolveDestination(config(), "ui/button.tsx")).toBe("src/components/ui/button.tsx");
  });

  it("maps a utility into the lib alias", () => {
    expect(resolveDestination(config(), "lib/utils.ts")).toBe("src/lib/utils.ts");
  });

  it("maps a hook into the hooks alias", () => {
    expect(resolveDestination(config(), "hooks/use-thing.ts")).toBe("src/hooks/use-thing.ts");
  });

  it("maps a block into the blocks alias", () => {
    expect(resolveDestination(config(), "blocks/login.tsx")).toBe(
      "src/components/blocks/login.tsx",
    );
  });

  it("derives a blocks directory when the config predates blocks", () => {
    // A components.json written before blocks existed still has to install one.
    const legacy = config({
      aliases: {
        components: "@/components",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
        utils: "@/lib/utils",
      },
    });
    expect(resolveDestination(legacy, "blocks/login.tsx")).toBe(
      "src/components/blocks/login.tsx",
    );
  });

  it("rejects an unknown group rather than guessing a destination", () => {
    expect(() => resolveDestination(config(), "mystery/thing.ts")).toThrow(/unknown group/);
  });

  it("rejects a path with no group", () => {
    expect(() => resolveDestination(config(), "button.tsx")).toThrow(CliError);
  });
});

describe("rewriteImports", () => {
  it("leaves a matching project untouched", () => {
    const source = 'import { cn } from "@/lib/utils";';
    expect(rewriteImports(source, config())).toBe(source);
  });

  it("rewrites the utils import to the configured alias", () => {
    const custom = config({
      resolve: { prefix: "~/", base: "app" },
      aliases: {
        components: "~/ui",
        ui: "~/ui",
        lib: "~/utils",
        hooks: "~/hooks",
        utils: "~/utils/cn",
      },
    });

    expect(rewriteImports('import { cn } from "@/lib/utils";', custom)).toBe(
      'import { cn } from "~/utils/cn";',
    );
  });

  it("rewrites other lib imports under the lib alias", () => {
    const custom = config({
      aliases: { ...config().aliases, lib: "@/shared" },
    });

    expect(rewriteImports('import { focusRing } from "@/lib/styles";', custom)).toBe(
      'import { focusRing } from "@/shared/styles";',
    );
  });

  it("rewrites component imports under the ui alias", () => {
    const custom = config({
      aliases: { ...config().aliases, ui: "@/design/components" },
    });

    expect(rewriteImports('import { Spinner } from "@/components/spinner";', custom)).toBe(
      'import { Spinner } from "@/design/components/spinner";',
    );
  });

  it("handles single quotes", () => {
    const custom = config({ aliases: { ...config().aliases, utils: "@/helpers/cn" } });
    expect(rewriteImports("import { cn } from '@/lib/utils';", custom)).toBe(
      "import { cn } from '@/helpers/cn';",
    );
  });

  it("rewrites every import in a file", () => {
    const custom = config({
      aliases: {
        components: "~/components",
        ui: "~/components/ui",
        lib: "~/lib",
        hooks: "~/hooks",
        utils: "~/lib/utils",
      },
    });

    const source = [
      'import { Spinner } from "@/components/spinner";',
      'import { focusRing } from "@/lib/styles";',
      'import { cn } from "@/lib/utils";',
    ].join("\n");

    expect(rewriteImports(source, custom)).toBe(
      [
        'import { Spinner } from "~/components/ui/spinner";',
        'import { focusRing } from "~/lib/styles";',
        'import { cn } from "~/lib/utils";',
      ].join("\n"),
    );
  });

  it("does not touch unrelated imports or text mentioning the alias", () => {
    const source = [
      'import { useState } from "react";',
      'import { z } from "zod";',
      "// See @/lib/utils for details",
    ].join("\n");

    expect(rewriteImports(source, config())).toBe(source);
  });
});
