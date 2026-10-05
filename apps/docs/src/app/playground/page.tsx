import type { Metadata } from "next";
import { Suspense } from "react";

import { Playground, type PlaygroundEntry } from "~/components/playground";
import { CosmicLoader } from "~/components/site/cosmic-loader";
import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { CATEGORY_LABELS, getComponents } from "~/lib/registry";
import { pageMetadata } from "~/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "React component playground",
  description:
    "Try every React component live, in every theme, with every variant — then copy the exact code into your project. No sign-up and nothing to install.",
  path: "/playground",
  keywords: [
    "react component playground",
    "react ui playground",
    "try react components",
    "tailwind component preview",
  ],
});

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
    <SiteShell>
      <PageHeader
        eyebrow={`Playground · ${String(entries.length)} components`}
        title="Turn every knob. Copy the code."
        cosmic="ambient"
        seed={31}
        description="Every control is read from the component itself — its variants from the same definition that generates its classes, its examples from the stories that run in CI. Nothing here can offer a value the component does not implement."
      />

      {/* useSearchParams needs a boundary, and the shell above it is worth
          painting immediately rather than after the client bundle arrives. */}
      <Suspense
        fallback={
          <div className="grid h-[36rem] place-items-center rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]">
            <CosmicLoader label="Loading the playground" />
          </div>
        }
      >
        <Playground entries={entries} />
      </Suspense>
    </SiteShell>
  );
}
