import type { ReactNode } from "react";

import { AppNav, type AppNavLink } from "@/components/app-nav";

const LINKS: AppNavLink[] = __APP_LINKS__;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <span className="font-semibold tracking-tight">__PROJECT_NAME__</span>
          {/* Skip link first in the tab order, so a keyboard user is not made
              to walk the navigation on every page. */}
          <a
            href="#content"
            className="ml-auto rounded-md px-2 py-1 text-sm underline-offset-4 opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            Skip to content
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-48 shrink-0 lg:block">
          <AppNav links={LINKS} />
        </aside>
        <main id="content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
