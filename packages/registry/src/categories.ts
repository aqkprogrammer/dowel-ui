/**
 * The categories items are grouped by, in reading order, with their labels.
 *
 * Kept here because this package is the contract every consumer reads: the
 * CLI's `list`, the agent docs, the MCP server and the documentation site all
 * group by category, and each used to keep its own list. Two of them disagreed
 * about what to call the last one.
 *
 * `@dowel-ui/react` declares the same names as the type its `meta.ts` files are
 * checked against; a test holds the two lists to the same set. A custom
 * registry may use categories outside this list, which is why `category` is a
 * string in the item schema rather than this enum.
 */
export const REGISTRY_CATEGORIES = [
  "foundation",
  "form",
  "overlay",
  "navigation",
  "display",
  "data",
  "feedback",
  "layout",
  "ai",
  "effects",
] as const;

export type RegistryCategory = (typeof REGISTRY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<RegistryCategory, string> = {
  foundation: "Foundations",
  form: "Forms",
  overlay: "Overlays",
  navigation: "Navigation",
  display: "Display",
  data: "Data",
  feedback: "Feedback",
  layout: "Layout",
  ai: "AI",
  effects: "Effects & motion",
};

/** The label for a category, or the name itself for one this list does not know. */
export function categoryLabel(category: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[category] ?? category;
}

/**
 * Where a category falls in reading order. Unknown categories sort last, in
 * the order they were given, rather than being dropped.
 */
export function categoryRank(category: string): number {
  const index = (REGISTRY_CATEGORIES as readonly string[]).indexOf(category);
  return index === -1 ? REGISTRY_CATEGORIES.length : index;
}
