"use client";

import { cn } from "@dowel-ui/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dowel-ui/react/tabs";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, Star, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import { categoryMeta } from "~/lib/category-meta";

import { LiveStage } from "./live-stage";

/**
 * Every story in the library is one chunk, loaded after the page is
 * interactive. The list itself is server-rendered, so the links and text are
 * there for anyone — and anything — that never runs this.
 */
const StoryPreview = dynamic(() => import("./story-preview").then((mod) => mod.StoryPreview), {
  ssr: false,
});

export interface BrowserItem {
  name: string;
  title: string;
  description: string;
  category: string;
  status: string;
}

export interface BrowserGroup {
  category: string;
  label: string;
  items: BrowserItem[];
}

/** A featured card's footprint in the bento. */
export type FeatureSize = "hero" | "wide" | "tall" | "base";

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

/**
 * A cursor-following wash of the primary colour over the hovered card.
 *
 * Written straight to the element's style: a state update per pointer move
 * would re-render the card, and its live preview with it, sixty times a second.
 */
function trackPointer(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--spot-x", `${String(event.clientX - rect.left)}px`);
  event.currentTarget.style.setProperty("--spot-y", `${String(event.clientY - rect.top)}px`);
}

/**
 * Components whose stories cannot be shrunk into a card.
 *
 * Session Expiry is a modal, and every story of it opens one — over the whole
 * index, not the card. Scroll Reveal Text is padded by a viewport and a half
 * so there is something to scroll through, which scales it to nothing. Both
 * are shown on their own pages, where there is room for what they do.
 */
const NO_THUMBNAIL = new Set(["session-expiry", "scroll-reveal-text"]);

function Placeholder({ category, still = false }: { category: string; still?: boolean }) {
  const Icon = categoryMeta(category).icon;
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl border border-border bg-background/70 text-muted-foreground shadow-xs",
            !still && "motion-safe:animate-pulse",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {still ? (
          <span className="text-[0.6875rem] text-muted-foreground">Open to see it live</span>
        ) : null}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  experimental: "Experimental",
};

function ComponentCard({
  item,
  label,
  index,
  size = "base",
  story,
  showCategory,
}: {
  item: BrowserItem;
  label: string;
  index: number;
  size?: FeatureSize;
  story?: string;
  showCategory: boolean;
}) {
  const status = STATUS_LABEL[item.status];
  const Icon = categoryMeta(item.category).icon;
  const featured = size !== "base" || story !== undefined;

  return (
    <li
      className={cn(
        "docs-card-in min-w-0",
        size === "hero" && "sm:col-span-2 sm:row-span-2",
        size === "wide" && "sm:col-span-2",
        size === "tall" && "sm:row-span-2",
      )}
      // Staggered, but capped: the fortieth card should not wait a second and
      // a half for its turn.
      style={{ "--card-delay": `${String(Math.min(index, 14) * 35)}ms` } as CSSProperties}
    >
      {/* The preview is a sibling of the link, not inside it: stories render
          their own links and buttons, and interactive content inside an <a> is
          invalid HTML however inert it is. The link reaches the whole card
          through its ::after instead. */}
      <div
        onPointerMove={trackPointer}
        className={cn(
          "group/card relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
          "shadow-xs transition-[transform,border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
          "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg",
          "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/55 has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background",
        )}
      >
        <div
          className={cn(
            "docs-stage-backdrop relative border-b border-border",
            // In the bento the row height is fixed and the preview takes what
            // the text leaves; stacked in one column, rows size to content.
            featured ? "h-44 sm:h-auto sm:min-h-0 sm:flex-1" : "h-44",
          )}
        >
          {NO_THUMBNAIL.has(item.name) ? (
            <Placeholder category={item.category} still />
          ) : (
            <LiveStage
              className="absolute inset-0"
              stageWidth={size === "hero" ? 520 : 440}
              maxScale={size === "hero" ? 1.1 : 1}
              placeholder={<Placeholder category={item.category} />}
            >
              <StoryPreview component={item.name} story={story} />
            </LiveStage>
          )}

          {status ? (
            <span className="absolute top-3 right-3 rounded-full border border-border bg-background/80 px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur-sm">
              {status}
            </span>
          ) : null}
        </div>

        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium">
                <Link
                  href={`/docs/components/${item.name}`}
                  className="outline-none after:absolute after:inset-0 after:z-20"
                >
                  {item.title}
                </Link>
              </h3>
              {showCategory ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">
                  <Icon className="size-3" aria-hidden="true" />
                  {label}
                </span>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-1 text-xs text-muted-foreground",
                size === "hero" ? "line-clamp-3 sm:text-sm" : "line-clamp-2",
              )}
            >
              {item.description}
            </p>
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] duration-[var(--duration-normal)] group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-foreground group-hover/card:opacity-100 group-has-[a:focus-visible]/card:opacity-100"
          />
        </div>

        {/* A cursor-following wash of the primary colour. Over everything but
            the link, and too faint to change how the text reads. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-[var(--duration-slow)] group-hover/card:opacity-100"
          style={{
            background:
              "radial-gradient(22rem circle at var(--spot-x, 50%) var(--spot-y, 0%), color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)",
          }}
        />
      </div>
    </li>
  );
}

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="docs-card-in grid place-items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <Search className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">Nothing here matches “{query}”.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try another word, or look across every category.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/55"
      >
        Clear search
      </button>
    </div>
  );
}

const FEATURED = "featured";
const ALL = "all";

export function ComponentsBrowser({
  groups,
  featured,
}: {
  groups: BrowserGroup[];
  featured: FeaturedItem[];
}) {
  const [tab, setTab] = useState(FEATURED);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const top = useRef<HTMLDivElement | null>(null);

  const tabIds = useMemo(
    () => new Set([FEATURED, ALL, ...groups.map((group) => group.category)]),
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
  const visible = (item: BrowserItem) =>
    matches(item, labels.get(item.category) ?? item.category, words);

  // The tab lives in the hash, so `/docs/components#ai` — which the home page
  // links to — opens on the AI tab, and a tab can be shared.
  useEffect(() => {
    function fromHash(scroll: boolean) {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!tabIds.has(hash)) return;
      setTab(hash);
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
  }, [tabIds]);

  function selectTab(value: string) {
    setTab(value);
    const url = value === FEATURED ? window.location.pathname : `#${value}`;
    window.history.replaceState(window.history.state, "", url);
  }

  function search(value: string) {
    // Searching from a narrow tab would hide most of the answers; the first
    // keystroke widens to everything, and a category can still be picked after.
    if (query.trim() === "" && value.trim() !== "" && tab === FEATURED) selectTab(ALL);
    setQuery(value);
  }

  const featuredItems = featured.flatMap((entry) => {
    const item = byName.get(entry.name);
    return item && visible(item) ? [{ ...entry, item }] : [];
  });

  const allMatches = everything.filter(visible);

  const counts = new Map(
    groups.map((group) => [group.category, group.items.filter(visible).length]),
  );

  const renderGrid = (items: BrowserItem[], showCategory: boolean) =>
    items.length === 0 ? (
      <EmptyState
        query={deferredQuery}
        onClear={() => {
          setQuery("");
        }}
      />
    ) : (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

  return (
    <div ref={top} className="mt-10">
      <Tabs value={tab} onValueChange={selectTab} activationMode="manual">
        {/* The toolbar sticks under the site header, so the tabs are always one
            click away on a long category. */}
        <div className="sticky top-14 z-30 -mx-4 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block lg:order-last lg:w-56 lg:shrink-0">
              <span className="sr-only">Search components</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  search(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                placeholder={`Search ${String(everything.length)} components…`}
                className={cn(
                  "h-9 w-full rounded-lg border border-input bg-background ps-9 pe-9 text-sm shadow-xs",
                  "transition-[border-color,box-shadow] duration-[var(--duration-fast)] outline-none",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                  "[&::-webkit-search-cancel-button]:appearance-none",
                )}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                  }}
                  className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Clear search</span>
                </button>
              ) : null}
            </label>

            <ScrollRow activeKey={tab}>
              <TabsList indicator="slide" aria-label="Component categories">
                <TabsTrigger value={FEATURED} className="group gap-1.5">
                  <Star className="size-3.5" aria-hidden="true" />
                  Featured
                </TabsTrigger>
                <TabsTrigger value={ALL} className="group gap-1.5">
                  All
                  <Count value={allMatches.length} />
                </TabsTrigger>
                {groups.map((group) => (
                  <TabsTrigger
                    key={group.category}
                    value={group.category}
                    className="group gap-1.5"
                  >
                    {group.label}
                    <Count value={counts.get(group.category) ?? 0} />
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollRow>
          </div>
        </div>

        {words.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {allMatches.length === 1
              ? "1 component matches"
              : `${String(allMatches.length)} components match`}{" "}
            “{deferredQuery.trim()}”.
          </p>
        ) : null}

        <TabsContent value={FEATURED} forceMount className="mt-6 data-[state=inactive]:hidden">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Worth a closer look</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The ones people ask about. Every preview is the live component, not a recording.
              </p>
            </div>
          </div>
          {featuredItems.length === 0 ? (
            <EmptyState
              query={deferredQuery}
              onClear={() => {
                setQuery("");
              }}
            />
          ) : (
            <ul className="grid grid-flow-dense gap-4 sm:auto-rows-[15.5rem] sm:grid-cols-2 xl:grid-cols-4">
              {featuredItems.map((entry, index) => (
                <ComponentCard
                  key={entry.name}
                  item={entry.item}
                  index={index}
                  size={entry.size}
                  story={entry.story}
                  label={labels.get(entry.item.category) ?? entry.item.category}
                  showCategory
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Every card in "All" is also in a category below, so it is rendered
            only when chosen: the server-rendered page lists each link once. */}
        <TabsContent value={ALL} className="mt-6">
          {renderGrid(allMatches, true)}
        </TabsContent>

        {groups.map((group) => {
          const meta = categoryMeta(group.category);
          const Icon = meta.icon;
          return (
            <TabsContent
              key={group.category}
              value={group.category}
              forceMount
              className="mt-6 data-[state=inactive]:hidden"
            >
              <div className="mb-5 flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-primary shadow-xs">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    {group.label}{" "}
                    <span className="font-normal text-muted-foreground tabular-nums">
                      · {group.items.length}
                    </span>
                  </h2>
                  {meta.blurb ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{meta.blurb}</p>
                  ) : null}
                </div>
              </div>
              {renderGrid(group.items.filter(visible), false)}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-foreground/[0.06] px-1.5 text-[0.6875rem] leading-4 text-muted-foreground tabular-nums transition-colors group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary">
      {value}
    </span>
  );
}

/**
 * A row that scrolls sideways when it has to, and says so.
 *
 * Eleven categories do not fit beside a search field on most screens. The
 * edges fade where there is more, a chevron pages the row along, and the
 * chosen tab is always brought into view — keyboard focus already does that
 * on its own, so the chevrons are a pointer convenience and hidden from
 * assistive technology rather than being a second way to do the same thing.
 */
function ScrollRow({ children, activeKey }: { children: ReactNode; activeKey: string }) {
  const row = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const node = row.current;
    if (!node) return;
    const start = node.scrollLeft > 2;
    const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 2;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);

  useEffect(() => {
    const node = row.current;
    if (!node) return;
    update();
    const resizes = new ResizeObserver(update);
    resizes.observe(node);
    if (node.firstElementChild) resizes.observe(node.firstElementChild);
    return () => {
      resizes.disconnect();
    };
  }, [update]);

  const behavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  useEffect(() => {
    const node = row.current;
    const active = node?.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!node || !active) return;
    const from = node.getBoundingClientRect();
    const to = active.getBoundingClientRect();
    const margin = 40;
    if (to.left < from.left + margin) {
      node.scrollBy({ left: to.left - from.left - margin, behavior: behavior() });
    } else if (to.right > from.right - margin) {
      node.scrollBy({ left: to.right - from.right + margin, behavior: behavior() });
    }
  }, [activeKey]);

  const page = (direction: 1 | -1) => {
    const node = row.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.7, behavior: behavior() });
  };

  const fade = "2.5rem";
  const mask = `linear-gradient(to right, ${edges.start ? "transparent" : "black"}, black ${fade}, black calc(100% - ${fade}), ${edges.end ? "transparent" : "black"})`;

  return (
    <div className="relative -mx-4 min-w-0 flex-1 lg:mx-0">
      <div
        ref={row}
        onScroll={update}
        className="[scrollbar-width:none] overflow-x-auto px-4 lg:px-0 [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children}
      </div>
      {edges.start ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            page(-1);
          }}
          className="absolute top-1/2 left-0 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:grid"
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      {edges.end ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            page(1);
          }}
          className="absolute top-1/2 right-0 hidden size-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:grid"
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
