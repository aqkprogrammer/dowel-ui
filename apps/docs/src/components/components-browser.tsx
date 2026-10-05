"use client";

import { cn } from "@dowel-ui/react";
import { LayoutGrid, Orbit, Search, Star } from "lucide-react";
import dynamic from "next/dynamic";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { categoryMeta } from "~/lib/category-meta";

import type { MapBlock } from "./constellation-map";
import { ComponentCard, type CardItem, type CardSize } from "./site/component-card";
import { CosmicLoader } from "./site/cosmic-loader";
import { FilterChips, type FilterChip } from "./site/filter-chips";
import { SearchInput } from "./site/search-input";

export type BrowserItem = CardItem;

export interface BrowserGroup {
  category: string;
  label: string;
  items: BrowserItem[];
}

/** A featured card's footprint in the bento. */
export type FeatureSize = CardSize;

export interface FeaturedItem {
  name: string;
  size: FeatureSize;
  /** A story other than the first, when another one shows the component off better. */
  story?: string;
}

/** Every word of the query has to appear somewhere in the item. */
function matches(item: BrowserItem, label: string, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack =
    `${item.title} ${item.name} ${item.description} ${label} ${item.category}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** The map is its own chunk, fetched when someone asks for it. */
const ConstellationMap = dynamic(
  () => import("./constellation-map").then((mod) => mod.ConstellationMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-[3/2] place-items-center rounded-2xl border border-[var(--hairline)]">
        <CosmicLoader label="Charting the constellations" />
      </div>
    ),
  },
);

type View = "grid" | "map";

/**
 * The view lives in the URL (`?view=map`), read as an external store: the
 * server and the first render agree on the grid, and the map follows the
 * address — on load, on back and forward, and when the switch rewrites it.
 */
const VIEW_EVENT = "dowel:components-view";

function subscribeView(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener(VIEW_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(VIEW_EVENT, callback);
  };
}

function readView(): View {
  return new URLSearchParams(window.location.search).get("view") === "map" ? "map" : "grid";
}

const ALL = "all";
const FEATURED = "featured";

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="docs-card-in grid place-items-center rounded-2xl border border-dashed border-[var(--hairline-strong)] px-6 py-20 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-[var(--hairline)] bg-[var(--pane)]">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium">Nothing here matches “{query}”.</p>
      <p className="mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
        Try a simpler word — “input”, “chart”, “chat” — or search every category.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-full border border-[var(--hairline-strong)] px-4 py-1.5 text-sm transition-colors outline-none hover:bg-[var(--pane-raised)] focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        Clear search
      </button>
    </div>
  );
}

/**
 * The components gallery: a search field, a row of categories, and live
 * cards.
 *
 * With no filter it shows every category in reading order, each under its own
 * heading, so the server-rendered page carries a link to every component once.
 * A category chip narrows the grid to that category; a search looks across all
 * of them. The chosen category lives in the hash, so `/docs/components#ai` —
 * which the home page links to — opens on it, and a filter can be shared.
 */
export function ComponentsBrowser({
  groups,
  featured,
  blocks,
}: {
  groups: BrowserGroup[];
  featured: FeaturedItem[];
  /** Blocks and what they are built from, for the map. */
  blocks: MapBlock[];
}) {
  const [filter, setFilter] = useState(ALL);
  const view = useSyncExternalStore<View>(subscribeView, readView, () => "grid");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const top = useRef<HTMLDivElement | null>(null);

  const ids = useMemo(
    () => new Set([ALL, FEATURED, ...groups.map((group) => group.category)]),
    [groups],
  );
  const labels = useMemo(
    () => new Map(groups.map((group) => [group.category, group.label])),
    [groups],
  );
  const everything = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const byName = useMemo(
    () => new Map(everything.map((item) => [item.name, item])),
    [everything],
  );

  const words = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;
  const visible = (item: BrowserItem) =>
    matches(item, labels.get(item.category) ?? item.category, words);

  useEffect(() => {
    function fromHash(scroll: boolean) {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!ids.has(hash)) return;
      setFilter(hash);
      if (scroll) top.current?.scrollIntoView({ block: "start" });
    }
    fromHash(true);
    const onHashChange = () => {
      fromHash(true);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [ids]);

  function url(nextView: View, nextFilter: string): string {
    return `${window.location.pathname}${nextView === "map" ? "?view=map" : ""}${nextFilter === ALL ? "" : `#${nextFilter}`}`;
  }

  function choose(value: string) {
    setFilter(value);
    window.history.replaceState(window.history.state, "", url(view, value));
  }

  function chooseView(value: View) {
    window.history.replaceState(window.history.state, "", url(value, filter));
    window.dispatchEvent(new Event(VIEW_EVENT));
  }

  const counts = new Map(
    groups.map((group) => [group.category, group.items.filter(visible).length]),
  );
  const allMatches = everything.filter(visible);

  const chips: FilterChip[] = [
    { id: ALL, label: "All", count: allMatches.length, icon: LayoutGrid },
    { id: FEATURED, label: "Featured", icon: Star },
    ...groups.map((group) => ({
      id: group.category,
      label: group.label,
      count: counts.get(group.category) ?? 0,
      icon: categoryMeta(group.category).icon,
    })),
  ];

  const featuredItems = featured.flatMap((entry) => {
    const item = byName.get(entry.name);
    return item && visible(item) ? [{ ...entry, item }] : [];
  });

  const clear = () => {
    setQuery("");
  };

  const grid = (items: BrowserItem[], showCategory: boolean) => (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <ComponentCard
          key={item.name}
          item={item}
          index={index}
          label={labels.get(item.category) ?? item.category}
          showCategory={showCategory}
        />
      ))}
    </ul>
  );

  // What the grid shows: a search spans everything unless a category is
  // chosen, in which case it searches within it.
  const scope =
    filter === ALL || filter === FEATURED
      ? undefined
      : groups.find((g) => g.category === filter);

  let body;
  if (filter === FEATURED) {
    body =
      featuredItems.length === 0 ? (
        <EmptyState query={deferredQuery} onClear={clear} />
      ) : (
        <ul className="grid grid-flow-dense gap-3 sm:auto-rows-[16rem] sm:grid-cols-2 xl:grid-cols-4">
          {featuredItems.map((entry, index) => (
            <ComponentCard
              key={entry.name}
              item={entry.item}
              index={index}
              size={entry.size}
              story={entry.story}
              label={labels.get(entry.item.category) ?? entry.item.category}
            />
          ))}
        </ul>
      );
  } else if (scope) {
    const items = scope.items.filter(visible);
    const meta = categoryMeta(scope.category);
    body = (
      <section aria-labelledby={`category-${scope.category}`}>
        <CategoryHeading
          id={`category-${scope.category}`}
          label={scope.label}
          count={items.length}
          blurb={meta.blurb}
          icon={meta.icon}
        />
        {items.length === 0 ? (
          <EmptyState query={deferredQuery} onClear={clear} />
        ) : (
          grid(items, false)
        )}
      </section>
    );
  } else if (searching) {
    body =
      allMatches.length === 0 ? (
        <EmptyState query={deferredQuery} onClear={clear} />
      ) : (
        grid(allMatches, true)
      );
  } else {
    body = (
      <div className="grid gap-16">
        {groups.map((group) => {
          const meta = categoryMeta(group.category);
          return (
            <section key={group.category} aria-labelledby={`category-${group.category}`}>
              <CategoryHeading
                id={`category-${group.category}`}
                label={group.label}
                count={group.items.length}
                blurb={meta.blurb}
                icon={meta.icon}
                onShowOnly={() => {
                  choose(group.category);
                  top.current?.scrollIntoView({ block: "start" });
                }}
              />
              {grid(group.items, false)}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={top} className="scroll-mt-14">
      {/* The toolbar sticks under the site header, so search and categories
          are always one move away on a long category. */}
      <div className="glass sticky top-14 z-30 -mx-4 border-b border-[var(--hairline)] px-4 py-3 [--glass:color-mix(in_oklab,var(--background)_84%,transparent)] sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2 xl:order-last">
            <SearchInput
              value={query}
              onChange={setQuery}
              label="Search components"
              placeholder={`Search ${String(everything.length)} components…`}
              shortcut
              className="min-w-0 flex-1 xl:w-72 xl:flex-none"
            />
            <div
              role="group"
              aria-label="View"
              className="flex h-10 shrink-0 items-center gap-0.5 rounded-xl border border-[var(--hairline-strong)] bg-[var(--pane)] p-1"
            >
              {(
                [
                  ["grid", "Grid", LayoutGrid],
                  ["map", "Map", Orbit],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    chooseView(value);
                  }}
                  className={cn(
                    "inline-flex h-full items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                    view === value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <FilterChips
            label="Component categories"
            chips={chips}
            value={filter}
            onChange={choose}
            className="flex-1"
          />
        </div>
      </div>

      {searching ? (
        <p className="mt-6 text-sm text-muted-foreground" role="status">
          {(scope ? (counts.get(scope.category) ?? 0) : allMatches.length) === 1
            ? "1 component matches"
            : `${String(scope ? (counts.get(scope.category) ?? 0) : allMatches.length)} components match`}{" "}
          “{deferredQuery.trim()}”{scope ? ` in ${scope.label}` : ""}.
        </p>
      ) : null}

      <div className="mt-8">
        {view === "map" ? (
          <ConstellationMap
            groups={groups}
            blocks={blocks}
            query={deferredQuery}
            category={scope?.category}
          />
        ) : (
          body
        )}
      </div>
    </div>
  );
}

function CategoryHeading({
  id,
  label,
  count,
  blurb,
  icon: Icon,
  onShowOnly,
}: {
  id: string;
  label: string;
  count: number;
  blurb: string;
  icon: ReturnType<typeof categoryMeta>["icon"];
  onShowOnly?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--hairline)] bg-[var(--pane)]">
          <Icon className="size-4 text-[var(--cosmic-blue)]" aria-hidden="true" />
        </span>
        <div>
          <h2 id={id} className="text-lg font-semibold tracking-tight">
            {label}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
              {count}
            </span>
          </h2>
          {blurb ? <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p> : null}
        </div>
      </div>
      {onShowOnly ? (
        <button
          type="button"
          onClick={onShowOnly}
          className="hidden shrink-0 rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55 sm:block"
        >
          Only {label} →
        </button>
      ) : null}
    </div>
  );
}
