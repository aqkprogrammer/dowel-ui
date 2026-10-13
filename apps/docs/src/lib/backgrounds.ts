import {
  SHADER_BACKGROUND_PRESETS,
  SHADER_BACKGROUND_PRESET_NAMES,
  type ShaderBackgroundPreset,
} from "@ui/components/shader-background/shader-background-presets";

import { branding } from "./branding";
import { absoluteUrl } from "./site";

/**
 * Every background in the library, as one catalogue.
 *
 * The backgrounds page reads this, and so does each card's prompt: a prompt is
 * written for a coding agent and says exactly what to install, where to put it
 * and what not to do, so it is generated from the same facts the card shows —
 * one source, nothing to drift. The fourteen shader scenes come straight from
 * the presets file the component ships; the rest are the library's other
 * background components at their most characteristic settings.
 *
 * Pure data: no React, so the server page and the client gallery both import it.
 */

export type BackgroundCategory =
  "landscape" | "floral" | "abstract" | "particles" | "cosmic" | "science";

export const BACKGROUND_CATEGORIES: { id: BackgroundCategory; label: string }[] = [
  { id: "landscape", label: "Landscape" },
  { id: "floral", label: "Floral" },
  { id: "abstract", label: "Abstract & glass" },
  { id: "particles", label: "Particles" },
  { id: "cosmic", label: "Cosmic" },
  { id: "science", label: "Science" },
];

/** What the text over it should be: light on a dark scene, dark on a light one, or the theme's own. */
export type BackgroundTone = "dark" | "light" | "theme";

export type BackgroundProps = Record<string, string | number | boolean | readonly string[]>;

export interface BackgroundEntry {
  /** Unique on the page; also the card's anchor. */
  id: string;
  title: string;
  category: BackgroundCategory;
  description: string;
  /** The registry item that draws it. */
  component: string;
  /** Its export name. */
  exportName: string;
  /** The props that make this look, as written in the snippet. */
  props: BackgroundProps;
  tone: BackgroundTone;
  /** How it is drawn, which decides what it costs. */
  engine: "WebGL" | "Canvas 2D" | "CSS" | "SVG";
  /** Whether it reacts to the pointer. */
  interactive?: boolean;
}

const SHADER_TONES: Record<ShaderBackgroundPreset, BackgroundTone> = {
  dunes: "dark",
  hills: "light",
  "storm-sea": "dark",
  meadow: "light",
  petals: "dark",
  "glass-wave": "dark",
  "liquid-metal": "dark",
  silk: "dark",
  "mesh-gradient": "theme",
  topography: "theme",
  "particle-ocean": "dark",
  nebula: "dark",
  warp: "dark",
  helix: "dark",
};

const SHADER_ENTRIES: BackgroundEntry[] = SHADER_BACKGROUND_PRESET_NAMES.map((preset) => {
  const spec = SHADER_BACKGROUND_PRESETS[preset];
  return {
    id: preset,
    title: spec.title,
    category: spec.category,
    description: spec.description,
    component: "shader-background",
    exportName: "ShaderBackground",
    props: { preset },
    tone: SHADER_TONES[preset],
    engine: "WebGL",
  };
});

const COMPONENT_ENTRIES: BackgroundEntry[] = [
  {
    id: "aurora-curtain",
    title: "Aurora Curtain",
    category: "cosmic",
    description: "Streaked bands of light hung from the top, shearing slowly past each other.",
    component: "aurora-background",
    exportName: "AuroraBackground",
    props: { variant: "curtain", intensity: 0.9 },
    tone: "theme",
    engine: "CSS",
  },
  {
    id: "aurora-glow",
    title: "Aurora Glow",
    category: "abstract",
    description: "Three soft fields of the theme's colours wandering about the box.",
    component: "aurora-background",
    exportName: "AuroraBackground",
    props: { variant: "glow", intensity: 0.9 },
    tone: "theme",
    engine: "CSS",
  },
  {
    id: "cosmic-orbits",
    title: "Cosmic Orbits",
    category: "cosmic",
    description: "A seeded star field with orbiting bodies, rings and a glowing core.",
    component: "cosmic-background",
    exportName: "CosmicBackground",
    props: {},
    tone: "theme",
    engine: "Canvas 2D",
    interactive: true,
  },
  {
    id: "starfield",
    title: "Starfield",
    category: "cosmic",
    description: "Drifting stars at three depths, with the occasional shooting star.",
    component: "stars-background",
    exportName: "StarsBackground",
    props: { shootingStars: true },
    tone: "theme",
    engine: "Canvas 2D",
    interactive: true,
  },
  {
    id: "black-hole",
    title: "Black Hole",
    category: "cosmic",
    description: "Rings and spokes falling into a well, bending toward the centre.",
    component: "hole-background",
    exportName: "HoleBackground",
    props: { shape: "well" },
    tone: "theme",
    engine: "Canvas 2D",
    interactive: true,
  },
  {
    id: "constellation",
    title: "Constellation",
    category: "particles",
    description: "Stars pulled toward the pointer, linked to their neighbours by faint lines.",
    component: "gravity-stars-background",
    exportName: "GravityStarsBackground",
    props: { connections: true },
    tone: "theme",
    engine: "Canvas 2D",
    interactive: true,
  },
  {
    id: "fireworks",
    title: "Fireworks",
    category: "particles",
    description: "Rockets launching on their own and bursting into falling sparks.",
    component: "fireworks-background",
    exportName: "FireworksBackground",
    props: { autoLaunch: true },
    tone: "theme",
    engine: "Canvas 2D",
    interactive: true,
  },
  {
    id: "bubbles",
    title: "Bubbles",
    category: "abstract",
    description: "Blurred, gooey blobs of colour floating and merging.",
    component: "bubble-background",
    exportName: "BubbleBackground",
    props: {},
    tone: "theme",
    engine: "CSS",
    interactive: true,
  },
  {
    id: "gradient-mesh",
    title: "Gradient Mesh",
    category: "abstract",
    description: "A drifting CSS mesh of the theme's colours with a fine grain.",
    component: "gradient-background",
    exportName: "GradientBackground",
    props: { variant: "mesh", grain: true },
    tone: "theme",
    engine: "CSS",
    interactive: true,
  },
  {
    id: "hexagon-grid",
    title: "Hexagon Grid",
    category: "abstract",
    description: "A honeycomb of cells that light up under the pointer and pulse when idle.",
    component: "hexagon-background",
    exportName: "HexagonBackground",
    props: { idle: true },
    tone: "theme",
    engine: "SVG",
    interactive: true,
  },
];

export const BACKGROUNDS: BackgroundEntry[] = [...SHADER_ENTRIES, ...COMPONENT_ENTRIES];

/* Code and prompts ------------------------------------------------------- */

function formatProp(name: string, value: BackgroundProps[string]): string {
  if (value === true) return name;
  if (typeof value === "string") return `${name}="${value}"`;
  if (Array.isArray(value)) return `${name}={${JSON.stringify(value)}}`;
  return `${name}={${String(value)}}`;
}

function jsxProps(props: BackgroundProps, extra: BackgroundProps = {}): string {
  return Object.entries({ ...props, ...extra })
    .map(([name, value]) => ` ${formatProp(name, value)}`)
    .join("");
}

/** The import line, as the CLI installs it. */
export function importLine(entry: BackgroundEntry): string {
  return `import { ${entry.exportName} } from "@/components/ui/${entry.component}";`;
}

export function installArgs(entry: BackgroundEntry): string {
  return `add ${entry.component}`;
}

const TEXT_CLASS: Record<BackgroundTone, string> = {
  dark: "text-white",
  light: "text-slate-950",
  theme: "text-foreground",
};

/** Behind a single section: the component wraps the content. */
export function sectionSnippet(entry: BackgroundEntry): string {
  return `${importLine(entry)}

export function Hero() {
  return (
    <${entry.exportName}${jsxProps(entry.props)} className="min-h-[80vh]">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center ${TEXT_CLASS[entry.tone]}">
        <h1 className="text-5xl font-semibold tracking-tight">Your headline</h1>
        <p className="text-lg opacity-80">One sentence about the product.</p>
      </div>
    </${entry.exportName}>
  );
}`;
}

/**
 * Behind a whole page. The shader scene pins itself to the viewport; the other
 * components are positioned fixed by class, behind the content.
 */
export function pageSnippet(entry: BackgroundEntry): string {
  const isShader = entry.component === "shader-background";
  if (isShader) {
    return `${importLine(entry)}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <${entry.exportName}${jsxProps(entry.props, { attach: "viewport" })}>
          {children}
        </${entry.exportName}>
      </body>
    </html>
  );
}`;
  }
  return `${importLine(entry)}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background">
        <${entry.exportName}${jsxProps(entry.props)} className="fixed inset-0 -z-10" />
        <div className="relative">{children}</div>
      </body>
    </html>
  );
}`;
}

/**
 * A prompt to paste into a coding agent. It names the exact command, file and
 * props, and the few things an agent left to itself gets wrong with a
 * background: two of them on a page, a second animation loop, text that
 * cannot be read, decoration that takes focus.
 */
export function backgroundPrompt(entry: BackgroundEntry): string {
  const isShader = entry.component === "shader-background";
  const text = TEXT_CLASS[entry.tone];
  const readability =
    entry.tone === "theme"
      ? "It follows the active theme in light and dark mode, so keep the theme's text colours (text-foreground, text-muted-foreground)."
      : `It is a ${entry.tone} scene in both colour schemes, so set text over it in ${text} and keep long copy on a surface (a card with a translucent background and backdrop-blur).`;

  const lines = [
    `Add the "${entry.title}" animated background from ${branding.libraryName} UI to this project.`,
    "",
    `What it looks like: ${entry.description} It is drawn with ${entry.engine}${entry.interactive ? " and reacts to the pointer" : ""}.`,
    "",
    "Steps:",
    `1. Install the component as source: \`npx ${branding.cliPackage} ${installArgs(entry)}\`. If the project has no ${branding.libraryName} setup yet, run \`npx ${branding.cliPackage} init\` first. Do not install it from npm or copy it from anywhere else.`,
    `2. Import it with \`${importLine(entry)}\` (adjust the path to wherever the CLI wrote it).`,
    "3. Use it as the background of the landing page's hero section:",
    "",
    "```tsx",
    sectionSnippet(entry),
    "```",
    "",
    "   Or, to put it behind the whole site, in the root layout:",
    "",
    "```tsx",
    pageSnippet(entry),
    "```",
    "",
    `4. Readability: ${readability}`,
    isShader
      ? `5. Customise only through props: \`preset\`, \`colors\` (up to four theme tokens such as "primary" or any CSS colour, in the order the scene uses them), \`speed\`, \`scale\`, \`grain\`, \`vignette\`, \`fade\` ("edges" | "top" | "bottom") and \`resolution\` (lower it, e.g. 0.6, on very large screens).`
      : `5. Customise only through the component's documented props (see ${absoluteUrl(`/docs/components/${entry.component}`)}).`,
    "",
    "Rules:",
    "- Use one animated background per page.",
    isShader
      ? "- Each one is a WebGL context; never render more than a few on a page."
      : "- Keep it decorative: never put interactive controls inside the background layer itself. If <body> or a wrapper paints an opaque background, it hides a -z-10 layer; move that background to <html>.",
    "- Do not add your own requestAnimationFrame loop, CSS animation or video for this effect; the component already pauses off-screen and in hidden tabs, and holds still under prefers-reduced-motion.",
    "- It is aria-hidden decoration: do not give it a role, label or tab stop, and keep all real content as children (or siblings) above it.",
    `- Do not change the component's source to restyle it; pass props instead, so \`${branding.cliName} update\` can still update it.`,
  ];
  return lines.join("\n");
}
