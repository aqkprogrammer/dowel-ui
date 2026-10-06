import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Prepares everything the docs site serves from other packages.
 *
 * Two jobs, both about not keeping a second copy of anything:
 *
 * 1. Publishes the registry the CLI reads. The docs site is the registry's
 *    host, so `public/r` is a copy of what `@dowel-ui/registry` just built —
 *    never hand-maintained.
 * 2. Generates a loader for every Storybook story file, so the previews on a
 *    component's page are literally the stories that are tested in CI — and a
 *    page fetches only the ones it shows. There is no second set of examples
 *    to drift.
 * 3. Generates the version the site displays, read from the component package,
 *    so the badge in the header cannot claim a release that was never cut.
 * 4. Generates the variant axes the playground offers, read from each
 *    component's own `cva()` call, so a control can never offer a value the
 *    component does not implement.
 * 5. Measures each component against the rules the audits already enforce, so
 *    the quality shown on its page is traceable to something rather than
 *    asserted.
 * 6. Emits the licensed item bodies as a module, so the route that gates them
 *    can import them and the platform's tracing includes them in the deploy.
 * 7. Renders each licensed block's stories to markup, because a live preview
 *    of a paid block is that block's source in a chunk anyone can download.
 * 8. Writes the design tokens in the shape Figma reads — one file per shipped
 *    preset, and the parsed declarations the Theme Studio needs to write one
 *    for a preset of your own — from the same CSS the components use.
 */

import { buildRegistry, writeLicensedModule } from "@dowel-ui/registry/build";
import {
  parseTokenCss,
  THEME_PRESETS,
  toDesignTokens,
  type Declarations,
} from "@dowel-ui/themes";

import { extractVariants, type VariantAxis } from "@dowel-ui/registry/analysis";
import type { RegistryItem, RegistryPropsGroup, RegistryQuality } from "@dowel-ui/registry";

import { storyExports } from "./stories";

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(here, "..");
const repoRoot = join(docsRoot, "..", "..");
const registryDir = join(repoRoot, "packages", "registry", "r");
const licensedModule = join(docsRoot, "src", "lib", "licensed-registry.generated.ts");
const componentsDir = join(repoRoot, "packages", "ui", "src", "components");
const blocksDir = join(repoRoot, "packages", "ui", "src", "blocks");
const uiPackageJson = join(repoRoot, "packages", "ui", "package.json");
const themesSrc = join(repoRoot, "packages", "themes", "src");

/** Newest modification time anywhere under a directory. */
function newestMtime(directory: string): number {
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const mtime = entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

function publishRegistry(): number {
  const index = join(registryDir, "index.json");

  if (!existsSync(index)) {
    throw new Error(
      `No registry at ${registryDir}. Run \`pnpm --filter @dowel-ui/registry build\` first.`,
    );
  }

  // Turbo's dependency graph rebuilds the registry before this runs, but a bare
  // `next build` does not — and publishing a stale registry means the site
  // documents, and the CLI installs, code that no longer exists. Better to stop
  // than to serve something that looks right.
  if (newestMtime(componentsDir) > statSync(index).mtimeMs) {
    throw new Error(
      "The registry is older than the component sources it was generated from.\n" +
        "Run `pnpm --filter @dowel-ui/registry build` (or build through turbo, which does it for you).",
    );
  }

  const target = join(docsRoot, "public", "r");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(registryDir, target, { recursive: true });

  return readdirSync(target).length;
}

interface PreviewSource {
  name: string;
  /** Import path segment: "components" or "blocks". */
  group: string;
}

function storiesIn(directory: string, group: string): PreviewSource[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(directory, name, `${name}.stories.tsx`)))
    .sort()
    .map((name) => ({ name, group }));
}

function generatePreviews(licensedNames: ReadonlySet<string>): number {
  // Registry names are unique across components and blocks, so one flat map
  // serves both — the integrity test enforces that uniqueness.
  //
  // Licensed blocks are the exception, and they are excluded rather than
  // loaded-and-hidden. This module is imported by a client component, so every
  // path in it is compiled into a chunk the browser can download: listing a
  // Pro block here publishes it, whatever the page then chooses to render.
  // Their previews are rendered to markup instead, by scripts/prerender.ts.
  const sources = [
    ...storiesIn(componentsDir, "components"),
    ...storiesIn(blocksDir, "blocks"),
  ].filter((source) => !licensedNames.has(source.name));

  const loaders = sources
    .map(
      (source) =>
        `  "${source.name}": () => import("@ui/${source.group}/${source.name}/${source.name}.stories"),`,
    )
    .join("\n");

  // Read from source because a page needs the list before it has the module —
  // for the example chips, and to know which story is the canonical one. It is
  // also the only place the order survives: a module namespace object sorts its
  // keys, and the first story the author wrote is the one a page opens on.
  const names = sources
    .map((source) => {
      const root = source.group === "blocks" ? blocksDir : componentsDir;
      const found = storyExports(join(root, source.name, `${source.name}.stories.tsx`));
      return `  "${source.name}": ${JSON.stringify(found)},`;
    })
    .join("\n");

  writeFileSync(
    join(docsRoot, "src", "lib", "previews.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// One dynamic import per story file, each with a literal path. Literal, because
// the bundler can only split what it can see, and a template string would pull
// in every file the pattern could match. Dynamic, because static imports here
// put every story in the library into one 2 MB chunk that 296 of the site's 312
// pages downloaded: the button page carried every block.
import type { StoryModule } from "./story-types";

export const storyLoaders: Record<string, () => Promise<StoryModule>> = {
${loaders}
};

/**
 * The stories in each file, in the order they were written.
 *
 * Known without loading the module, so a page can lay out its examples and pick
 * the canonical one while the story itself is still on its way.
 */
export const storyNames: Record<string, string[]> = {
${names}
};
`,
  );

  return sources.length;
}

/**
 * The props table for every component, read from its own TypeScript.
 *
 * Generated rather than written for the same reason the previews are the real
 * Storybook stories: a table maintained beside the types is a second copy of
 * the API, and the copy is what goes stale. This one cannot describe a prop the
 * component does not take, or miss one it does.
 */
function generateProps(items: RegistryItem[]): number {
  // Read from the registry's genome, which extracts them from the source once
  // for every consumer: this page, the MCP server and the agent docs all read
  // the same table, so none of them can disagree about a component's props.
  const groups: Record<string, RegistryPropsGroup[]> = {};
  for (const item of items) {
    if (item.props && item.props.length > 0) groups[item.name] = item.props;
  }

  writeFileSync(
    join(docsRoot, "src", "lib", "props.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// Read from each component's own props type, so the table cannot describe a
// prop the component does not accept, or omit one it does.
export interface PropRow {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

export interface PropsGroup {
  component: string;
  props: PropRow[];
  element?: string;
  forwards?: string;
  omitted: string[];
}

export const componentProps: Record<string, PropsGroup[]> = ${JSON.stringify(groups, null, 2)};
`,
  );

  return Object.keys(groups).length;
}

/**
 * Writes the variant axes the playground builds controls from.
 *
 * Generated rather than hand-listed for the same reason the previews are: a
 * hand-maintained list of 70 components' variants is a list that is wrong
 * within a release, and wrong here means a control that sets a prop value the
 * component will render as nothing.
 */
function generateVariants(): number {
  const axes: Record<string, VariantAxis[]> = {};

  for (const { name, group } of [
    ...storiesIn(componentsDir, "components"),
    ...storiesIn(blocksDir, "blocks"),
  ]) {
    const root = group === "blocks" ? blocksDir : componentsDir;
    const found = extractVariants(join(root, name, `${name}.tsx`));
    if (found.length > 0) axes[name] = found;
  }

  writeFileSync(
    join(docsRoot, "src", "lib", "variants.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// Read from each component's own cva() call, so a playground control cannot
// offer a variant the component does not implement.
export interface VariantAxis {
  prop: string;
  options: string[];
  fallback?: string;
}

export const componentVariants: Record<string, VariantAxis[]> = ${JSON.stringify(axes, null, 2)};
`,
  );

  return Object.keys(axes).length;
}

/**
 * Writes the per-component quality assessment.
 *
 * Measured at build time from the component's own source and tests, against the
 * same rules `audit:api` and `audit:tokens` enforce. A score written by hand
 * would be a claim; this one can be checked by reading the file it was
 * computed from.
 */
function generateQuality(items: RegistryItem[]): { count: number; average: number } {
  // The assessment is part of each item's genome, measured by the registry
  // build, so the standard travels with the component. Licensed items are
  // included: a catalogue where only the free half has a score is one that
  // looks like it is hiding something.
  const quality: Record<string, RegistryQuality> = {};
  for (const item of items) {
    if (item.type !== "registry:ui" && item.type !== "registry:block") continue;
    if (item.quality) quality[item.name] = item.quality;
  }

  const scores = Object.values(quality).map((entry) => entry.score);
  const average =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);

  writeFileSync(
    join(docsRoot, "src", "lib", "quality.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// Measured from each component's own source and tests, against the same rules
// the audits enforce across the whole set.
export type CheckState = "pass" | "fail" | "not-applicable";

export interface QualityCheck {
  id: string;
  label: string;
  state: CheckState;
}

export interface ComponentQuality {
  checks: QualityCheck[];
  score: number;
}

export const componentQuality: Record<string, ComponentQuality> = ${JSON.stringify(quality, null, 2)};

export const averageQuality = ${String(average)};
`,
  );

  return { count: Object.keys(quality).length, average };
}

/** Writes the component package's version for the site to display. */
function generateVersion(): string {
  const pkg = JSON.parse(readFileSync(uiPackageJson, "utf8")) as { version: string };

  writeFileSync(
    join(docsRoot, "src", "lib", "version.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// Read from the component package rather than written by hand, because a
// hardcoded version silently claims a release that may never have been cut.
export const version = ${JSON.stringify(pkg.version)};
`,
  );

  return pkg.version;
}

/**
 * Writes the tokens for design tools.
 *
 * Generated rather than exported by hand from Figma, for the same reason as
 * everything else here: the CSS is the source of truth, and a tokens file
 * somebody last updated in March is a design file that disagrees with the
 * product. One JSON per shipped preset lands in `public/figma`, and the parsed
 * declarations land in a module so the Theme Studio can write the same file
 * for a preset built in the browser.
 */
function generateDesignTokens(): number {
  const scale = parseTokenCss(readFileSync(join(themesSrc, "tokens.css"), "utf8"), "@theme");
  const base = readFileSync(join(themesSrc, "base.css"), "utf8");
  const light = parseTokenCss(base, ":root");
  const dark = parseTokenCss(base, ".dark");

  const presets: Record<string, { light: Declarations; dark: Declarations }> = {};
  for (const preset of THEME_PRESETS) {
    if (preset === "default") continue;
    const css = readFileSync(join(themesSrc, "presets", `${preset}.css`), "utf8");
    presets[preset] = {
      light: parseTokenCss(css, `[data-theme="${preset}"]`),
      dark: parseTokenCss(css, `.dark[data-theme="${preset}"]`),
    };
  }

  const outDir = join(docsRoot, "public", "figma");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const preset of THEME_PRESETS) {
    const tokens = toDesignTokens({
      name: preset,
      scale,
      light,
      dark,
      preset: presets[preset],
    });
    writeFileSync(
      join(outDir, `${preset}.tokens.json`),
      `${JSON.stringify(tokens, null, 2)}\n`,
    );
  }

  writeFileSync(
    join(docsRoot, "src", "lib", "design-tokens.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// The token declarations, parsed from the CSS the components use, so the Theme
// Studio can write a Figma tokens file for a preset built in the browser.
import type { Declarations } from "@dowel-ui/themes";

export const tokenDeclarations: { scale: Declarations; light: Declarations; dark: Declarations } =
  ${JSON.stringify({ scale, light, dark }, null, 2)};
`,
  );

  return THEME_PRESETS.length;
}

/**
 * Renders the licensed previews, in a process of its own.
 *
 * `packages/ui` is the working directory on purpose: tsx reads its JSX setting
 * from the tsconfig it finds there, and this app's says `preserve` for Next,
 * under which the block sources fail to compile. The reason is written out in
 * full at the top of prerender.ts.
 */
function generateProPreviews(licensedNames: ReadonlySet<string>): number {
  const names = [...licensedNames].sort();
  if (names.length === 0) return 0;

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", join(here, "prerender.ts"), ...names],
    { cwd: join(repoRoot, "packages", "ui"), stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(
      "Could not prerender the licensed previews.\n" +
        "Their pages would be blank, and rendering them live would put the " +
        "paid source in a public chunk.",
    );
  }

  return names.length;
}

/**
 * Fails the build if a licensed block reached the client preview map.
 *
 * The filter that keeps them out is one line, and one line is exactly the kind
 * of thing a later change removes without noticing. What it protects is the
 * whole paid catalogue, and the failure is silent — the site looks right, the
 * previews work, and the source is simply in a chunk. So it is asserted rather
 * than trusted, on every build and every `dev`.
 *
 * Loading the previews on demand does not change the answer. A lazy import is
 * still a chunk the build emits, at a URL written into the preview code every
 * visitor downloads; that fewer pages fetch it makes it no less public.
 */
function assertNoLicensedPreviews(licensedNames: ReadonlySet<string>): void {
  const generated = readFileSync(join(docsRoot, "src", "lib", "previews.generated.ts"), "utf8");

  for (const name of licensedNames) {
    if (generated.includes(`/${name}/${name}.stories`)) {
      throw new Error(
        `The licensed block "${name}" is imported by previews.generated.ts, ` +
          "which a client component imports. That compiles its source into a " +
          "chunk anyone can download. Prerender it instead — see scripts/prerender.ts.",
      );
    }
  }
}

const files = publishRegistry();
const licensed = writeLicensedModule(licensedModule);

// Built once: it reads every component through the TypeScript compiler.
const items = buildRegistry();

// From the registry build, which is the one place that decides what is
// licensed. A second list here would be a second answer.
const licensedNames: ReadonlySet<string> = new Set(
  items.filter((item) => item.access === "pro").map((item) => item.name),
);

const previews = generatePreviews(licensedNames);
assertNoLicensedPreviews(licensedNames);
const proPreviews = generateProPreviews(licensedNames);
const variants = generateVariants();
const props = generateProps(items);
const quality = generateQuality(items);
const version = generateVersion();
const figma = generateDesignTokens();

console.log(
  `Prepared docs: ${String(files)} registry files published, ${String(licensed)} licensed, ` +
    `${String(previews)} preview modules generated, ` +
    `${String(proPreviews)} licensed blocks prerendered, ` +
    `${String(variants)} components with variant axes, ` +
    `${String(props)} with props tables, ${String(quality.count)} assessed ` +
    `(${String(quality.average)}% average), ${String(figma)} Figma token files, version ${version}.`,
);
