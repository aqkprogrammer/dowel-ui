import { describe, expect, it } from "vitest";

import { manualInstallFor, rewriteForDefaults } from "./manual-install";
import { getComponents, getRegistryItem } from "./registry";

describe("rewriteForDefaults", () => {
  it("moves component imports under ui and leaves lib alone, as the CLI does", () => {
    const source = [
      'import { cn } from "@/lib/utils";',
      'import { focusRing } from "@/lib/styles";',
      "import { Spinner } from '@/components/spinner';",
      'import { Hero } from "@/blocks/hero";',
    ].join("\n");

    expect(rewriteForDefaults(source)).toBe(
      [
        'import { cn } from "@/lib/utils";',
        'import { focusRing } from "@/lib/styles";',
        "import { Spinner } from '@/components/ui/spinner';",
        'import { Hero } from "@/components/blocks/hero";',
      ].join("\n"),
    );
  });
});

describe("manualInstallFor", () => {
  it("lists everything add would write for a component with a dependency", () => {
    const manual = manualInstallFor(getRegistryItem("button"));

    expect(manual).toBeDefined();
    expect(manual?.files.map((file) => file.path)).toEqual(["components/ui/button.tsx"]);
    expect(manual?.parts.map((part) => part.name)).toContain("spinner");
    expect(manual?.utils.map((file) => file.path)).toEqual(["lib/utils.ts", "lib/styles.ts"]);
    expect(manual?.dependencies).toEqual(
      expect.arrayContaining(["clsx", "tailwind-merge", "class-variance-authority"]),
    );
    expect(manual?.files[0]?.code).not.toMatch(/["']@\/components\/(?!ui\/)/);
  });

  it("gives every free component a complete set of steps", () => {
    for (const entry of getComponents()) {
      const item = getRegistryItem(entry.name);
      if (item.access === "pro") {
        expect(manualInstallFor(item)).toBeUndefined();
        continue;
      }
      const manual = manualInstallFor(item);
      expect(manual, entry.name).toBeDefined();
      for (const file of [
        ...(manual?.files ?? []),
        ...(manual?.parts.flatMap((p) => p.files) ?? []),
      ]) {
        expect(file.code.length, file.path).toBeGreaterThan(0);
      }
    }
  });
});
