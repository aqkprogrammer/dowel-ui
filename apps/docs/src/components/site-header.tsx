import { Badge } from "@dowel/ui/badge";
import { Button } from "@dowel/ui/button";
import Link from "next/link";

import { branding } from "~/lib/branding";

import { Search, type SearchEntry } from "./search";
import { ThemeControls } from "./theme-controls";

export function SiteHeader({ searchEntries }: { searchEntries: SearchEntry[] }) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
        >
          {branding.libraryName}
          <Badge size="sm" variant="secondary">
            0.1.0
          </Badge>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {[
            { href: "/docs", label: "Docs" },
            { href: "/docs/components", label: "Components" },
            { href: "/docs/cli", label: "CLI" },
            { href: "/docs/themes", label: "Themes" },
          ].map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Search entries={searchEntries} />
          <ThemeControls />
        </div>
      </div>
    </header>
  );
}
