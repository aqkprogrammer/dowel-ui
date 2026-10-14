import { describe, expect, it } from "vitest";

import { changelogSection, outOfStep, versionFromTag, type WorkspacePackage } from "./release";

describe("versionFromTag", () => {
  it("reads the version from a release tag", () => {
    expect(versionFromTag("v0.11.0")).toBe("0.11.0");
  });

  it.each(["0.11.0", "v0.11", "v0.11.0-beta.1", "release-1", ""])("refuses %j", (tag) => {
    expect(() => versionFromTag(tag)).toThrow("is not a release tag");
  });
});

describe("outOfStep", () => {
  const packages: WorkspacePackage[] = [
    { name: "@dowel-ui/react", version: "0.11.0", private: false, dir: "packages/ui" },
    { name: "@dowel-ui/cli", version: "0.10.0", private: false, dir: "packages/cli" },
    { name: "dowel-cli", version: "0.2.0", private: true, dir: "packages/cli-alias" },
  ];

  it("names the published packages that were not bumped", () => {
    expect(outOfStep(packages, "0.11.0")).toEqual(["@dowel-ui/cli@0.10.0"]);
  });

  it("does not hold private packages to the release's version", () => {
    expect(outOfStep(packages.slice(0, 1).concat(packages.slice(2)), "0.11.0")).toEqual([]);
  });
});

describe("changelogSection", () => {
  const changelog = [
    "# Changelog",
    "",
    "## 0.11.0",
    "",
    "Seven components.",
    "",
    "### Fixed",
    "",
    "- One thing.",
    "",
    "## 0.10.0",
    "",
    "Agent-operable UI.",
    "",
  ].join("\n");

  it("takes a version's section, subheadings included, without its own heading", () => {
    expect(changelogSection(changelog, "0.11.0")).toBe(
      "Seven components.\n\n### Fixed\n\n- One thing.",
    );
  });

  it("takes the last section to the end of the file", () => {
    expect(changelogSection(changelog, "0.10.0")).toBe("Agent-operable UI.");
  });

  it("is null for a version the changelog does not have, or left empty", () => {
    expect(changelogSection(changelog, "0.12.0")).toBeNull();
    expect(changelogSection("## 0.12.0\n\n## 0.11.0\n\nText.\n", "0.12.0")).toBeNull();
  });

  it("matches the whole heading, not a version that only starts the same", () => {
    expect(changelogSection("## 0.11.0\n\nEleven.\n", "0.1")).toBeNull();
  });
});
