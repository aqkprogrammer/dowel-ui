export interface WorkspacePackage {
  name: string;
  version: string;
  private: boolean;
  dir: string;
}

/** "v0.11.0" → "0.11.0". Anything else is not a release tag. */
export function versionFromTag(tag: string): string {
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!match?.[1])
    throw new Error(`"${tag}" is not a release tag: expected vMAJOR.MINOR.PATCH.`);
  return match[1];
}

/**
 * The published packages that are not at the release's version.
 *
 * A feature release moves every published package together (RELEASING.md), so
 * a tag that some of them do not match is a tag pushed before the version
 * commit, or from the wrong one. Private packages are not published and are
 * not checked: `dowel-cli` has sat at 0.2.0 since it was retired.
 */
export function outOfStep(packages: readonly WorkspacePackage[], version: string): string[] {
  return packages
    .filter((entry) => !entry.private && entry.version !== version)
    .map((entry) => `${entry.name}@${entry.version}`);
}

/** The changelog's section for a version, without its heading; null when there is none. */
export function changelogSection(changelog: string, version: string): string | null {
  const heading = `## ${version}\n`;
  const start = changelog.indexOf(heading);
  if (start === -1) return null;
  const from = start + heading.length;
  const next = changelog.indexOf("\n## ", from);
  const section = changelog.slice(from, next === -1 ? undefined : next).trim();
  return section === "" ? null : section;
}
