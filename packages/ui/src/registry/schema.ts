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
  "effects",
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
  /**
   * Whether the source is public.
   *
   * Omitted means `free`, and free is a promise: an item that has shipped
   * installable without a licence stays that way. Marking an existing component
   * `pro` breaks every project that already installs it.
   */
  access?: "free" | "pro";
  /**
   * When to use this, when not to, and what it is easily confused with.
   *
   * The part of the component genome nobody can derive from source — whether
   * a Sheet or a Dialog suits a task is a judgement about the task — so it is
   * written here, by whoever knows. Everything else agents are told (props,
   * whether it needs a client boundary, whether it animates) is read from the
   * source by the registry build. `meta.test.ts` checks that every name below
   * exists, so guidance cannot point at a component that was renamed.
   */
  guidance?: ComponentGuidance;
  /**
   * Components it is usually used alongside — not ones it imports, which are
   * `registryDependencies`, but ones a screen built with it tends to need.
   */
  composesWith?: string[];
  /**
   * Set when this should no longer be used for new work. It still installs —
   * removing a component breaks every project that has it — but the CLI, the
   * MCP server and the agent docs say what to use instead, and the planners
   * stop suggesting it.
   */
  deprecated?: {
    /** The version it was deprecated in. */
    since: string;
    reason: string;
    /** What to use instead, when there is one. */
    replacement?: string;
  };
  /** The version it first shipped in. */
  since?: string;
  /** Who maintains it. */
  owner?: string;
}

export interface ComponentGuidance {
  /** Situations it is the right choice for, each a short phrase. */
  useWhen: string[];
  /** Situations it is the wrong choice for, naming what to use instead. */
  avoidWhen?: string[];
  /** Registry names an agent is likely to confuse it with. */
  alternatives?: string[];
}

/** Identity helper that gives editors autocomplete inside `meta.ts`. */
export function defineMeta<const T extends ComponentMeta>(meta: T): T {
  return meta;
}
