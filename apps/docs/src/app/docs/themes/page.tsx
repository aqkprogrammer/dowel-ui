"use client";

import { THEME_PRESETS } from "@dowel-ui/themes";
import { Button } from "@dowel-ui/react/button";
import { Label } from "@dowel-ui/react/label";
import { Slider } from "@dowel-ui/react/slider";
import { cn } from "@dowel-ui/react";
import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CodePanel } from "~/components/site/code-panel";
import { CosmicBackground } from "~/components/site/cosmic-background";
import { DocSection } from "~/components/site/doc-section";
import { ThemeGallery } from "~/components/theme-gallery";

const TOKEN_CSS = `:root {
  --primary: oklch(0.54 0.196 275);
  --primary-foreground: oklch(0.985 0.002 265);
  --background: oklch(1 0 0);
  --foreground: oklch(0.212 0.011 265);
  --radius-scale: 1;
}

.dark {
  --primary: oklch(0.645 0.17 275);
  --background: oklch(0.145 0.01 265);
}`;

const SEMANTIC = [
  { token: "primary", className: "bg-primary" },
  { token: "secondary", className: "bg-secondary" },
  { token: "muted", className: "bg-muted" },
  { token: "accent", className: "bg-accent" },
  { token: "destructive", className: "bg-destructive" },
  { token: "success", className: "bg-success" },
  { token: "warning", className: "bg-warning" },
  { token: "info", className: "bg-info" },
] as const;

/**
 * The theme page changes the live site rather than a sandbox.
 *
 * The gallery previews every preset side by side, each scoped to its own
 * card; choosing one applies it to the whole site, which is the theming
 * system itself rather than a demonstration of a preview mechanism. The
 * radius knob, likewise, re-proportions this page.
 */
export default function ThemesPage() {
  const [radius, setRadius] = useState([1]);

  // The radius knob writes to the document, so it is put back on the way out:
  // a reader who leaves for another page should not take a squared-off site
  // with them.
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--radius-scale");
    },
    [],
  );

  return (
    <article>
      <header className="relative isolate pt-10 pb-10 sm:pt-14">
        <CosmicBackground
          intensity="ambient"
          seed={37}
          className="-inset-x-[50vw] -top-24 bottom-0 -z-10"
        />
        <p className="eyebrow" data-tone="orange">
          Themes · {THEME_PRESETS.length} presets
        </p>
        <h1 className="display-lg text-luminous mt-4">
          Find the visual language for your product.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
          Two tiers of OKLCH tokens: raw scales, and the semantic aliases components actually
          use. A preset reassigns a handful of them; every component follows, and no component
          file changes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
            <Link href="/theme-studio">
              Create your own theme
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="#figma">
              <Download aria-hidden="true" />
              Figma tokens
            </a>
          </Button>
        </div>
      </header>

      <DocSection
        id="presets"
        title="Presets"
        description="Each card is real components in that preset. Use one on this site to see it everywhere — the choice is remembered, and the palette menu in the header can change it back."
      >
        <ThemeGallery />
      </DocSection>

      <DocSection
        id="radius"
        title="One knob for every corner"
        description={
          <>
            Radius tokens are all multiples of <code className="font-mono">--radius-scale</code>
            , so a single custom property re-proportions the whole system. Drag it and watch
            this page — the presets above included.
          </>
        }
      >
        <div className="grid max-w-md gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--pane)] p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="radius-scale">Radius scale</Label>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {radius[0]?.toFixed(2)}×
            </span>
          </div>
          <Slider
            id="radius-scale"
            aria-label="Radius scale"
            min={0}
            max={2}
            step={0.05}
            value={radius}
            onValueChange={(next) => {
              setRadius(next);
              document.documentElement.style.setProperty("--radius-scale", String(next[0]));
            }}
          />
        </div>
      </DocSection>

      <DocSection
        id="tokens"
        title="Semantic tokens"
        description="Components reference only these. Colours are OKLCH, whose lightness is perceptually even — which makes ramps predictable to generate and contrast tractable to audit."
      >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEMANTIC.map((swatch) => (
            <li
              key={swatch.token}
              className="flex items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--pane)] p-3"
            >
              <span
                aria-hidden="true"
                className={cn("size-8 rounded-lg border border-border", swatch.className)}
              />
              <span className="font-mono text-xs text-muted-foreground">{swatch.token}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm text-pretty text-muted-foreground">
          The <code className="font-mono">monochrome</code> preset exists partly as a standing
          test: if a component becomes unusable without colour, colour was carrying meaning it
          should not have been.
        </p>
      </DocSection>

      <DocSection
        id="your-own"
        title="Your own theme"
        description={
          <>
            <code className="font-mono">init</code> writes the tokens into your stylesheet, so
            they are yours to edit. A theme is a handful of semantic values — no build step, no
            configuration file.
          </>
        }
      >
        <CodePanel language="css" title="app/globals.css" code={TOKEN_CSS} highlight={[2]} />
      </DocSection>

      <DocSection
        id="figma"
        title="In Figma"
        description={
          <>
            Every preset is a W3C design-tokens file, generated at build time from the same CSS
            the components use. Import one with Tokens Studio for Figma and you get three sets —{" "}
            <code className="font-mono">core</code>, <code className="font-mono">light</code>{" "}
            and <code className="font-mono">dark</code> — that mirror how the CSS composes. A
            preset built in the{" "}
            <Link
              href="/theme-studio"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Theme Studio
            </Link>{" "}
            downloads the same file.
          </>
        }
      >
        <ul className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((preset) => (
            <li key={preset}>
              <a
                href={`/figma/${preset}.tokens.json`}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--pane)] px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors outline-none hover:border-[var(--hairline-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                <Download aria-hidden="true" className="size-3" />
                {preset}.tokens.json
              </a>
            </li>
          ))}
        </ul>
      </DocSection>
    </article>
  );
}
