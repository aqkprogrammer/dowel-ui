import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "~/lib/og";
import { getComponents } from "~/lib/registry";

/**
 * One social card per component, generated at build time.
 *
 * `alt` is a module-level export, so it is necessarily one string for all
 * seventy-five routes — per-route alt needs `generateImageMetadata`, which
 * moves the image behind a `[__metadata_id__]` segment and is not worth it for
 * a field no engine ranks on. The card itself names the component; this is the
 * fallback for a reader who never sees it.
 */
export const alt = "React component documentation — preview card";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getComponents().map((item) => ({ name: item.name }));
}

export default async function ComponentOgImage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const item = getComponents().find((component) => component.name === name);

  return renderOgImage({
    eyebrow: "Component",
    title: `React ${item?.title ?? name} component`,
    description: item?.description ?? "",
  });
}
