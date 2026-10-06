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
