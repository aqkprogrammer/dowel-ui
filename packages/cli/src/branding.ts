/**
 * Branding, mirrored from the repository root config.
 *
 * Duplicated deliberately: the published CLI cannot import from the monorepo
 * root, and `pnpm rebrand` rewrites both copies in the same pass.
 */
export const branding = {
  libraryName: "Dowel",
  cliName: "dowel",
  /**
   * The npm package name, which is NOT the command name. npm rejected the
   * unscoped `dowel` as too similar to `del` and `bower` — a rule that runs
   * only at publish time, so a 404 from the registry proves a name is unused,
   * never that it can be claimed. This is what follows `npx`; `cliName` is the
   * binary the package installs.
   */
  cliPackage: "@dowel-ui/cli",
  registryUrl: "https://dowel-eight.vercel.app/r",
} as const;
