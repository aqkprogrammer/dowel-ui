/**
 * Registry metadata contract.
 *
 * Every component ships a `meta.ts` describing what the CLI must install
 * alongside it. This file defines the *type* only; `meta.test.ts` validates
 * every declaration against the source's real imports, so metadata cannot drift
 * from the code it describes. See docs/architecture/0003-registry-metadata.md.
 */

export const COMPONENT_CATEGORIES = [
  "foundation",
  "display",
  "navigation",
  "overlay",
  "layout",
  "form",
  "feedback",
  "data",
  "ai",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export const COMPONENT_STATUSES = ["stable", "beta", "experimental"] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export interface ComponentMeta {
  /** Registry id. Must match the directory name and the CLI argument. */
  name: string;
  /**
   * What kind of registry entry this is.
   *
   * Components are the building blocks; blocks are whole sections assembled
   * from them. They install into different places and are browsed differently,
   * so the distinction is explicit rather than inferred from the category.
   */
  kind?: "component" | "block";
  /** Display name for docs and Storybook. */
  title: string;
  /** One sentence, used on listing pages and by `<cli> list`. */
  description: string;
  category: ComponentCategory;
  status: ComponentStatus;
  /** npm packages the source imports. Peer deps (react) are excluded. */
  dependencies: string[];
  /** Other registry components this one imports. */
  registryDependencies: string[];
  /** Files the CLI copies, relative to the component directory. */
  files: string[];
  /** Accessibility notes surfaced on the docs page. */
  a11y?: string;
}

/** Identity helper that gives editors autocomplete inside `meta.ts`. */
export function defineMeta<const T extends ComponentMeta>(meta: T): T {
  return meta;
}
