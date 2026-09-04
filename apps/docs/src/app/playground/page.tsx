import type { Metadata } from "next";
import { Suspense } from "react";

import { Playground, type PlaygroundEntry } from "~/components/playground";
import { SiteHeader } from "~/components/site-header";
import { CATEGORY_LABELS, getComponents } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Playground",
  description: "Try every component, in every theme, and take the code with you.",
};

export default function PlaygroundPage() {
  const entries: PlaygroundEntry[] = getComponents()
    .map((item) => ({
      name: item.name,
      title: item.title,
      category: CATEGORY_LABELS[item.category] ?? item.category,
      description: item.description,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader searchEntries={[]} />

      <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every control here is read from the component itself — its variants come from the
            same definition that generates its classes, and the previews are the stories that
            run in CI. Nothing on this page can offer a value the component does not implement.
          </p>
        </div>

        {/* useSearchParams needs a boundary, and the shell above it is worth
            painting immediately rather than after the client bundle arrives. */}
        <Suspense fallback={<div className="h-96" />}>
          <Playground entries={entries} />
        </Suspense>
      </main>
    </div>
  );
}
