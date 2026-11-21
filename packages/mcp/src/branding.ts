/**
 * Branding, mirrored from the repository root config.
 *
 * Duplicated deliberately: the published server cannot import from the monorepo
 * root, and `pnpm rebrand` rewrites every copy in the same pass.
 */
export const branding = {
  libraryName: "Dowel",
  cliPackage: "@dowel-ui/cli",
  packageScope: "@dowel-ui",
  registryUrl: "https://dowelui.com/r",
} as const;
