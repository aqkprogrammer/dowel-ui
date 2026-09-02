/**
 * Single source of truth for every brandable string in the monorepo.
 *
 * `pnpm rebrand` rewrites these values and every occurrence of them across the
 * workspace in one pass; `pnpm check:branding` reports anything the rename
 * missed. The list of what counts as an unreplaced placeholder lives in
 * `scripts/check-branding.ts`, not here — this file is rewritten by the rebrand,
 * so a list kept here would be renamed along with everything else.
 */
export const branding = {
  /** Human-facing product name. Appears in docs, README and Storybook. */
  libraryName: "Dowel",
  /** npm scope for published packages, including the leading "@". */
  packageScope: "@dowel-ui",
  /** The command the installed package provides: `dowel add button`. */
  cliName: "dowel",
  /**
   * The npm package name, which is NOT the command name. npm rejected the
   * unscoped `dowel` as too similar to `del` and `bower` — a rule that runs
   * only at publish time, so a 404 from the registry proves a name is unused,
   * never that it can be claimed. This is what follows `npx`; `cliName` is the
   * binary the package installs.
   */
  cliPackage: "@dowel-ui/cli",
  /** Base URL the CLI resolves registry items from. */
  registryUrl: "https://dowel-eight.vercel.app/r",
  /** Documentation site title. */
  docsTitle: "Dowel — source-first React UI for SaaS and AI products",
  /** One-line description used in package.json files and the README. */
  description:
    "A modern, source-first React UI library for building beautiful SaaS, AI and enterprise applications.",
  /** GitHub repository in owner/name form. */
  repository: "aqkprogrammer/dowel-ui",
} as const;

export type Branding = typeof branding;
