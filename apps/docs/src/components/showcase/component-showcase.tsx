"use client";

import { cn } from "@dowel-ui/react";
import { Button } from "@dowel-ui/react/button";
import { ArrowRight, ArrowUpRight, MousePointerClick } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

import { categoryMeta } from "~/lib/category-meta";

import { LiveStage } from "../live-stage";

/**
 * The showcase's stories, as their own chunk, fetched once the page is
 * interactive: the star field above is what the first paint is for.
 */
const ShowcaseStory = dynamic(
  () => import("./showcase-stories").then((mod) => mod.ShowcaseStory),
  { ssr: false },
);

export interface ShowcaseTile {
  name: string;
  story: string;
  size: "hero" | "wide" | "base";
  title: string;
  description: string;
  category: string;
  label: string;
  /** What to do with it, for the components that answer to a pointer. */
  hint?: string;
  /** Width the story is laid out at before it is scaled into the tile. */
  stageWidth?: number;
  /** Cap on the scale — a toggle blown up to fill a tile stops looking like one. */
  maxScale?: number;
}

export interface MarqueeEntry {
  name: string;
  title: string;
  category: string;
}

/**
 * Sets `data-shown` on each marked child as it scrolls into view, once.
 *
 * The hidden starting state is declared only for browsers with script, so
 * the tiles are never lost to a page that did not hydrate.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, []);
  return ref;
}

function Tile({ tile, index }: { tile: ShowcaseTile; index: number }) {
  const Icon = categoryMeta(tile.category).icon;
  return (
    <li
      data-reveal=""
      className={cn(
        "min-w-0",
        tile.size === "hero" && "sm:col-span-2 sm:row-span-2",
        tile.size === "wide" && "sm:col-span-2",
      )}
      style={{ "--reveal-delay": `${String((index % 4) * 90)}ms` } as CSSProperties}
    >
      <div className="group/tile relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xs transition-[border-color,box-shadow] duration-[var(--duration-normal)] hover:border-primary/40 hover:shadow-lg">
        <div className="docs-stage-backdrop relative min-h-0 flex-1">
          {/* Live and operable: trying the component is what this is for.
              Only the footer below is a link, so nothing here is nested in one. */}
          <LiveStage
            interactive
            className="absolute inset-0"
            stageWidth={tile.stageWidth ?? 420}
            maxScale={tile.maxScale ?? 1.15}
            fill={0.82}
            placeholder={
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid size-11 place-items-center rounded-2xl border border-border bg-background/70 text-muted-foreground motion-safe:animate-pulse">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </div>
            }
          >
            <ShowcaseStory component={tile.name} story={tile.story} />
          </LiveStage>

          <span className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/75 px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur-sm">
            <Icon className="size-3 text-primary" aria-hidden="true" />
            {tile.label}
          </span>
          {tile.hint ? (
            <span className="pointer-events-none absolute top-3 right-3 hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-medium text-primary sm:inline-flex">
              <MousePointerClick className="size-3" aria-hidden="true" />
              {tile.hint}
            </span>
          ) : null}
        </div>

        <Link
          href={`/docs/components/${tile.name}`}
          className="flex items-center gap-3 border-t border-border px-4 py-3 transition-colors outline-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{tile.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {tile.description}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-normal)] group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:text-foreground"
          />
        </Link>
      </div>
    </li>
  );
}

/**
 * One endless row of component names.
 *
 * The list is rendered twice so the loop has no seam; the second copy is
 * hidden from assistive technology and the tab order, so each name is read
 * and reached once. Hovering or focusing a name holds the row still.
 */
function MarqueeRow({
  entries,
  reverse = false,
  duration,
}: {
  entries: MarqueeEntry[];
  reverse?: boolean;
  duration: number;
}) {
  return (
    <div className="docs-marquee overflow-hidden py-1">
      <ul
        className="docs-marquee-track"
        style={
          {
            "--marquee-duration": `${String(duration)}s`,
            "--marquee-direction": reverse ? "reverse" : "normal",
          } as CSSProperties
        }
      >
        {[...entries, ...entries].map((entry, index) => {
          const copy = index >= entries.length;
          const Icon = categoryMeta(entry.category).icon;
          return (
            <li
              key={`${entry.name}-${String(index)}`}
              className="pe-3"
              aria-hidden={copy || undefined}
            >
              <Link
                href={`/docs/components/${entry.name}`}
                tabIndex={copy ? -1 : undefined}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground shadow-xs backdrop-blur-sm transition-colors outline-none hover:border-primary/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                <Icon className="size-3.5 text-primary" aria-hidden="true" />
                {entry.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ComponentShowcase({
  tiles,
  marquee,
  total,
}: {
  tiles: ShowcaseTile[];
  marquee: [MarqueeEntry[], MarqueeEntry[]];
  total: number;
}) {
  const grid = useReveal<HTMLUListElement>();

  return (
    // Full-bleed, so the glows are clipped by the edges of the window rather
    // than by a column in the middle of it.
    <section aria-labelledby="showcase" className="relative isolate w-full overflow-x-clip">
      <div aria-hidden="true" className="docs-glow docs-glow-a -z-10 opacity-30" />
      <div aria-hidden="true" className="docs-glow docs-glow-b -z-10 opacity-30" />

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24">
        <header className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-primary opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            Live on this page
          </p>
          <h2
            id="showcase"
            className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Not screenshots. <span className="docs-gradient-text">The real components.</span>
          </h2>
          <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">
            Drag the toggle, sweep across the dock, turn the dial. Each one is the code the CLI
            installs, running the same story its tests run.
          </p>
        </header>

        <ul
          ref={grid}
          className="mt-12 grid grid-flow-dense auto-rows-[15rem] gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {tiles.map((tile, index) => (
            <Tile key={tile.name} tile={tile} index={index} />
          ))}
        </ul>

        <div className="mt-14">
          <p className="text-center text-sm text-muted-foreground">
            …and {total - tiles.length} more, each with its own page.
          </p>
          <div className="mt-5 grid gap-2">
            <MarqueeRow entries={marquee[0]} duration={90} />
            <MarqueeRow entries={marquee[1]} duration={105} reverse />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/docs/components">
              Browse all {total} components
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/playground">Open the playground</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
