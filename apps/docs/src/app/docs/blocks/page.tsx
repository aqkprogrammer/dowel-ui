import { Button } from "@dowel-ui/react/button";
import type { Metadata } from "next";
import Link from "next/link";

import { BlocksBrowser, type BlockBrowserGroup } from "~/components/blocks-browser";
import { JsonLd } from "~/components/json-ld";
import { PageHeader } from "~/components/site/page-header";
import { BLOCK_GROUPS, blockGroupLabel, blockGroupOf } from "~/lib/block-taxonomy";
import { proPreviews } from "~/lib/pro-previews.generated";
import { getBlocks } from "~/lib/registry";
import { breadcrumbSchema, collectionSchema, graph } from "~/lib/structured-data";

const COUNT = getBlocks().length;

export const metadata: Metadata = {
  title: "React page templates and UI blocks",
  description: `${String(COUNT)} ready-made React page templates — dashboards, login and signup, billing, settings, CRM and AI chat — assembled from accessible Tailwind CSS components and installed as source you own.`,
  keywords: [
    "react page templates",
    "react dashboard template",
    "react login page template",
    "tailwind react templates",
    "react admin template",
    "react ui blocks",
    "shadcn blocks",
  ],
  alternates: { canonical: "/docs/blocks" },
  openGraph: { type: "website", url: "/docs/blocks" },
};

/** Groups whose blocks are small forms: shown whole, not cropped. */
const CONTAINED = new Set(["auth"]);

export default function BlocksIndexPage() {
  const blocks = getBlocks();

  const groups: BlockBrowserGroup[] = BLOCK_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    blurb: group.blurb,
    blocks: blocks
      .filter((block) => blockGroupOf(block) === group.id)
      .map((block) => {
        const contained = CONTAINED.has(group.id);
        return {
          name: block.name,
          title: block.title,
          description: block.description,
          groupLabel: blockGroupLabel(group.id),
          components: block.registryDependencies.length,
          pro: block.access === "pro",
          fit: contained ? ("contain" as const) : ("width" as const),
          stageWidth: contained ? 560 : 1280,
          // A licensed block has no live preview anywhere on the site; its
          // card shows the first still rendered at build time instead.
          ...(block.access === "pro" && proPreviews[block.name]?.[0]
            ? { still: proPreviews[block.name]?.[0]?.html }
            : {}),
        };
      }),
  })).filter((group) => group.blocks.length > 0);

  const structuredData = graph(
    collectionSchema({
      name: "React page templates and UI blocks",
      description: "Whole page sections, assembled from the components.",
      path: "/docs/blocks",
      items: blocks.map((block) => ({
        name: block.name,
        title: block.title,
        description: block.description,
        path: `/docs/blocks/${block.name}`,
      })),
    }),
    breadcrumbSchema([
      { name: "Docs", path: "/docs" },
      { name: "Blocks", path: "/docs/blocks" },
    ]),
  );

  const pro = blocks.filter((block) => block.access === "pro").length;

  return (
    <article>
      <JsonLd json={structuredData} />
      <PageHeader
        eyebrow={`Blocks · ${String(blocks.length)} screens and sections`}
        title="Production-ready screens, assembled."
        cosmic="ambient"
        seed={29}
        description="Dashboards, sign-in, billing, AI surfaces and every section a landing page needs — built from the components rather than reimplementing them, and installed as source that is yours to edit."
        actions={
          <>
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <Link href="/docs/blocks/dashboard">Open the dashboard block</Link>
            </Button>
            {pro > 0 ? (
              <Button asChild variant="ghost">
                <Link href="/pricing">{pro} Pro surfaces · Pricing</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <BlocksBrowser groups={groups} />
    </article>
  );
}
