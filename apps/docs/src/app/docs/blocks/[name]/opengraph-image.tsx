import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "~/lib/og";
import { getBlocks } from "~/lib/registry";

export const alt = "React page template — preview card";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getBlocks().map((block) => ({ name: block.name }));
}

export default async function BlockOgImage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const block = getBlocks().find((entry) => entry.name === name);

  return renderOgImage({
    eyebrow: "Block",
    title: `React ${block?.title ?? name} template`,
    description: block?.description ?? "",
  });
}
