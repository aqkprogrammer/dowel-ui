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

export const registryFileSchema = z.object({
  /**
   * Logical path within the registry, e.g. `ui/button.tsx`, `lib/utils.ts`.
   *
   * The leading segment selects which of the consumer's aliases the file is
   * written under. The registry deliberately does not know the destination —
   * that depends on a project layout it has never seen.
   */
  path: z.string().min(1),
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

export const registryItemSchema = z.object({
  $schema: z.string().optional(),
  registryVersion: z.literal(REGISTRY_VERSION),
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  type: registryItemTypeSchema,
  title: z.string().min(1),
  description: z.string().min(10),
  category: z.string().min(1),
  status: z.enum(["stable", "beta", "experimental"]),
  /** npm packages to install alongside the files. */
  dependencies: z.array(z.string()),
  /** Other registry items to install first. */
  registryDependencies: z.array(z.string()),
  files: z.array(registryFileSchema).min(1),
  a11y: z.string().optional(),
});

export type RegistryItem = z.infer<typeof registryItemSchema>;

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
