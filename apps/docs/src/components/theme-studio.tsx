"use client";

import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dowel-ui/react/card";
import { CodeBlock } from "@dowel-ui/react/code-block";
import { Input } from "@dowel-ui/react/input";
import { Label } from "@dowel-ui/react/label";
import { Progress } from "@dowel-ui/react/progress";
import { Slider } from "@dowel-ui/react/slider";
import { Switch } from "@dowel-ui/react/switch";
import { cn } from "@dowel-ui/react";
import {
  checkPreset,
  derivePreset,
  formatOklch,
  formatPreset,
  hexToOklch,
  oklchToHex,
  presetDeclarations,
  slugify,
  toDesignTokens,
  type DerivedPreset,
  type Oklch,
  type PresetMode,
} from "@dowel-ui/themes";
import { Check, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { tokenDeclarations } from "~/lib/design-tokens.generated";

/** The default preset's primary, so the studio opens on something that works. */
const STARTING_COLOUR: Oklch = { l: 0.545, c: 0.196, h: 275 };

/**
 * Build a theme preset, and be told before you ship it whether it can be read.
 *
 * The point is not the colour picker. It is that the contrast readout below it
 * runs the same conversion as the audit that gates CI — so a colour this page
 * calls passing is one the build will also call passing, and a colour it calls
 * failing cannot be argued with by looking at it.
 */
export function ThemeStudio() {
  const [name, setName] = useState("brand");
  const [colour, setColour] = useState<Oklch>(STARTING_COLOUR);
  const [darkLightness, setDarkLightness] = useState<number | undefined>(undefined);
  const [radius, setRadius] = useState(1);

  const preset = useMemo(
    () => derivePreset(colour, { darkLightness }),
    [colour, darkLightness],
  );
  const checks = useMemo(() => checkPreset(preset), [preset]);
  const failures = checks.filter((check) => !check.passes);

  const slug = slugify(name);
  const css = useMemo(() => formatPreset(slug, preset), [slug, preset]);

  // The same preset, in the shape Figma reads: the shipped scale and semantic
  // tokens with this primary layered over them, radius evaluated at the scale
  // set here. A data URL rather than a blob, so there is nothing to revoke.
  const figmaHref = useMemo(() => {
    const tokens = toDesignTokens({
      name: slug,
      ...tokenDeclarations,
      preset: presetDeclarations(preset),
      radiusScale: radius,
    });
    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(tokens, null, 2))}`;
  }, [slug, preset, radius]);

  // Radius is a root-level property by construction; see the note in the
  // playground. Cleared on unmount so it does not follow the reader away.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--radius-scale", String(radius));
    return () => {
      root.style.removeProperty("--radius-scale");
    };
  }, [radius]);

  const hex = oklchToHex(colour);

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-6 lg:sticky lg:top-20">
        <div className="grid gap-2">
          <Label htmlFor="studio-name">Preset name</Label>
          <Input
            id="studio-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="brand"
          />
          <p className="text-xs text-muted-foreground">
            Applied as <code className="font-mono">data-theme=&quot;{slug}&quot;</code>.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="studio-colour">Primary colour</Label>
          <div className="flex items-center gap-2">
            {/*
              A native colour input, deliberately. It is the one control every
              platform already gives people — including an eyedropper on desktop
              — and a hand-built wheel would be worse at every part of it.
            */}
            <input
              id="studio-colour"
              type="color"
              value={hex}
              onChange={(event) => {
                const next = hexToOklch(event.target.value);
                if (next) setColour(next);
              }}
              className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
            />
            <Input
              value={hex}
              onChange={(event) => {
                const next = hexToOklch(event.target.value);
                if (next) setColour(next);
              }}
              aria-label="Primary colour as hex"
              className="font-mono"
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{formatOklch(colour)}</p>
        </div>

        <StudioSlider
          label="Lightness"
          hint={colour.l.toFixed(3)}
          min={0.1}
          max={0.95}
          step={0.005}
          value={colour.l}
          onChange={(l) => {
            setColour((previous) => ({ ...previous, l }));
          }}
        />
        <StudioSlider
          label="Chroma"
          hint={colour.c.toFixed(3)}
          min={0}
          max={0.37}
          step={0.005}
          value={colour.c}
          onChange={(c) => {
            setColour((previous) => ({ ...previous, c }));
          }}
        />
        <StudioSlider
          label="Hue"
          hint={`${colour.h.toFixed(0)}°`}
          min={0}
          max={360}
          step={1}
          value={colour.h}
          onChange={(h) => {
            setColour((previous) => ({ ...previous, h }));
          }}
        />

        <hr className="border-border" />

        <StudioSlider
          label="Dark mode lightness"
          hint={preset.dark.primary.l.toFixed(3)}
          min={0.3}
          max={0.95}
          step={0.005}
          value={preset.dark.primary.l}
          onChange={setDarkLightness}
        />
        <StudioSlider
          label="Radius"
          hint={`${radius.toFixed(2)}×`}
          valueText={`${radius.toFixed(2)} times the designed radius, applied to the whole page`}
          min={0}
          max={2}
          step={0.05}
          value={radius}
          onChange={setRadius}
        />
      </div>

      <div className="grid min-w-0 gap-6">
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-sm",
            failures.length === 0
              ? "border-success/40 bg-success/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-foreground",
          )}
        >
          {failures.length === 0 ? (
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          )}
          <div>
            <p className="font-medium">
              {failures.length === 0
                ? "Every state passes WCAG AA."
                : `${String(failures.length)} of ${String(checks.length)} states fail WCAG AA.`}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {failures.length === 0
                ? "Text on this colour reaches 4.5:1 in both modes, hovered and pressed."
                : "Adjust lightness until they pass — the same check runs in CI, so this is the answer you will get there."}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs"
            >
              <span className="min-w-0 truncate text-muted-foreground">{check.label}</span>
              <span
                className={cn(
                  "shrink-0 font-mono tabular-nums",
                  check.passes ? "text-success" : "text-destructive",
                )}
              >
                {check.ratio.toFixed(2)}:1
                <span className="sr-only">
                  {check.passes ? " — passes" : " — fails"}, minimum {check.minimum.toFixed(1)}
                  :1
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PreviewSurface mode={preset.light} label="Light" />
          <PreviewSurface mode={preset.dark} label="Dark" dark />
        </div>

        <div className="grid gap-2">
          <h2 className="text-sm font-medium">Export</h2>
          <p className="text-sm text-muted-foreground">
            The same file format as the presets that ship. Save it into your project&rsquo;s
            stylesheet, or into <code className="font-mono">packages/themes/src/presets/</code>{" "}
            in a fork, and it is covered by the same audit as everything else.
          </p>
          <CodeBlock language="css" title={`${slug}.css`} code={css}>
            {css}
          </CodeBlock>
        </div>

        <div className="grid gap-2">
          <h2 className="text-sm font-medium">For Figma</h2>
          <p className="text-sm text-muted-foreground">
            The same theme as W3C design tokens — every colour in both modes as sRGB hex, the
            radius ladder at the scale above, the type scale — which Tokens Studio for Figma
            imports as three sets: <code className="font-mono">core</code>,{" "}
            <code className="font-mono">light</code> and <code className="font-mono">dark</code>
            . Generated from the CSS, so it cannot disagree with it.
          </p>
          <div>
            <Button asChild variant="outline" size="sm">
              <a href={figmaHref} download={`${slug}.tokens.json`}>
                Download {slug}.tokens.json
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The preset applied to real components, in one mode.
 *
 * Inline custom properties rather than a generated stylesheet: these are the
 * four tokens a preset owns, and setting them on a container is exactly how
 * `data-theme` works — so what is on screen is produced the same way the
 * exported CSS will produce it.
 */
function PreviewSurface({
  mode,
  label,
  dark = false,
}: {
  mode: PresetMode;
  label: string;
  dark?: boolean;
}) {
  const style = {
    "--primary": formatOklch(mode.primary),
    "--primary-hover": formatOklch(mode.primaryHover),
    "--primary-active": formatOklch(mode.primaryActive),
    "--primary-foreground": formatOklch(mode.primaryForeground),
  } as CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-background p-5 text-foreground",
        dark && "dark",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm">Continue</Button>
        <Button size="sm" variant="secondary">
          Cancel
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="link">
          Link
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>Active</Badge>
        <Badge variant="secondary">Draft</Badge>
        <Switch defaultChecked aria-label={`${label} example switch`} />
      </div>

      <Progress value={62} aria-label={`${label} example progress`} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create project</CardTitle>
          <CardDescription>Projects group your deployments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Input placeholder="acme-inc" aria-label={`${label} example field`} />
          <Button className="w-full" size="sm">
            Create project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** A labelled slider whose name reaches the thumb, where the role lives. */
function StudioSlider({
  label,
  hint,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  valueText?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}): ReactNode {
  const labelId = useId();

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
      </div>
      <Slider
        aria-labelledby={labelId}
        aria-valuetext={valueText}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => {
          onChange(next ?? min);
        }}
      />
    </div>
  );
}

export type { DerivedPreset };
