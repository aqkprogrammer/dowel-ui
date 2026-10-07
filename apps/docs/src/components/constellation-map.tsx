"use client";

import { cn } from "@dowel-ui/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { categoryMeta } from "~/lib/category-meta";

import { LiveStage } from "./live-stage";
import { StoryPreview } from "./story-preview";

/**
 * The component library as a sky.
 *
 * Every component is a star, gathered with its category into a constellation;
 * the lines between stars are the real imports from the registry, and a
 * star's size is how much else is built on it. The blocks sit at the centre
 * as small galaxies, and hovering one draws in every component it is made of.
 * It is the same catalogue as the grid — every star is a link to its page —
 * arranged to show what the grid cannot: how the pieces hold each other up.
 *
 * Layout is deterministic and computed here, from names and counts alone, so
 * the sky is the same on every visit and for every reader.
 */

export interface MapItem {
  name: string;
  title: string;
  description: string;
  category: string;
  uses?: string[];
}

export interface MapGroup {
  category: string;
  label: string;
  items: MapItem[];
}

export interface MapBlock {
  name: string;
  title: string;
  uses: string[];
}

const WIDTH = 1200;
const HEIGHT = 800;
const CENTRE = { x: WIDTH / 2, y: HEIGHT / 2 };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** One colour per constellation, from the cosmic palette outward. */
const CONSTELLATION_COLOURS = [
  "var(--cosmic-blue)",
  "var(--cosmic-orange)",
  "var(--cosmic-cyan)",
  "#c4a7ff",
  "#7ee0a8",
  "#f59ac6",
  "#f5c97a",
  "#5fd4c4",
  "#9fb4ff",
  "#ffb38a",
  "#b8e986",
  "#e0a8ff",
];

interface Star {
  kind: "component";
  name: string;
  title: string;
  description: string;
  category: string;
  label: string;
  colour: string;
  x: number;
  y: number;
  r: number;
  uses: string[];
  usedBy: string[];
  twinkle: number;
}

interface Galaxy {
  kind: "block";
  name: string;
  title: string;
  x: number;
  y: number;
  uses: string[];
  turn: number;
}

interface Constellation {
  category: string;
  label: string;
  colour: string;
  x: number;
  y: number;
  radius: number;
}

function layout(groups: MapGroup[], blocks: MapBlock[]) {
  const usedBy = new Map<string, string[]>();
  const note = (dependency: string, by: string) => {
    usedBy.set(dependency, [...(usedBy.get(dependency) ?? []), by]);
  };
  for (const group of groups) {
    for (const item of group.items)
      for (const dependency of item.uses ?? []) note(dependency, item.name);
  }
  for (const block of blocks) for (const dependency of block.uses) note(dependency, block.name);

  const constellations: Constellation[] = [];
  const stars: Star[] = [];
  groups.forEach((group, index) => {
    // Round the centre on an ellipse, starting at the top.
    const angle = (index / groups.length) * Math.PI * 2 - Math.PI / 2;
    const x = CENTRE.x + Math.cos(angle) * 440;
    const y = CENTRE.y + Math.sin(angle) * 280;
    const radius = 22 + Math.sqrt(group.items.length) * 12;
    const colour =
      CONSTELLATION_COLOURS[index % CONSTELLATION_COLOURS.length] ?? "currentColor";
    constellations.push({ category: group.category, label: group.label, colour, x, y, radius });

    // The most depended-on stars at the heart of the constellation.
    const ordered = [...group.items].sort(
      (a, b) => (usedBy.get(b.name)?.length ?? 0) - (usedBy.get(a.name)?.length ?? 0),
    );
    ordered.forEach((item, position) => {
      const spread = radius * Math.sqrt((position + 0.5) / ordered.length);
      const turn = position * GOLDEN + index;
      const dependents = usedBy.get(item.name) ?? [];
      stars.push({
        kind: "component",
        name: item.name,
        title: item.title,
        description: item.description,
        category: item.category,
        label: group.label,
        colour,
        x: x + Math.cos(turn) * spread,
        y: y + Math.sin(turn) * spread * 0.82,
        r: Math.min(7.5, 2.2 + Math.sqrt(dependents.length) * 1.15),
        uses: item.uses ?? [],
        usedBy: dependents,
        twinkle: (position * 0.37 + index * 0.61) % 4,
      });
    });
  });

  // Blocks at the centre, in a slow spiral of their own.
  const galaxies: Galaxy[] = blocks.map((block, position) => {
    const spread = 150 * Math.sqrt((position + 0.5) / blocks.length);
    const turn = position * GOLDEN;
    return {
      kind: "block",
      name: block.name,
      title: block.title,
      x: CENTRE.x + Math.cos(turn) * spread * 1.35,
      y: CENTRE.y + Math.sin(turn) * spread * 0.9,
      uses: block.uses,
      turn: (position * 47) % 360,
    };
  });

  const byName = new Map(stars.map((star) => [star.name, star]));
  const lines = stars.flatMap((star) =>
    star.uses.flatMap((dependency) => {
      const target = byName.get(dependency);
      return target ? [{ from: star, to: target }] : [];
    }),
  );

  return { stars, galaxies, constellations, lines, byName };
}

/** Every word of the query has to appear somewhere in the item. */
function matches(star: Star, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack = `${star.title} ${star.name} ${star.description} ${star.label}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export function ConstellationMap({
  groups,
  blocks,
  query = "",
  category,
}: {
  groups: MapGroup[];
  blocks: MapBlock[];
  /** Dims stars the search does not match, rather than removing them. */
  query?: string;
  /** Dims every constellation but this one. */
  category?: string;
}) {
  const sky = useMemo(() => layout(groups, blocks), [groups, blocks]);
  const [active, setActive] = useState<{ kind: "component" | "block"; name: string } | null>(
    null,
  );
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  // What lights up with the active body: a star's imports and importers, or
  // everything a galaxy is built from.
  const lit = useMemo(() => {
    if (!active) return null;
    if (active.kind === "block") {
      const block = sky.galaxies.find((galaxy) => galaxy.name === active.name);
      return new Set([active.name, ...(block?.uses ?? [])]);
    }
    const star = sky.byName.get(active.name);
    return new Set([active.name, ...(star?.uses ?? []), ...(star?.usedBy ?? [])]);
  }, [active, sky]);

  const dimmed = (star: Star) =>
    (lit !== null && !lit.has(star.name)) ||
    (lit === null &&
      (!matches(star, words) || (category !== undefined && star.category !== category)));

  const activeStar = active?.kind === "component" ? sky.byName.get(active.name) : undefined;
  const activeGalaxy =
    active?.kind === "block"
      ? sky.galaxies.find((galaxy) => galaxy.name === active.name)
      : undefined;
  const focusBody = activeStar ?? activeGalaxy;

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-pretty text-muted-foreground">
        Each star is a component, sized by how much is built on it; the lines are real imports.
        The galaxies at the centre are blocks — hover one to draw in its parts.
      </p>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--background)_70%,black)]">
        <div className="[scrollbar-width:thin] overflow-x-auto">
          <div
            className="relative mx-auto min-w-[760px]"
            style={{ aspectRatio: `${String(WIDTH)} / ${String(HEIGHT)}` }}
          >
            <svg
              viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
              className="absolute inset-0 size-full"
              role="group"
              aria-label="Component constellations"
              onPointerLeave={() => {
                setActive(null);
              }}
            >
              <defs>
                {/* One halo per constellation: a gradient's currentColor is
                  its own, not the shape's that uses it. */}
                {sky.constellations.map((constellation, index) => (
                  <radialGradient key={constellation.category} id={`map-halo-${String(index)}`}>
                    <stop offset="0%" stopColor={constellation.colour} stopOpacity="0.16" />
                    <stop offset="100%" stopColor={constellation.colour} stopOpacity="0" />
                  </radialGradient>
                ))}
                <radialGradient id="map-core-glow">
                  <stop offset="0%" stopColor="var(--cosmic-navy)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--cosmic-navy)" stopOpacity="0" />
                </radialGradient>
              </defs>

              <ellipse
                cx={CENTRE.x}
                cy={CENTRE.y}
                rx={260}
                ry={190}
                fill="url(#map-core-glow)"
              />

              {sky.constellations.map((constellation, index) => (
                <g key={constellation.category} aria-hidden="true">
                  <circle
                    cx={constellation.x}
                    cy={constellation.y}
                    r={constellation.radius * 1.7}
                    fill={`url(#map-halo-${String(index)})`}
                    className={cn(
                      "transition-opacity duration-500",
                      category !== undefined &&
                        category !== constellation.category &&
                        "opacity-20",
                    )}
                  />
                </g>
              ))}

              {/* The imports, faint until something is lit. */}
              <g aria-hidden="true">
                {sky.lines.map(({ from, to }) => {
                  const on = lit !== null && lit.has(from.name) && lit.has(to.name);
                  return (
                    <line
                      key={`${from.name}-${to.name}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={on ? from.colour : "var(--foreground)"}
                      strokeOpacity={on ? 0.85 : lit === null ? 0.07 : 0.02}
                      strokeWidth={on ? 1.2 : 0.6}
                      className="transition-[stroke-opacity] duration-300"
                    />
                  );
                })}
                {activeStar
                  ? sky.galaxies
                      .filter((galaxy) => activeStar.usedBy.includes(galaxy.name))
                      .map((galaxy) => (
                        <line
                          key={`used-by-${galaxy.name}`}
                          x1={activeStar.x}
                          y1={activeStar.y}
                          x2={galaxy.x}
                          y2={galaxy.y}
                          stroke={activeStar.colour}
                          strokeOpacity={0.7}
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      ))
                  : null}
                {activeGalaxy
                  ? activeGalaxy.uses.map((dependency) => {
                      const target = sky.byName.get(dependency);
                      return target ? (
                        <line
                          key={`block-${dependency}`}
                          x1={activeGalaxy.x}
                          y1={activeGalaxy.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={target.colour}
                          strokeOpacity={0.8}
                          strokeWidth={1.1}
                          strokeDasharray="3 4"
                        />
                      ) : null;
                    })
                  : null}
              </g>

              {sky.galaxies.map((galaxy) => {
                const on =
                  (active?.kind === "block" && active.name === galaxy.name) ||
                  (active?.kind === "component" && lit?.has(galaxy.name) === true);
                return (
                  <Link
                    key={galaxy.name}
                    href={`/docs/blocks/${galaxy.name}`}
                    aria-label={`${galaxy.title} — block`}
                    className="group/galaxy outline-none"
                    onPointerEnter={() => {
                      setActive({ kind: "block", name: galaxy.name });
                    }}
                    onFocus={() => {
                      setActive({ kind: "block", name: galaxy.name });
                    }}
                    onBlur={() => {
                      setActive(null);
                    }}
                  >
                    <g
                      transform={`translate(${String(galaxy.x)} ${String(galaxy.y)}) rotate(${String(galaxy.turn)})`}
                      className={cn(
                        "transition-opacity duration-300",
                        lit !== null && !on ? "opacity-25" : "opacity-90",
                      )}
                    >
                      <circle r={14} fill="transparent" />
                      <ellipse
                        rx={9}
                        ry={3.4}
                        fill="none"
                        stroke="var(--cosmic-star)"
                        strokeOpacity={0.35}
                        strokeWidth={0.8}
                      />
                      <path
                        d="M -7 0 A 7 3 0 0 1 7 0 M 7 0 A 4 1.6 0 0 1 -1 0"
                        fill="none"
                        stroke="var(--cosmic-orange)"
                        strokeWidth={1}
                        strokeLinecap="round"
                        strokeOpacity={on ? 1 : 0.7}
                      />
                      <circle r={on ? 2.6 : 1.8} fill="var(--cosmic-star)" />
                      <circle
                        r={12}
                        fill="none"
                        stroke="var(--cosmic-blue)"
                        strokeWidth={1.2}
                        className="opacity-0 group-focus-visible/galaxy:opacity-100"
                      />
                    </g>
                  </Link>
                );
              })}

              {sky.stars.map((star) => {
                const faded = dimmed(star);
                const on = activeStar?.name === star.name;
                return (
                  <Link
                    key={star.name}
                    href={`/docs/components/${star.name}`}
                    aria-label={`${star.title} — ${star.label}`}
                    className="group/star outline-none"
                    onPointerEnter={() => {
                      setActive({ kind: "component", name: star.name });
                    }}
                    onFocus={() => {
                      setActive({ kind: "component", name: star.name });
                    }}
                    onBlur={() => {
                      setActive(null);
                    }}
                  >
                    <g
                      className={cn(
                        "transition-opacity duration-300",
                        faded ? "opacity-15" : "opacity-100",
                      )}
                    >
                      {/* A generous hit area: the visible star can be a pixel or two. */}
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={Math.max(9, star.r + 5)}
                        fill="transparent"
                      />
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={star.r * 3.2}
                        fill={star.colour}
                        fillOpacity={on ? 0.35 : 0.12}
                        className="cosmic-twinkle"
                        style={{ animationDelay: `-${String(star.twinkle)}s` }}
                      />
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={on ? star.r + 1.5 : star.r}
                        fill="var(--cosmic-star)"
                      />
                      <circle
                        cx={star.x}
                        cy={star.y}
                        r={star.r + 5}
                        fill="none"
                        stroke="var(--cosmic-blue)"
                        strokeWidth={1.2}
                        className="opacity-0 group-focus-visible/star:opacity-100"
                      />
                    </g>
                  </Link>
                );
              })}

              {sky.constellations.map((constellation) => {
                const Icon = categoryMeta(constellation.category).icon;
                const above = constellation.y < CENTRE.y;
                const labelY = above
                  ? constellation.y - constellation.radius - 26
                  : constellation.y + constellation.radius + 30;
                return (
                  <g key={`label-${constellation.category}`} aria-hidden="true">
                    <foreignObject
                      x={constellation.x - 80}
                      y={labelY - 10}
                      width={160}
                      height={20}
                    >
                      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase">
                        <Icon className="size-3" style={{ color: constellation.colour }} />
                        {constellation.label}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>

            {focusBody ? (
              <div
                aria-hidden="true"
                className="glass pointer-events-none absolute z-20 w-64 overflow-hidden rounded-xl border border-[var(--hairline-strong)] shadow-[0_20px_60px_-20px_rgb(0_0_0/0.6)]"
                style={{
                  left: `${String((focusBody.x / WIDTH) * 100)}%`,
                  top: `${String((focusBody.y / HEIGHT) * 100)}%`,
                  transform:
                    focusBody.y > CENTRE.y
                      ? "translate(-50%, calc(-100% - 18px))"
                      : "translate(-50%, 18px)",
                }}
              >
                {activeStar ? (
                  <>
                    <LiveStage
                      className="stage-surface h-28 border-b border-[var(--hairline)]"
                      stageWidth={420}
                      placeholder={<div className="absolute inset-0" />}
                    >
                      <StoryPreview component={activeStar.name} />
                    </LiveStage>
                    <div className="p-3">
                      <p className="text-sm font-medium">{activeStar.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {activeStar.description}
                      </p>
                      <p className="mt-2 font-mono text-[0.625rem] text-muted-foreground">
                        {activeStar.label} · uses {activeStar.uses.length} · used by{" "}
                        {activeStar.usedBy.length}
                      </p>
                    </div>
                  </>
                ) : activeGalaxy ? (
                  <div className="p-3">
                    <p className="font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase">
                      Block
                    </p>
                    <p className="mt-1 text-sm font-medium">{activeGalaxy.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Built from {activeGalaxy.uses.length} components
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
