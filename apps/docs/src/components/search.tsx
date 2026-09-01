"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@dowel-ui/react/command";
import { Button } from "@dowel-ui/react/button";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface SearchEntry {
  name: string;
  title: string;
  description: string;
  category: string;
  href: string;
}

/**
 * Site search, built on the library's own Command palette.
 *
 * The docs are the first consumer of every component here — if the palette is
 * not good enough to search this site, it is not good enough to ship.
 */
export function Search({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const groups = new Map<string, SearchEntry[]>();
  for (const entry of entries) {
    groups.set(entry.category, [...(groups.get(entry.category) ?? []), entry]);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground sm:w-56"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SearchIcon />
        <span className="flex-1 text-left">Search…</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search the documentation"
        description="Find a component or a guide."
      >
        <CommandInput placeholder="Search components and guides…" aria-label="Search" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          {[...groups].map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((entry) => (
                <CommandItem
                  key={entry.href}
                  value={entry.title}
                  keywords={[entry.name, entry.description]}
                  onSelect={() => {
                    setOpen(false);
                    router.push(entry.href);
                  }}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{entry.title}</span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
