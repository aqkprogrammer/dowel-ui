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
 * 2. Generates static imports for every Storybook story, so the previews on a
 *    component's page are literally the stories that are tested in CI. There is
 *    no second set of examples to drift.
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

import { buildRegistry, proItems, writeLicensedModule } from "@dowel-ui/registry/build";
import {
  parseTokenCss,
  THEME_PRESETS,
  toDesignTokens,
  type Declarations,
} from "@dowel-ui/themes";

import { extractProps, type PropsGroup } from "./props";
import { assess, type ComponentQuality } from "./quality";
import { exportOrder } from "./stories";
import { extractVariants, type VariantAxis } from "./variants";

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

function identifier(name: string): string {
  const [first, ...rest] = name.split("-");
  return `${first ?? ""}${rest.map((part) => part[0]?.toUpperCase() + part.slice(1)).join("")}Stories`;
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
  // imported-and-hidden. This module is imported by a client component, so
  // every name in it is compiled into a chunk the browser downloads: listing a
  // Pro block here publishes it, whatever the page then chooses to render.
  // Their previews are rendered to markup instead, by scripts/prerender.ts.
  const sources = [
    ...storiesIn(componentsDir, "components"),
    ...storiesIn(blocksDir, "blocks"),
  ].filter((source) => !licensedNames.has(source.name));

  const imports = sources
    .map(
      (source) =>
        `import * as ${identifier(source.name)} from "@ui/${source.group}/${source.name}/${source.name}.stories";`,
    )
    .join("\n");

  const entries = sources
    .map((source) => `  "${source.name}": ${identifier(source.name)},`)
    .join("\n");

  // Recorded here because it cannot be recovered at runtime: a module namespace
  // object sorts its keys, so importing the module loses the order the author
  // wrote — and the first story is the canonical one.
  const order = sources
    .map((source) => {
      const root = source.group === "blocks" ? blocksDir : componentsDir;
      const names = exportOrder(join(root, source.name, `${source.name}.stories.tsx`));
      return `  "${source.name}": ${JSON.stringify(names)},`;
    })
    .join("\n");

  writeFileSync(
    join(docsRoot, "src", "lib", "previews.generated.ts"),
    `// Generated by scripts/prepare.ts. Do not edit.
//
// Static imports rather than a glob, because Next resolves imports at build
// time and a dynamic path would defeat both bundling and type checking.
import type { StoryModule } from "./story-types";

${imports}

export const storyModules: Record<string, StoryModule> = {
${entries}
};

/**
 * Export order per story file, as written.
 *
 * Object.keys(module) returns them sorted, which is not the order anyone chose.
 * Names that are not stories are filtered out where this is consumed.
 */
export const storyOrder: Record<string, string[]> = {
${order}
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
function generateProps(): number {
  const groups: Record<string, PropsGroup[]> = {};

  for (const { name, group } of [
    ...storiesIn(componentsDir, "components"),
    ...storiesIn(blocksDir, "blocks"),
  ]) {
    const root = group === "blocks" ? blocksDir : componentsDir;
    const found = extractProps(join(root, name, `${name}.tsx`));
    if (found.length > 0) groups[name] = found;
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
function generateQuality(): { count: number; average: number } {
  const quality: Record<string, ComponentQuality> = {};

  // The published accessibility note is part of the assessment, and it lives in
  // the registry rather than in the source.
  const index = JSON.parse(
    readFileSync(join(docsRoot, "public", "r", "index.json"), "utf8"),
  ) as { items: { name: string }[] };

  // A licensed item has no public file, by design. Its note is read from the
  // same build the gated route serves, so a Pro block is measured against the
  // same rules as a free one — a catalogue where only the free half has a
  // quality score is a catalogue that looks like it is hiding something.
  const licensed = new Map(proItems(buildRegistry()).map((item) => [item.name, item]));

  for (const entry of index.items) {
    const item =
      licensed.get(entry.name) ??
      (JSON.parse(
        readFileSync(join(docsRoot, "public", "r", `${entry.name}.json`), "utf8"),
      ) as { name: string; type: string; a11y?: string });

    if (item.type !== "registry:ui" && item.type !== "registry:block") continue;

    const root = item.type === "registry:block" ? blocksDir : componentsDir;
    const assessed = assess(join(root, item.name), item.name, item.a11y);
    if (assessed) quality[item.name] = assessed;
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
 */
function assertNoLicensedPreviews(licensedNames: ReadonlySet<string>): void {
  const generated = readFileSync(join(docsRoot, "src", "lib", "previews.generated.ts"), "utf8");

  for (const name of licensedNames) {
    if (generated.includes(`/${name}/${name}.stories`)) {
      throw new Error(
        `The licensed block "${name}" is imported by previews.generated.ts, ` +
          "which a client component imports. That ships its source to every " +
          "visitor. Prerender it instead — see scripts/prerender.ts.",
      );
    }
  }
}

const files = publishRegistry();
const licensed = writeLicensedModule(licensedModule);

// From the registry build, which is the one place that decides what is
// licensed. A second list here would be a second answer.
const licensedNames: ReadonlySet<string> = new Set(
  proItems(buildRegistry()).map((item) => item.name),
);

const previews = generatePreviews(licensedNames);
assertNoLicensedPreviews(licensedNames);
const proPreviews = generateProPreviews(licensedNames);
const variants = generateVariants();
const props = generateProps();
const quality = generateQuality();
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
