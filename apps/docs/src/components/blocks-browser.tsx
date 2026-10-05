"use client";

import { LayoutGrid, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { BlockCard, type BlockCardItem } from "./site/block-card";
import { FilterChips, type FilterChip } from "./site/filter-chips";
import { SearchInput } from "./site/search-input";

export interface BlockBrowserGroup {
  id: string;
  label: string;
  blurb: string;
  blocks: BlockCardItem[];
}

const ALL = "all";

function matches(block: BlockCardItem, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack =
    `${block.title} ${block.name} ${block.description} ${block.groupLabel} ${block.pro ? "pro" : "free"}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * The blocks gallery: whole screens and sections, at a size where they read
 * as screens.
 *
 * Grouped by what they are for rather than by what they are built from; a
 * group chip narrows to one group, a search looks across all of them, and
 * the chosen group lives in the hash so it can be linked to.
 */
export function BlocksBrowser({ groups }: { groups: BlockBrowserGroup[] }) {
  const [filter, setFilter] = useState(ALL);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const top = useRef<HTMLDivElement | null>(null);
  const words = deferred.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = words.length > 0;

  const ids = useMemo(() => new Set([ALL, ...groups.map((group) => group.id)]), [groups]);

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

  function choose(value: string) {
    setFilter(value);
    const url = value === ALL ? window.location.pathname : `#${value}`;
    window.history.replaceState(window.history.state, "", url);
  }

  const shown = groups
    .filter((group) => filter === ALL || group.id === filter)
    .map((group) => ({
      ...group,
      blocks: group.blocks.filter((block) => matches(block, words)),
    }))
    .filter((group) => group.blocks.length > 0);
  const total = shown.reduce((count, group) => count + group.blocks.length, 0);

  const chips: FilterChip[] = [
    {
      id: ALL,
      label: "All",
      icon: LayoutGrid,
      count: groups.reduce(
        (count, group) => count + group.blocks.filter((block) => matches(block, words)).length,
        0,
      ),
    },
    ...groups.map((group) => ({
      id: group.id,
      label: group.label,
      count: group.blocks.filter((block) => matches(block, words)).length,
    })),
  ];

  return (
    <div ref={top} className="scroll-mt-14">
      <div className="glass sticky top-14 z-30 -mx-4 border-b border-[var(--hairline)] px-4 py-3 [--glass:color-mix(in_oklab,var(--background)_84%,transparent)] sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search blocks"
            placeholder="Search blocks…"
            shortcut
            className="xl:order-last xl:w-72 xl:shrink-0"
          />
          <FilterChips
            label="Block groups"
            chips={chips}
            value={filter}
            onChange={choose}
            className="flex-1"
          />
        </div>
      </div>

      {searching ? (
        <p className="mt-6 text-sm text-muted-foreground" role="status">
          {total === 1 ? "1 block matches" : `${String(total)} blocks match`} “{deferred.trim()}
          ”.
        </p>
      ) : null}

      {total === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-[var(--hairline-strong)] px-6 py-20 text-center">
          <span className="grid size-11 place-items-center rounded-xl border border-[var(--hairline)] bg-[var(--pane)]">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-medium">No blocks match “{deferred.trim()}”.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try “dashboard”, “pricing” or “hero” — or look in every group.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              choose(ALL);
            }}
            className="mt-5 rounded-full border border-[var(--hairline-strong)] px-4 py-1.5 text-sm transition-colors outline-none hover:bg-[var(--pane-raised)] focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            Show every block
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-16">
          {shown.map((group) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <div className="mb-5">
                <h2 id={`group-${group.id}`} className="text-lg font-semibold tracking-tight">
                  {group.label}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
                    {group.blocks.length}
                  </span>
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{group.blurb}</p>
              </div>
              <ul className="grid gap-4 lg:grid-cols-2">
                {group.blocks.map((block, index) => (
                  <BlockCard key={block.name} block={block} index={index} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
