"use client";

import { cn } from "@dowel-ui/react";
import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import { Progress } from "@dowel-ui/react/progress";
import { Switch } from "@dowel-ui/react/switch";
import { THEME_PRESETS, type ThemePreset } from "@dowel-ui/themes";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "./theme-provider";

/**
 * Every preset, each shown on real components.
 *
 * A card scopes its preset to itself with the library's own `data-theme`
 * attribute, so thirteen presets render side by side without touching the
 * page — and "Use on this site" applies one to the whole site through the same
 * switch the header's palette menu uses. A search for "ocean theme" links here
 * with `#preset-ocean`, which is outlined until the reader moves on.
 */
export function ThemeGallery() {
  const { preset: current, setPreset, resolvedDark } = useTheme();
  const [targeted, setTargeted] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      setTargeted(hash.startsWith("preset-") ? hash.slice("preset-".length) : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("hashchange", read);
    };
  }, []);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {THEME_PRESETS.map((name: ThemePreset) => {
        const active = current === name;
        return (
          <li
            key={name}
            id={`preset-${name}`}
            className={cn(
              "lift scroll-mt-24 overflow-hidden rounded-2xl border bg-[var(--pane)]",
              active || targeted === name
                ? "border-[var(--cosmic-blue)] shadow-[0_0_0_1px_var(--cosmic-blue),0_20px_60px_-30px_var(--glow-blue)]"
                : "border-[var(--hairline)]",
            )}
          >
            {/* A picture of the preset, made of real components: inert, so
                thirteen copies of the same controls are not thirteen extra
                stops in the tab order. "Use on this site" is the way in. */}
            <div
              inert
              aria-hidden="true"
              data-theme={name === "default" ? undefined : name}
              className={cn(
                "grid gap-4 bg-card p-5 text-card-foreground",
                "[--color-primary-foreground:var(--primary-foreground)] [--color-primary-hover:var(--primary-hover)] [--color-primary:var(--primary)]",
                resolvedDark && "dark",
              )}
            >
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-7 flex-[3] rounded-md bg-primary" />
                <span className="h-7 flex-1 rounded-md bg-primary-hover" />
                <span className="h-7 flex-1 rounded-md bg-primary-active" />
                <span className="h-7 flex-1 rounded-md border border-border bg-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Continue</Button>
                <Button size="sm" variant="soft">
                  Soft
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Switch defaultChecked />
                <Progress value={64} className="flex-1" />
                <Badge size="sm">New</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-5 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{name}</p>
                <p className="font-mono text-[0.6875rem] text-muted-foreground">
                  data-theme=&quot;{name}&quot;
                </p>
              </div>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setPreset(name);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-[var(--hairline-strong)] text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? <Check aria-hidden="true" className="size-3.5" /> : null}
                {active ? "On this site" : "Use on this site"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
