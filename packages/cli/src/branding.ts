/**
 * Branding, mirrored from the repository root config.
 *
 * Duplicated deliberately: the published CLI cannot import from the monorepo
 * root, and `pnpm rebrand` rewrites both copies in the same pass.
 */
export const branding = {
  libraryName: "Dowel",
  cliName: "dowel",
  registryUrl: "https://dowel.dev/r",
} as const;
