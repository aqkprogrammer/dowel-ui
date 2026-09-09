import { ImageResponse } from "next/og";

import { SITE_NAME } from "./site";

/**
 * The shared social card.
 *
 * Every page gets a real image rather than none, because the alternative is not
 * "no card" — it is a link preview that shows a bare URL, which is what gets
 * shared and re-shared on the platforms developers actually find libraries on.
 *
 * Rendered by Satori, which supports a subset of CSS: flexbox only, no grid,
 * and every element with more than one child needs `display: flex` spelled out.
 * Kept to shapes and text so it needs no font file and no network fetch, which
 * is what lets all ninety-odd of these be generated at build time.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BRAND = "#545cdf";
const BACKGROUND = "#08080b";

export function renderOgImage(options: {
  title: string;
  description: string;
  eyebrow?: string;
}): ImageResponse {
  const { title, description, eyebrow } = options;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        backgroundImage: `radial-gradient(circle at 22% 8%, ${BRAND}38 0%, transparent 55%)`,
        padding: 72,
        color: "#f4f4f6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: `5px solid ${BRAND}`,
            display: "flex",
          }}
        />
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{SITE_NAME}</div>
        {eyebrow ? (
          <div
            style={{
              display: "flex",
              marginLeft: 6,
              padding: "6px 16px",
              borderRadius: 999,
              background: `${BRAND}2e`,
              border: `1px solid ${BRAND}80`,
              fontSize: 22,
              color: "#c7caf7",
            }}
          >
            {eyebrow}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: title.length > 40 ? 62 : 78,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {toRenderableText(title)}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 30,
            lineHeight: 1.35,
            color: "#a1a1ad",
            maxWidth: 940,
          }}
        >
          {toRenderableText(truncate(description, 150))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 24 }}>
        <div style={{ display: "flex", color: BRAND, fontWeight: 600 }}>dowelui.com</div>
        <div style={{ display: "flex", color: "#4b4b55" }}>·</div>
        <div style={{ display: "flex", color: "#7a7a86" }}>
          React · TypeScript · Tailwind CSS
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}

/** Cards clip rather than wrap forever; a cut mid-word reads as a bug. */
function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  return `${clipped.slice(0, clipped.lastIndexOf(" "))}…`;
}

/**
 * Keeps the text inside the glyphs the bundled font actually has.
 *
 * Satori answers a glyph it cannot draw by fetching a font for it over the
 * network, mid-build. That turns ninety-odd static images into ninety-odd
 * outbound requests, and one component whose description contains "⌘" is enough
 * to make a build fail on a machine without egress. Substituting the few
 * characters the registry actually uses keeps every card renderable offline.
 */
const GLYPH_SUBSTITUTIONS: [RegExp, string][] = [
  [/[—–]/g, "-"],
  [/[""]/g, '"'],
  [/['']/g, "'"],
  [/…/g, "..."],
  [/⌘/g, "Cmd"],
  [/[⇧⌥⌃]/g, ""],
  [/→/g, "->"],
  [/·/g, "-"],
];

function toRenderableText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of GLYPH_SUBSTITUTIONS) {
    result = result.replace(pattern, replacement);
  }
  // Anything still outside Latin-1 has no substitution worth guessing at, and
  // dropping it is better than a build-time font fetch for one character.
  return result
    .replace(/[^\u0020-\u00ff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
