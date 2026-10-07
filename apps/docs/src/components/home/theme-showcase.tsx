"use client";

import { cn } from "@dowel-ui/react";
import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { Input } from "@dowel-ui/react/input";
import { Label } from "@dowel-ui/react/label";
import { Progress } from "@dowel-ui/react/progress";
import { Switch } from "@dowel-ui/react/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { Check, Rocket } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useTheme } from "../theme-provider";

/**
 * One interface, re-skinned by a preset.
 *
 * The preview is real components with the preset scoped to its wrapper — the
 * same `data-theme` attribute the library ships, on a div instead of <html> —
 * so what changes between presets is exactly what would change in an app. It
 * walks through the presets on its own until someone picks one, and never
 * walks at all for a reader who has asked for less motion.
 */

const PRESETS = [
  { id: "default", label: "Default" },
  { id: "ocean", label: "Ocean" },
  { id: "violet", label: "Violet" },
  { id: "emerald", label: "Emerald" },
  { id: "amber", label: "Amber" },
  { id: "monochrome", label: "Monochrome" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];

function subscribeMotion(callback: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => {
    query.removeEventListener("change", callback);
  };
}

export function ThemeShowcase() {
  const { resolvedDark } = useTheme();
  const [preset, setPreset] = useState<PresetId>("default");
  const [touched, setTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );

  // Only cycles while on screen: a timer re-rendering a section nobody can
  // see is work for nothing.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry?.isIntersecting ?? false);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (touched || paused || reduced || !visible) return;
    const timer = window.setInterval(() => {
      setPreset((current) => {
        const index = PRESETS.findIndex((entry) => entry.id === current);
        return PRESETS[(index + 1) % PRESETS.length]?.id ?? "default";
      });
    }, 2800);
    return () => {
      window.clearInterval(timer);
    };
  }, [touched, paused, reduced, visible]);

  return (
    <div
      ref={root}
      className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]"
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocusCapture={() => {
        setPaused(true);
      }}
      onBlurCapture={() => {
        setPaused(false);
      }}
    >
      <div role="radiogroup" aria-label="Theme preset" className="grid gap-1.5">
        {PRESETS.map((entry) => {
          const active = entry.id === preset;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setPreset(entry.id);
                setTouched(true);
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-[border-color,background-color] duration-[var(--duration-normal)] outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/55",
                active
                  ? "border-[var(--hairline-strong)] bg-[var(--pane-raised)]"
                  : "border-transparent hover:bg-[var(--pane)]",
              )}
            >
              {/* Each swatch is the preset's own primary, scoped the same way
                  as the preview — no colour is copied here. */}
              <span
                data-theme={entry.id === "default" ? undefined : entry.id}
                className={cn(
                  "size-5 shrink-0 rounded-full bg-primary shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]",
                  resolvedDark && "dark",
                )}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {entry.label}
              </span>
              {active ? (
                <Check aria-hidden="true" className="size-4 text-[var(--cosmic-blue)]" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,var(--glow-blue),transparent)] opacity-80"
        />
        <div
          data-theme={preset === "default" ? undefined : preset}
          className={cn(
            "rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:p-6",
            // `--color-primary` is resolved where it is declared, at the root,
            // so a preset scoped to this element has to re-point it here for
            // the components that read it rather than `--primary`.
            "[--color-primary-foreground:var(--primary-foreground)] [--color-primary-hover:var(--primary-hover)] [--color-primary:var(--primary)]",
            // Every colour eases between presets, so a switch reads as the
            // same interface changing rather than a new one appearing.
            "[&_*]:transition-[background-color,border-color,color,box-shadow] [&_*]:duration-500",
            resolvedDark && "dark",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Rocket aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight">Ship acme-web v2.4</p>
              <p className="text-sm text-muted-foreground">Production · main · 3 changes</p>
            </div>
            <Badge variant="success" size="sm">
              Healthy
            </Badge>
          </div>

          <Tabs defaultValue="deploy" className="mt-5">
            <TabsList indicator="slide" aria-label="Deployment">
              <TabsTrigger value="deploy">Deploy</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="deploy" className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="theme-preview-name">Project</Label>
                <Input id="theme-preview-name" defaultValue="acme-web" />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Build</span>
                  <span className="tabular-nums">72%</span>
                </div>
                <Progress value={72} aria-label="Build progress" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button>Deploy</Button>
                <Button variant="outline">Preview</Button>
                <Button variant="soft">Roll back</Button>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-5">
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
                {
                  "▲ Installing 214 packages\n✓ Compiled in 8.2s\n✓ Generated 412 static pages\n● Uploading build output…"
                }
              </pre>
            </TabsContent>

            <TabsContent value="settings" className="mt-5 grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="theme-preview-previews">Preview deployments</Label>
                <Switch id="theme-preview-previews" defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="theme-preview-protect">Protect production</Label>
                <Switch id="theme-preview-protect" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        {/* Not a live region: the presets cycle on their own, and announcing
            each one every few seconds would talk over the rest of the page. */}
        <p className="mt-4 text-center font-mono text-[0.6875rem] text-muted-foreground">
          data-theme=&quot;{preset}&quot;
        </p>
      </div>
    </div>
  );
}
