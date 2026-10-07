import { version } from "./version.generated";

/**
 * Whether a documented feature has shipped on npm yet.
 *
 * The site deploys from `main`, which is ahead of the last release between
 * releases. A page that documents a command the published CLI does not have
 * sends people to an "unknown command" error — so each such feature carries
 * the version it ships in, and is marked until the package version reaches
 * it. Cutting the release bumps the version, and every marker disappears
 * without the pages being edited.
 */
export function isUnreleased(since: string, current: string = version): boolean {
  const parse = (value: string) =>
    value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(since), parse(current)];
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

/** The release the features on `main` but not yet on npm will ship in. */
export const NEXT_RELEASE = "0.13.0";

export { version as publishedVersion };
