/**
 * Runs a browser-tests script inside the official Playwright image.
 *
 * Screenshots are only comparable when everything that draws them is the
 * same: the Chromium build, the fonts it falls back to, the font rasteriser,
 * and the CPU architecture (Skia takes different SIMD paths on arm64 and
 * x86-64, which moves anti-aliased edges by a shade). So the image tag is read
 * from the installed @playwright/test — never typed — and for screenshots the
 * platform is forced to linux/amd64, which is what GitHub's runners are. On Apple silicon
 * that runs under emulation: slower, and the only way a baseline written here
 * matches one checked in CI.
 *
 * The repository is mounted as it is. Nothing is installed in the container:
 * @playwright/test is plain JavaScript, the browsers are in the image, and the
 * Storybook build is static files. Build Storybook on the host first.
 *
 *   node scripts/in-container.ts test:visual|test:a11y [playwright args…]
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

const here = join(import.meta.dirname, "..");
const repo = join(here, "..", "..");

const manifest = createRequire(join(here, "package.json")).resolve(
  "@playwright/test/package.json",
);
const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version: string };
const image = `mcr.microsoft.com/playwright:v${version}-noble`;

const [script = "test:visual", ...rest] = process.argv.slice(2);
/**
 * The axe suite is not pixel-sensitive, but `target-size` and `color-contrast`
 * read layout, and layout follows font metrics — a Mac's system font is not
 * Linux's. So the accessibility baseline is the container's too. Layout does
 * not depend on the CPU, though, so that suite runs natively and fast; only
 * the screenshots need the runners' architecture.
 */
const scripts: Record<string, { projects: string[]; platform?: string }> = {
  "test:visual": {
    projects: ["--project=visual", "--project=visual-mobile"],
    platform: "linux/amd64",
  },
  "test:a11y": { projects: ["--project=a11y"] },
};
const chosen = scripts[script];
if (chosen === undefined) {
  console.error(`Unknown script ${script}. Known: ${Object.keys(scripts).join(", ")}`);
  process.exit(1);
}

const workdir = `/work/${relative(repo, here)}`;
const args = [
  "run",
  "--rm",
  "--init",
  // Chromium uses shared memory heavily; the default 64 MB crashes it.
  "--ipc=host",
  ...(chosen.platform ? [`--platform=${chosen.platform}`] : []),
  "-v",
  `${repo}:/work`,
  "-w",
  workdir,
  "-e",
  "CI",
  // The Storybook build is copied off the bind mount before serving it. Read
  // through Docker Desktop's file sharing, each page's few dozen chunks took
  // seconds and the 2,700-page suite ran for hours; from the container's own
  // disk it runs at native speed.
  "-e",
  "STORYBOOK_STATIC_DIR=/tmp/storybook-static",
  image,
  "sh",
  "-c",
  'cp -R "$0" /tmp/storybook-static && exec node node_modules/@playwright/test/cli.js test "$@"',
  "/work/packages/ui/storybook-static",
  ...chosen.projects,
  ...rest,
];

console.log(`docker ${args.join(" ")}`);
const result = spawnSync("docker", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
