import { Badge } from "@dowel-ui/react/badge";
import { Button } from "@dowel-ui/react/button";
import Link from "next/link";

import { branding } from "~/lib/branding";

import { BrandMark } from "./brand-mark";
import { version } from "~/lib/version.generated";

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
          <BrandMark />
          {branding.libraryName}
          {/* The version is the first thing to go when the bar is tight: the
              navigation and the search are what people came for. */}
          <Badge size="sm" variant="secondary" className="hidden xl:inline-flex">
            {version}
          </Badge>
        </Link>

        <nav
          aria-label="Main"
          className="hidden shrink-0 items-center gap-0.5 text-sm lg:flex xl:gap-1"
        >
          {[
            { href: "/docs", label: "Docs" },
            { href: "/docs/components", label: "Components" },
            { href: "/docs/blocks", label: "Blocks" },
            { href: "/playground", label: "Playground" },
            { href: "/generate", label: "Generate" },
            { href: "/docs/themes", label: "Themes" },
            { href: "/pricing", label: "Pricing" },
          ].map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          <Search entries={searchEntries} />
          <ThemeControls />
        </div>
      </div>
    </header>
  );
}
