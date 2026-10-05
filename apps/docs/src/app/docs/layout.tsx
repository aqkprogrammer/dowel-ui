import type { ReactNode } from "react";

import { SidebarNav } from "~/components/sidebar-nav";
import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { getSidebarTree } from "~/lib/sidebar";

/**
 * Every documentation page: the header, a folding sidebar, and the page.
 *
 * These pages used to open on half a viewport of the WebGL galaxy, which put
 * the first line of every document below the fold and kept a GPU busy behind
 * reading. The galaxy is the home page's now; a documentation page opens on
 * its own heading, under the CSS sky its PageHeader draws.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  const tree = getSidebarTree();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-[88rem] flex-1 gap-10 px-4 sm:px-6">
        {/* Its own scroll container, so the nav does not scroll away with the
            page on a long article. */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 [scrollbar-width:thin] overflow-y-auto overscroll-contain py-8 pe-2 lg:block">
          <SidebarNav tree={tree} />
        </aside>

        <main id="content" className="min-w-0 flex-1 pb-24">
          {children}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
