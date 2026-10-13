import type { Metadata } from "next";

import { BackgroundsGallery, type GalleryItem } from "~/components/backgrounds-gallery";
import { JsonLd } from "~/components/json-ld";
import { PageHeader } from "~/components/site/page-header";
import {
  BACKGROUNDS,
  BACKGROUND_CATEGORIES,
  backgroundPrompt,
  pageSnippet,
  sectionSnippet,
} from "~/lib/backgrounds";
import { breadcrumbSchema, graph } from "~/lib/structured-data";

const COUNT = BACKGROUNDS.length;

export const metadata: Metadata = {
  title: `${String(COUNT)} animated React backgrounds`,
  description: `${String(COUNT)} animated backgrounds for React — WebGL scenes (dunes, storm sea, nebula, glass, liquid metal, DNA helix), canvas particles and CSS light. Each one installs as source and comes with a prompt for your AI coding agent.`,
  keywords: [
    "react animated background",
    "webgl background react",
    "shader background",
    "hero background",
    "animated gradient background",
    "ai prompt background",
  ],
  alternates: { canonical: "/docs/backgrounds" },
  openGraph: { type: "website", url: "/docs/backgrounds" },
};

/**
 * Every background, live, with a prompt to copy.
 *
 * The prompts and snippets are composed here, on the server, from the same
 * catalogue the cards show; the gallery only receives strings.
 */
export default function BackgroundsPage() {
  const items: GalleryItem[] = BACKGROUNDS.map((entry) => ({
    ...entry,
    prompt: backgroundPrompt(entry),
    sectionCode: sectionSnippet(entry),
    pageCode: pageSnippet(entry),
  }));

  return (
    <>
      <JsonLd
        json={graph(
          breadcrumbSchema([
            { name: "Docs", path: "/docs" },
            { name: "Backgrounds", path: "/docs/backgrounds" },
          ]),
        )}
      />
      <PageHeader
        eyebrow="Backgrounds"
        title="Page backgrounds"
        description={`${String(COUNT)} animated backgrounds — procedural WebGL scenes, canvas particles and CSS light. Put one behind a section or the whole page, and copy a ready-made prompt for your AI agent.`}
      />
      <BackgroundsGallery items={items} categories={BACKGROUND_CATEGORIES} />
    </>
  );
}
