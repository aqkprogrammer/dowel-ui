import { Badge } from "@dowel-ui/react/badge";
import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { getBlocks } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Blocks",
  description: "Whole page sections, assembled from the components.",
};

export default function BlocksIndexPage() {
  const blocks = getBlocks();

  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Blocks</h1>

      <Prose>
        <p>
          Blocks are whole sections — a sign-in form, a settings page, a chat surface —
          assembled from the components rather than reimplementing them. Installing one brings
          everything it is built from with it.
        </p>
        <p>
          They are starting points, not black boxes. The source lands in your project like any
          other file, and it is meant to be edited: the layout, the copy and the fields are all
          yours.
        </p>
        <p>
          Blocks marked <strong>Pro</strong> install the same way once the CLI is signed in with
          a licence key. Their previews are real; only the source is withheld. See{" "}
          <Link href="/pricing">pricing</Link>.
        </p>
      </Prose>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <li key={block.name}>
            <Link
              href={`/docs/blocks/${block.name}`}
              className="block rounded-lg border border-border p-4 transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/55"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{block.title}</span>
                <Badge size="sm" variant="secondary">
                  {block.registryDependencies.length} components
                </Badge>
                {block.access === "pro" ? (
                  <Badge size="sm" variant="default">
                    Pro
                  </Badge>
                ) : null}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {block.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
