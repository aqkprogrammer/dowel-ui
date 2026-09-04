"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface AppNavLink {
  href: string;
  label: string;
}

/**
 * The application's own navigation.
 *
 * `aria-current="page"` rather than only a highlight: which page you are on is
 * information, and a background colour is not a way of conveying it.
 */
export function AppNav({ links }: { links: AppNavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Application" className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
