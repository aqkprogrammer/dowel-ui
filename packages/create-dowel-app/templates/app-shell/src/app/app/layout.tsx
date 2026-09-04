import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { AppNav, type AppNavLink } from "@/components/app-nav";

const LINKS: AppNavLink[] = __APP_LINKS__;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh">
        <Sidebar label="Application">
          <SidebarHeader>
            <SidebarTrigger />
            <span className="truncate font-semibold tracking-tight">__PROJECT_NAME__</span>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <AppNav links={LINKS} />
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="px-6 py-8">
          {/* Skip link first in the tab order, so a keyboard user is not made
              to walk the navigation on every page. */}
          <a
            href="#content"
            className="sr-only rounded-md px-2 py-1 text-sm underline-offset-4 focus-visible:not-sr-only focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            Skip to content
          </a>
          <div id="content">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
