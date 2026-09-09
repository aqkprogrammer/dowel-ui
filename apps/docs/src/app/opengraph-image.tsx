import { branding } from "~/lib/branding";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "~/lib/og";
import { getComponents } from "~/lib/registry";

/** The card every page falls back to, and the one the home page uses. */
export const alt = `${branding.libraryName} UI — source-first React component library`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgImage({
    eyebrow: `${String(getComponents().length)} components`,
    title: "Source-first React UI library",
    description: branding.description,
  });
}
