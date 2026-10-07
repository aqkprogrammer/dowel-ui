export interface RegistryIndex {
  items: { name: string; type: string }[];
}

/** What a project adds with `dowel add`: components and blocks, not the theme or lib entries `init` writes. */
const ADDABLE = new Set(["registry:ui", "registry:block"]);

/**
 * The items the install check adds, in the registry's order.
 *
 * `served` says whether the registry has a file for an item: licensed items
 * are listed in the index but withheld from the build, and asking for one
 * would fail the check for a reason that has nothing to do with the code.
 * A name in `only` that the registry does not serve is an error, since a
 * check that silently installs nothing passes.
 */
export function installable(
  index: RegistryIndex,
  served: (name: string) => boolean,
  only?: readonly string[],
): string[] {
  const available = index.items
    .filter((item) => ADDABLE.has(item.type) && served(item.name))
    .map((item) => item.name);
  if (!only || only.length === 0) return available;

  const missing = only.filter((name) => !available.includes(name));
  if (missing.length > 0) {
    throw new Error(`Not in the registry, or withheld: ${missing.join(", ")}`);
  }
  return available.filter((name) => only.includes(name));
}
