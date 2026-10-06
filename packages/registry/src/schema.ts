import { z } from "zod";

/**
 * The public registry contract.
 *
 * This is the boundary between the library and every consumer's project, so it
 * is validated on both sides: the build refuses to emit anything that does not
 * satisfy it, and the CLI refuses to install anything that does not parse. A
 * registry that serves malformed data breaks builds in someone else's
 * repository, where it is hardest to diagnose.
 */

/** Bumped only for a breaking change to the shape below. */
export const REGISTRY_VERSION = 1;

export const registryFileTypeSchema = z.enum([
  /** A component. Installed under the `ui` alias. */
  "registry:ui",
  /** A shared utility. Installed under the `lib` alias. */
  "registry:lib",
  /** A hook. Installed under the `hooks` alias. */
  "registry:hook",
  /** A whole page section. Installed under the `blocks` alias. */
  "registry:block",
  /** CSS appended to the project stylesheet rather than written as a file. */
  "registry:style",
]);

export type RegistryFileType = z.infer<typeof registryFileTypeSchema>;

export const registryItemTypeSchema = z.enum([
  "registry:ui",
  "registry:lib",
  "registry:hook",
  "registry:theme",
  "registry:block",
]);

export type RegistryItemType = z.infer<typeof registryItemTypeSchema>;

/**
 * Whether an item's source is public.
 *
 * `free` is the default and stays the default: an item that has ever been
 * installable without a licence must never quietly become one that is not.
 * Existing registries carry no `access` field at all, which parses as `free` —
 * so an older registry read by a newer CLI behaves exactly as it did.
 */
export const registryAccessSchema = z.enum(["free", "pro"]).default("free");

export type RegistryAccess = z.infer<typeof registryAccessSchema>;

/**
 * A registry item's name. It becomes a URL segment and a file name, so it is
 * the one piece of a registry that reaches a path without passing through
 * anything else first.
 */
export const registryItemNameSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);

/**
 * Whether a registry file path stays inside the alias directory it names.
 *
 * The registry chooses where a file goes within the consumer's project, which
 * makes the path the most dangerous string it serves: `ui/../../.bashrc` is a
 * write outside the project, and nothing else in the pipeline would notice.
 * Absolute paths, `..` and `.` segments, empty segments, backslashes (a
 * separator on Windows), colons (a drive letter) and NUL are all refused,
 * rather than normalised into something that might be safe.
 */
export function isSafeRegistryPath(path: string): boolean {
  if (path.length === 0 || path.startsWith("/")) return false;
  if (/[\\:\0]/.test(path)) return false;
  return path
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/**
 * An npm package the item needs: a name, optionally scoped, optionally with a
 * version range.
 *
 * Handed straight to the package manager, which also accepts git URLs,
 * tarballs and local paths in the same position. A registry asking for any of
 * those is asking to run code from somewhere other than npm, so they are
 * refused at the boundary rather than installed.
 */
export const npmDependencySchema = z
  .string()
  .regex(
    /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*(?:@[0-9A-Za-z.^~<>=*+|-]+)?$/,
    {
      message: "must be an npm package name, optionally with a version range",
    },
  );

export const registryFileSchema = z.object({
  /**
   * Logical path within the registry, e.g. `ui/button.tsx`, `lib/utils.ts`.
   *
   * The leading segment selects which of the consumer's aliases the file is
   * written under. The registry deliberately does not know the destination —
   * that depends on a project layout it has never seen.
   */
  path: z.string().refine(isSafeRegistryPath, {
    message: "must be a relative path with no '..', '.', or empty segments",
  }),
  type: registryFileTypeSchema,
  content: z.string(),
  /**
   * `sha256:<hex>` of `content` as published.
   *
   * Recorded at install time so `update` can tell an untouched file from one
   * the user has edited. This cannot be added later: an install that did not
   * record a hash leaves no way to know what it originally wrote.
   */
  hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});

export type RegistryFile = z.infer<typeof registryFileSchema>;

/**
 * When to reach for an item, and when not to.
 *
 * The one part of the genome that cannot be derived from source: whether a
 * Sheet or a Dialog is right for a task is a judgement about the task. It is
 * declared in `meta.ts`, and the build checks only what can be checked, which
 * is that every name it mentions exists.
 */
export const registryGuidanceSchema = z.object({
  /** Situations it is the right choice for. */
  useWhen: z.array(z.string().min(1)).min(1),
  /** Situations it is the wrong choice for, ideally naming what to use. */
  avoidWhen: z.array(z.string().min(1)).default([]),
  /** Items an agent is likely to confuse it with. */
  alternatives: z.array(registryItemNameSchema).default([]),
});

export type RegistryGuidance = z.infer<typeof registryGuidanceSchema>;

/** Facts about an item, computed from its source rather than declared. */
export const registryCapabilitiesSchema = z.object({
  /**
   * Needs `"use client"`, so it cannot render in a Server Component without a
   * client boundary.
   */
  client: z.boolean(),
  /** Animates, through CSS keyframes or the `motion` library. */
  animated: z.boolean(),
});

export type RegistryCapabilities = z.infer<typeof registryCapabilitiesSchema>;

export const registryPropSchema = z.object({
  name: z.string().min(1),
  /** The declared type, on one line. */
  type: z.string(),
  required: z.boolean(),
  default: z.string().optional(),
  description: z.string().optional(),
});

/** The props one exported component adds, read from its type. */
export const registryPropsGroupSchema = z.object({
  component: z.string().min(1),
  props: z.array(registryPropSchema),
  /** The intrinsic element whose attributes also pass through. */
  element: z.string().optional(),
  /** The primitive every prop is forwarded to, when it adds none of its own. */
  forwards: z.string().optional(),
  /** Attributes of `element` removed with `Omit`. */
  omitted: z.array(z.string()).default([]),
});

export type RegistryPropsGroup = z.infer<typeof registryPropsGroupSchema>;

/** One check from the quality standard, against one item. */
export const registryCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  state: z.enum(["pass", "fail", "not-applicable"]),
});

export const registryQualitySchema = z.object({
  checks: z.array(registryCheckSchema),
  /** Passed as a percentage of the checks that apply, rounded. */
  score: z.number().int().min(0).max(100),
});

export type RegistryQuality = z.infer<typeof registryQualitySchema>;

/**
 * An item that should no longer be used for new work.
 *
 * Deprecating is the only honest way to retire something people have already
 * installed: removing it breaks their next `update` in a repository nobody
 * here can see. A deprecated item still installs; the CLI, the MCP server and
 * the agent docs say what to use instead, and the planners stop suggesting it.
 */
export const registryDeprecationSchema = z.object({
  /** The version it was deprecated in. */
  since: z.string().min(1),
  /** Why, in a sentence a person deciding whether to migrate can act on. */
  reason: z.string().min(1),
  /** What to use instead, when there is one. */
  replacement: registryItemNameSchema.optional(),
});

export type RegistryDeprecation = z.infer<typeof registryDeprecationSchema>;

export const registryItemSchema = z.object({
  $schema: z.string().optional(),
  registryVersion: z.literal(REGISTRY_VERSION),
  name: registryItemNameSchema,
  type: registryItemTypeSchema,
  title: z.string().min(1),
  description: z.string().min(10),
  category: z.string().min(1),
  status: z.enum(["stable", "beta", "experimental"]),
  /** npm packages to install alongside the files. */
  dependencies: z.array(npmDependencySchema),
  /** Other registry items to install first. */
  registryDependencies: z.array(registryItemNameSchema),
  files: z.array(registryFileSchema).min(1),
  a11y: z.string().optional(),
  access: registryAccessSchema,
  /*
   * The genome. Every field below is optional, so a registry built before it
   * existed still parses, and a CLI that predates it ignores it.
   */
  guidance: registryGuidanceSchema.optional(),
  /** Items it is commonly used together with. */
  composesWith: z.array(registryItemNameSchema).optional(),
  capabilities: registryCapabilitiesSchema.optional(),
  props: z.array(registryPropsGroupSchema).optional(),
  quality: registryQualitySchema.optional(),
  /*
   * Governance. Optional for the same reason; mostly of use to an
   * organisation's own registry, where someone owns each item.
   */
  deprecated: registryDeprecationSchema.optional(),
  /** The version it first shipped in. */
  since: z.string().min(1).optional(),
  /** Who maintains it: a team, a person, an address to ask. */
  owner: z.string().min(1).optional(),
});

export type RegistryItem = z.infer<typeof registryItemSchema>;

/**
 * The index entry.
 *
 * Carries `access` so a licensed item is *listed* — with its title, what it
 * depends on and how many files it has — while its source is not. Hiding paid
 * items entirely would mean nobody could discover them; including their source
 * would mean nobody needed to buy them. The index is the catalogue; the item
 * body is the goods.
 */
export const registryIndexEntrySchema = registryItemSchema
  .pick({
    name: true,
    type: true,
    title: true,
    description: true,
    category: true,
    status: true,
    dependencies: true,
    registryDependencies: true,
    access: true,
    // What an agent needs to choose between items without fetching each one.
    // Props and quality stay on the item: they are only wanted once chosen.
    guidance: true,
    composesWith: true,
    capabilities: true,
    deprecated: true,
    since: true,
    owner: true,
  })
  .extend({ fileCount: z.number().int().positive() });

export type RegistryIndexEntry = z.infer<typeof registryIndexEntrySchema>;

export const registryIndexSchema = z.object({
  $schema: z.string().optional(),
  registryVersion: z.literal(REGISTRY_VERSION),
  /** Version of the package the registry was generated from. */
  generatedFrom: z.string().min(1),
  items: z.array(registryIndexEntrySchema),
});

export type RegistryIndex = z.infer<typeof registryIndexSchema>;
