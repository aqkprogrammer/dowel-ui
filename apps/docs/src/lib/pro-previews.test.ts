import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { licensedItems } from "./licensed-registry.generated";
import { proPreviews } from "./pro-previews.generated";

/**
 * The paywall, on the documentation site rather than in the registry.
 *
 * The registry's own suite already proves a licensed body never reaches
 * `public/r` and never reaches the npm tarball. It cannot see the third way out,
 * which is the one that was open: the previews imported every block into a
 * client component, so the compiled source of all four Pro blocks shipped in a
 * chunk served to anyone — from the page of a free component, no licence and no
 * request required.
 *
 * These read the generated files rather than mocking anything, because what
 * matters is what was actually written for the browser to download. They need
 * `scripts/prepare.ts` to have run, which `dev`, `build` and CI all do first.
 */

const generatedDir = join(process.cwd(), "src", "lib");

function generated(file: string): string {
  const path = join(generatedDir, file);
  if (!existsSync(path)) {
    throw new Error(
      `${file} has not been generated. Run \`tsx scripts/prepare.ts\` first — ` +
        "`dev` and `build` both do.",
    );
  }
  return readFileSync(path, "utf8");
}

const licensedNames = Object.keys(licensedItems);

describe("the preview paywall", () => {
  it("has licensed blocks to protect", () => {
    // Guards every assertion below: all of them pass vacuously against an empty
    // catalogue, which is exactly the state a broken registry build produces.
    expect(licensedNames.length).toBeGreaterThan(0);
  });

  it("imports no licensed block into the client preview map", () => {
    // previews.generated.ts is imported by story-preview.tsx, a client
    // component. Every module named in it is compiled into a chunk the browser
    // downloads, whatever the page then decides to render — so a name here is
    // published source, not a rendering detail.
    const previews = generated("previews.generated.ts");

    for (const name of licensedNames) {
      expect(previews, name).not.toContain(`/${name}/${name}.stories`);
    }
  });

  it("previews every licensed block from markup instead", () => {
    // Withholding the source is only half of it. A Pro block with no preview is
    // a Pro block nobody buys, and a page that silently renders nothing looks
    // like a page that failed to build.
    for (const name of licensedNames) {
      const stories = proPreviews[name];
      expect(stories, name).toBeDefined();
      expect(stories?.length, name).toBeGreaterThan(0);

      for (const story of stories ?? []) {
        expect(story.html.length, `${name}/${story.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("namespaces the ids React generated for that markup", () => {
    // The markup is injected into a page React also renders, and two renders
    // both counting from zero produce the same ids. `identifierPrefix` puts the
    // block and story into every one, so what is left of React's own sigil is
    // proof the prefix was not passed.
    //
    // Only React's ids. An id an author wrote — "ai-workspace-attachments" — is
    // theirs, is stable, and is referenced from their own markup.
    for (const [name, stories] of Object.entries(proPreviews)) {
      for (const story of stories) {
        expect(story.html, `${name}/${story.name}`).not.toContain('"_R_');
        expect(story.html, `${name}/${story.name}`).not.toContain('"_r_');
      }
    }
  });

  it("ships markup and nothing executable", () => {
    // It is injected with dangerouslySetInnerHTML. Injected <script> tags do not
    // run, but an inline handler does, and neither belongs in a still.
    for (const [name, stories] of Object.entries(proPreviews)) {
      for (const story of stories) {
        expect(story.html, `${name}/${story.name}`).not.toContain("<script");
        expect(story.html, `${name}/${story.name}`).not.toMatch(/\son[a-z]+="/);
      }
    }
  });
});
