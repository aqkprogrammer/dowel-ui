import type { Metadata } from "next";

import { Generator } from "~/components/generator";
import { AstraHeaderShell, AstraHero } from "~/components/astra";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { branding } from "~/lib/branding";
import { getRegistryIndex } from "~/lib/registry";

export const metadata: Metadata = {
  title: "Generate",
  description:
    "Describe a screen and get the components that build it, resolved against the registry so nothing is invented.",
};

const SITE_URL = branding.registryUrl.replace(/\/r$/, "");

export default function GeneratePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AstraHeaderShell>
        <SiteHeader searchEntries={[]} />
      </AstraHeaderShell>
      <AstraHero variant="banner" leftLabel="Dowel" rightLabel="Generate" />

      <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Generate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Describe a screen and get the components that build it. Everything here is resolved
            against the registry first, so it cannot suggest something that does not exist —
            which is what asking a model directly gets you, complete with a <code>variant</code>{" "}
            nobody implemented. It also does not guess at props: the registry says what a
            component is, not the shape of its arguments, and a plausible invented prop is worse
            than an obvious gap.
          </p>
        </div>

        <Generator index={getRegistryIndex()} docsUrl={SITE_URL} />
      </main>

      <SiteFooter />
    </div>
  );
}
