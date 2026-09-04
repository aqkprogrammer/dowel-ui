import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { detectResolve, stripJsonComments } from "./project";

/** A throwaway project directory holding one tsconfig. */
function projectWith(tsconfig: string): string {
  const root = mkdtempSync(join(tmpdir(), "dowel-project-"));
  writeFileSync(join(root, "tsconfig.json"), tsconfig);
  return root;
}

/** What `create-next-app --ts --tailwind --app` writes, trimmed to what matters. */
const NEXT_TSCONFIG = `{
  "compilerOptions": {
    "strict": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`;

describe("stripJsonComments", () => {
  it("leaves a comment-free document alone", () => {
    expect(JSON.parse(stripJsonComments('{"a": 1}'))).toEqual({ a: 1 });
  });

  it("removes line and block comments", () => {
    const text = `{
      // a line comment
      "a": 1, /* and a block one */
      "b": 2
    }`;
    expect(JSON.parse(stripJsonComments(text))).toEqual({ a: 1, b: 2 });
  });

  it("removes a trailing comma, which tsconfig allows and JSON does not", () => {
    expect(JSON.parse(stripJsonComments('{"a": [1, 2,],}'))).toEqual({ a: [1, 2] });
  });

  it("does not treat a slash-star inside a string as a comment", () => {
    // The bug this exists for. "@/*" opens a block comment to a naive regex,
    // and "**/*.ts" closes it, taking the paths block with it.
    const parsed = JSON.parse(stripJsonComments(NEXT_TSCONFIG)) as {
      compilerOptions: { paths: Record<string, string[]> };
      include: string[];
    };

    expect(parsed.compilerOptions.paths).toEqual({ "@/*": ["./*"] });
    expect(parsed.include).toContain("**/*.ts");
  });

  it("keeps a comment marker that is only ever inside a string", () => {
    const parsed = JSON.parse(
      stripJsonComments('{"url": "https://example.test/x", "glob": "**/*.tsx"}'),
    ) as Record<string, string>;

    expect(parsed.url).toBe("https://example.test/x");
    expect(parsed.glob).toBe("**/*.tsx");
  });

  it("is not fooled by an escaped quote inside a string", () => {
    const parsed = JSON.parse(stripJsonComments('{"a": "say \\"/*\\" now", "b": 2}')) as Record<
      string,
      unknown
    >;

    expect(parsed.a).toBe('say "/*" now');
    expect(parsed.b).toBe(2);
  });

  it("survives an unterminated block comment rather than looping", () => {
    expect(stripJsonComments('{"a": 1} /* never closed')).toContain('"a": 1');
  });
});

describe("detectResolve", () => {
  it("reads the alias out of a stock Next.js tsconfig", () => {
    // Regression: this returned undefined for every Next.js project, so `init`
    // asked for an alias it could already see, or refused outright under --yes.
    expect(detectResolve(projectWith(NEXT_TSCONFIG))).toEqual({ prefix: "@/", base: "." });
  });

  it("reads the src-directory form", () => {
    const root = projectWith('{"compilerOptions": {"paths": {"@/*": ["./src/*"]}}}');
    expect(detectResolve(root)).toEqual({ prefix: "@/", base: "src" });
  });

  it("reads an alias written without a leading dot", () => {
    const root = projectWith('{"compilerOptions": {"paths": {"~/*": ["app/*"]}}}');
    expect(detectResolve(root)).toEqual({ prefix: "~/", base: "app" });
  });

  it("reads a tsconfig that uses comments and trailing commas", () => {
    const root = projectWith(`{
      // the alias this project uses
      "compilerOptions": {
        "paths": {
          "@/*": ["./src/*"],
        },
      },
    }`);
    expect(detectResolve(root)).toEqual({ prefix: "@/", base: "src" });
  });

  it("ignores a non-wildcard alias and takes the wildcard one", () => {
    const root = projectWith(
      '{"compilerOptions": {"paths": {"react": ["./vendor/react"], "@/*": ["./src/*"]}}}',
    );
    expect(detectResolve(root)).toEqual({ prefix: "@/", base: "src" });
  });

  it("returns undefined when there are no paths, so the caller can ask", () => {
    expect(detectResolve(projectWith('{"compilerOptions": {"strict": true}}'))).toBeUndefined();
  });

  it("returns undefined for a tsconfig that is not valid JSON at all", () => {
    expect(detectResolve(projectWith("{ this is not json"))).toBeUndefined();
  });

  it("returns undefined when there is no tsconfig", () => {
    expect(detectResolve(mkdtempSync(join(tmpdir(), "dowel-empty-")))).toBeUndefined();
  });
});
