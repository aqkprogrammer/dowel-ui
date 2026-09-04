"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLabel,
} from "@/components/ui/sidebar";

export interface AppNavLink {
  href: string;
  label: string;
}

/**
 * The application's navigation entries.
 *
 * `asChild` so Next's Link does the routing while the sidebar does the styling
 * and the semantics — `aria-current` on the active entry comes from
 * SidebarMenuButton rather than being hand-wired here.
 */
export function AppNav({ links }: { links: AppNavLink[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton asChild isActive={pathname === link.href}>
            <Link href={link.href}>
              <SidebarMenuLabel>{link.label}</SidebarMenuLabel>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
