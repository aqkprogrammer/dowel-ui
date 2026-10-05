import type { RegistryItem } from "@dowel-ui/registry";

/**
 * How an installed item is imported, read from its own source.
 *
 * The import path follows the CLI's default aliases — `ui/` files land under
 * `@/components/ui`, `blocks/` under `@/components/blocks` — and the export is
 * the first exported component in the item's main file. Nothing is guessed
 * from the item's name: `otp-input` might export `OTPInput`, and a usage line
 * that does not compile is worse than none. If the source does not say, this
 * returns nothing and the page leaves the section out.
 */
export interface Usage {
  importPath: string;
  exportName: string;
}

const ALIASES: Record<string, string> = {
  ui: "@/components/ui",
  blocks: "@/components/blocks",
};

export function usageFor(item: Pick<RegistryItem, "name" | "files">): Usage | undefined {
  const main =
    item.files.find(
      (file) =>
        file.path
          .split("/")
          .pop()
          ?.replace(/\.tsx?$/, "") === item.name,
    ) ?? item.files[0];
  if (!main?.content) return undefined;
  const [folder, ...rest] = main.path.split("/");
  const alias = folder ? ALIASES[folder] : undefined;
  if (!alias || rest.length === 0) return undefined;
  const match = /export\s+(?:function|const)\s+([A-Z][A-Za-z0-9]*)/.exec(main.content);
  if (!match?.[1]) return undefined;
  return {
    importPath: `${alias}/${rest.join("/").replace(/\.tsx?$/, "")}`,
    exportName: match[1],
  };
}
