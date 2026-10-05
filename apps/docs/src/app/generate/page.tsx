import type { Metadata } from "next";

import { Generator } from "~/components/generator";
import { PageHeader } from "~/components/site/page-header";
import { SiteShell } from "~/components/site/site-shell";
import { branding } from "~/lib/branding";
import { getRegistryIndex } from "~/lib/registry";
import { pageMetadata } from "~/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Generate a React UI from a description",
  description:
    "Describe the screen you want and get the exact components that build it, resolved against the registry so nothing is invented and every name is one you can actually install.",
  path: "/generate",
  keywords: [
    "ai react ui generator",
    "generate react components",
    "ai ui builder react",
    "text to react ui",
  ],
});

const SITE_URL = branding.registryUrl.replace(/\/r$/, "");

export default function GeneratePage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Generate"
        title="Describe a screen. Get the parts that build it."
        cosmic="hero"
        seed={43}
        align="center"
        className="mx-auto max-w-4xl"
        description={
          <>
            A planner, not a model: your description is matched against the registry, so it
            cannot suggest something that does not exist — or a{" "}
            <code className="font-mono text-[0.9em]">variant</code> nobody implemented. It stops
            at the composition and leaves the props to the pages that document them.
          </>
        }
      />

      <Generator index={getRegistryIndex()} docsUrl={SITE_URL} />
    </SiteShell>
  );
}
