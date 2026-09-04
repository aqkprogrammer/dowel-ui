"use client";

import { THEME_PRESETS } from "@dowel-ui/themes";
import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dowel-ui/react/card";
import { CodeBlock } from "@dowel-ui/react/code-block";
import { Input } from "@dowel-ui/react/input";
import { Label } from "@dowel-ui/react/label";
import { Slider } from "@dowel-ui/react/slider";
import { cn } from "@dowel-ui/react";
import { useState } from "react";

import { Prose } from "~/components/prose";
import { useTheme } from "~/components/theme-provider";

const TOKEN_CSS = `:root {
  --primary: oklch(0.545 0.196 275);
  --primary-foreground: oklch(0.985 0.002 265);
  --background: oklch(1 0 0);
  --foreground: oklch(0.212 0.011 265);
  --radius-scale: 1;
}

.dark {
  --primary: oklch(0.645 0.17 275);
  --background: oklch(0.145 0.01 265);
}`;

/**
 * The theme page changes the live site rather than a sandbox.
 *
 * Anything else would be a demonstration of a preview mechanism instead of the
 * theming system itself.
 */
export default function ThemesPage() {
  const { preset, setPreset } = useTheme();
  const [radius, setRadius] = useState([1]);

  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Themes</h1>

      <div className="not-prose mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Build your own preset</p>
          <p className="text-sm text-muted-foreground">
            Pick a colour and be told whether text can be read on it — checked with the same
            conversion that gates CI.
          </p>
        </div>
        <Button asChild size="sm">
          <a href="/theme-studio">Open Theme Studio</a>
        </Button>
      </div>

      <Prose>
        <p>
          Tokens come in two tiers. Raw scales — a cool-tinted OKLCH neutral ramp, a radius
          ladder, a 15px-base type scale — and semantic aliases on top of them. Components
          reference only the semantic layer, so re-skinning the system touches no component
          file.
        </p>

        <h2>Presets</h2>
        <p>Pick one. This changes the whole site, not a preview pane.</p>
      </Prose>

      <div className="not-prose my-4 flex flex-wrap gap-2">
        {THEME_PRESETS.map((name) => (
          <Button
            key={name}
            variant={preset === name ? "primary" : "outline"}
            size="sm"
            className="capitalize"
            aria-pressed={preset === name}
            onClick={() => {
              setPreset(name);
            }}
          >
            {name}
          </Button>
        ))}
      </div>

      <div className="not-prose my-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create project</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="preview-name">Project name</Label>
              <Input id="preview-name" placeholder="acme-inc" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="success">Deployed</Badge>
              <Badge variant="destructive">Failed</Badge>
            </div>
            <Button>Create project</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semantic tokens</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { token: "primary", className: "bg-primary" },
              { token: "secondary", className: "bg-secondary" },
              { token: "muted", className: "bg-muted" },
              { token: "accent", className: "bg-accent" },
              { token: "destructive", className: "bg-destructive" },
              { token: "success", className: "bg-success" },
              { token: "warning", className: "bg-warning" },
              { token: "info", className: "bg-info" },
            ].map((swatch) => (
              <div key={swatch.token} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("size-5 rounded border border-border", swatch.className)}
                />
                <span className="font-mono text-2xs text-muted-foreground">{swatch.token}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Prose>
        <h2>One knob for every corner</h2>
        <p>
          Radius tokens are all multiples of <code>--radius-scale</code>, so a single custom
          property re-proportions the whole system. Drag it and watch the cards above.
        </p>
      </Prose>

      <div className="not-prose my-4 grid max-w-sm gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="radius-scale">Radius scale</Label>
          <span className="text-sm text-muted-foreground tabular-nums">
            {radius[0]?.toFixed(2)}
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

      <Prose>
        <h2>Your own theme</h2>
        <p>
          <code>init</code> writes the tokens into your stylesheet, so they are yours to edit. A
          theme is a handful of semantic values — no build step, no configuration file.
        </p>
      </Prose>

      <div className="not-prose my-4">
        <CodeBlock language="css" title="app/globals.css" code={TOKEN_CSS}>
          {TOKEN_CSS}
        </CodeBlock>
      </div>

      <Prose>
        <p>
          Colours are OKLCH because its lightness is perceptually even, which makes ramps
          predictable to generate and contrast tractable to audit. The <code>monochrome</code>{" "}
          preset exists partly as a standing test: if a component becomes unusable without
          colour, colour was carrying meaning it should not have been.
        </p>
      </Prose>
    </article>
  );
}
