/**
 * Branding, mirrored from the repository root config.
 *
 * A copy rather than an import, because the docs app is built independently of
 * the repo root; `pnpm rebrand` rewrites every copy in the same pass.
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
  packageScope: "@dowel-ui",
  registryUrl: "https://dowel-eight.vercel.app/r",
  repository: "aqkprogrammer/dowel-ui",
  description:
    "A modern, source-first React UI library for building beautiful SaaS, AI and enterprise applications.",
} as const;
