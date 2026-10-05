import Link from "next/link";

import { branding } from "~/lib/branding";
import { getSearchIndex } from "~/lib/search-index";
import { getSidebarTree } from "~/lib/sidebar";
import { version } from "~/lib/version.generated";

import { BrandMark } from "./brand-mark";
import { CommandMenu } from "./command-menu";
import { MobileNav } from "./mobile-nav";
import { HeaderNav } from "./header-nav";
import { ThemeControls } from "./theme-controls";

function GitHubGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/**
 * The bar across the top of every page.
 *
 * Sticky and glass, because it is the one thing that floats over everything
 * else — the star field on the home page, a gallery further down. It builds
 * the search index itself, so no page can forget to pass one.
 */
export function SiteHeader() {
  const entries = getSearchIndex();
  const tree = getSidebarTree();

  return (
    <header className="glass sticky top-0 z-[var(--z-sticky)] border-b border-[var(--hairline)] [--glass:color-mix(in_oklab,var(--background)_80%,transparent)]">
      <a
        href="#content"
        className="sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:ring-2 focus:ring-ring/55"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-3 px-4 sm:px-6">
        <MobileNav tree={tree} />

        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-md text-[0.9375rem] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
        >
          <BrandMark size={22} />
          {branding.libraryName}
          {/* The version is the first thing to go when the bar is tight: the
              navigation and the search are what people came for. */}
          <span className="hidden rounded-full border border-[var(--hairline)] px-1.5 py-px font-mono text-[0.625rem] font-normal text-muted-foreground xl:inline">
            v{version}
          </span>
        </Link>

        <HeaderNav />

        <div className="ms-auto flex min-w-0 items-center justify-end gap-1.5">
          <CommandMenu entries={entries} />
          <ThemeControls />
          <a
            href={`https://github.com/${branding.repository}`}
            aria-label="Dowel on GitHub"
            className="hidden size-8 place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55 sm:grid"
          >
            <GitHubGlyph />
          </a>
        </div>
      </div>
    </header>
  );
}
