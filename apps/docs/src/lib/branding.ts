/**
 * Branding, mirrored from the repository root config.
 *
 * A copy rather than an import, because the docs app is built independently of
 * the repo root; `pnpm rebrand` rewrites every copy in the same pass.
 */
export const branding = {
  libraryName: "Dowel",
  cliName: "dowel",
  packageScope: "@dowel-ui",
  registryUrl: "https://dowel.dev/r",
  repository: "dowel-ui/dowel",
  description:
    "A modern, source-first React UI library for building beautiful SaaS, AI and enterprise applications.",
} as const;
