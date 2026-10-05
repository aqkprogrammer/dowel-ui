"use client";

import { cn } from "@dowel-ui/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@dowel-ui/react/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dowel-ui/react/dialog";
import {
  ArrowRight,
  BookOpen,
  Box,
  LayoutTemplate,
  Moon,
  Palette,
  Search as SearchIcon,
  Sun,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { SearchEntry, SearchKind } from "~/lib/search-index";

import { useTheme } from "./theme-provider";

/**
 * Site search, as a command palette.
 *
 * Built from the library's Command and Dialog rather than its CommandDialog,
 * because this one needs to know what is typed: an empty palette suggests a
 * short list of places to start, and only a query searches all three hundred
 * entries. The keyboard model — arrow keys over options while focus stays in
 * the input, Enter to run — is the library's own.
 *
 * Anything on the page can open it by dispatching `OPEN_SEARCH_EVENT`, so a
 * second search field elsewhere is a button, not a second index.
 */

export const OPEN_SEARCH_EVENT = "dowel:open-search";

export function openSearch(): void {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  Guide: BookOpen,
  Tool: Wrench,
  Component: Box,
  Block: LayoutTemplate,
  Theme: Palette,
};

const GROUP_ORDER = ["Docs", "Tools", "Components", "Blocks", "Themes"];

/** Shown before anything is typed. */
const SUGGESTED = new Set([
  "/docs/installation",
  "/docs/cli",
  "/playground",
  "/docs/components/button",
  "/docs/components/dialog",
  "/docs/components/data-table",
  "/docs/blocks/dashboard",
  "/docs/blocks/ai-chat",
]);

/** Every word has to appear somewhere in the entry. */
function filter(search: string, haystack: string[]): boolean {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack.join(" ").toLowerCase();
  return words.every((word) => text.includes(word));
}

function subscribePlatform(): () => void {
  return () => {};
}

/** ⌘ on Apple platforms, Ctrl elsewhere. Read after hydration only. */
function useModifierLabel(): string {
  return useSyncExternalStore(
    subscribePlatform,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl "),
    () => "⌘",
  );
}

export function CommandMenu({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const modifier = useModifierLabel();
  const { resolvedDark, setMode } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      // "/" opens search too, unless someone is typing somewhere already.
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setOpen(true);
      }
    }
    const onOpen = () => {
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  const searching = search.trim().length > 0;

  const groups = useMemo(() => {
    const visible = searching ? entries : entries.filter((entry) => SUGGESTED.has(entry.href));
    const map = new Map<string, SearchEntry[]>();
    for (const entry of visible) map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    return [...map].sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
  }, [entries, searching]);

  function go(href: string) {
    setOpen(false);
    setSearch("");
    router.push(href);
  }

  return (
    <>
      {/* One palette, two triggers: a field where there is room, an icon
          where there is not. Two palettes would both answer ⌘K. */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className={cn(
          "group hidden h-8 w-52 min-w-0 items-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--pane)] ps-2.5 pe-1.5 text-sm text-muted-foreground sm:flex xl:w-60",
          "transition-[border-color,color,background-color] duration-[var(--duration-fast)] outline-none",
          "hover:border-[var(--hairline-strong)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55",
        )}
      >
        <SearchIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="rounded border border-[var(--hairline)] bg-background/60 px-1.5 font-mono text-[0.625rem] leading-4">
          {modifier}K
        </kbd>
      </button>
      <button
        type="button"
        aria-label="Search"
        onClick={() => {
          setOpen(true);
        }}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55 sm:hidden"
      >
        <SearchIcon aria-hidden="true" className="size-4" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "glass top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden border-[var(--hairline-strong)] p-0",
            "shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6),0_0_0_1px_var(--hairline)]",
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search Dowel</DialogTitle>
            <DialogDescription>
              Find a component, a block, a guide or a theme.
            </DialogDescription>
          </DialogHeader>
          <Command
            value={search}
            onValueChange={setSearch}
            filter={filter}
            className="rounded-none bg-transparent"
          >
            <CommandInput
              placeholder="Search components, blocks, docs and themes…"
              aria-label="Search"
              className="h-13 text-base"
            />
            <CommandList className="max-h-[min(60vh,28rem)] p-2">
              <CommandEmpty>
                <span className="block text-foreground">Nothing matches “{search}”.</span>
                <span className="mt-1 block text-xs">
                  Try a simpler word — “table”, “chat”, “billing”.
                </span>
              </CommandEmpty>

              {groups.map(([group, items]) => (
                <CommandGroup key={group} heading={searching ? group : `Suggested · ${group}`}>
                  {items.map((entry) => {
                    const Icon = KIND_ICON[entry.kind];
                    return (
                      <CommandItem
                        key={entry.href}
                        value={entry.href}
                        keywords={[entry.title, entry.description, ...entry.keywords]}
                        onSelect={() => {
                          go(entry.href);
                        }}
                        className="group/item gap-3 rounded-lg px-2.5 py-2"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--hairline)] bg-[var(--pane)] text-muted-foreground group-data-[active]/item:text-foreground">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{entry.title}</span>
                            {entry.pro ? (
                              <span className="rounded border border-[var(--hairline-strong)] px-1 font-mono text-[0.5625rem] tracking-wider text-muted-foreground uppercase">
                                Pro
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {entry.kind} · {entry.description}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 text-muted-foreground opacity-0 group-data-[active]/item:opacity-100"
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}

              {searching ? null : (
                <CommandGroup heading="Actions">
                  <CommandItem
                    value="action:toggle-mode"
                    keywords={["dark", "light", "mode", "theme"]}
                    onSelect={() => {
                      setMode(resolvedDark ? "light" : "dark");
                      setOpen(false);
                    }}
                    className="gap-3 rounded-lg px-2.5 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--hairline)] bg-[var(--pane)] text-muted-foreground">
                      {resolvedDark ? (
                        <Sun aria-hidden="true" className="size-4" />
                      ) : (
                        <Moon aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="font-medium">
                      Switch to {resolvedDark ? "light" : "dark"} mode
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
            <div className="flex items-center gap-4 border-t border-[var(--hairline)] px-4 py-2.5 text-[0.6875rem] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> to open
              </span>
              <span className="ms-auto flex items-center gap-1.5">
                <Kbd>esc</Kbd> to close
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded border border-[var(--hairline-strong)] bg-[var(--pane)] px-1 font-mono text-[0.625rem] leading-4">
      {children}
    </kbd>
  );
}
