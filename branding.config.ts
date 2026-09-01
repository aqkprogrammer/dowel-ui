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
  /** Binary name users type: `npx <cliName> add button`. */
  cliName: "dowel",
  /** Base URL the CLI resolves registry items from. */
  registryUrl: "https://dowel.dev/r",
  /** Documentation site title. */
  docsTitle: "Dowel — source-first React UI for SaaS and AI products",
  /** One-line description used in package.json files and the README. */
  description:
    "A modern, source-first React UI library for building beautiful SaaS, AI and enterprise applications.",
  /** GitHub repository in owner/name form. */
  repository: "dowel-ui/dowel",
} as const;

export type Branding = typeof branding;
