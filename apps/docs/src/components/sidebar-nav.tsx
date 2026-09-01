"use client";

import { cn } from "@dowel-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  title: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The documentation navigation.
 *
 * A nav landmark containing lists, and the current page carries
 * `aria-current="page"` — highlighting it visually tells a screen reader user
 * nothing about where they are.
 */
export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6 text-sm">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-2 text-xs font-medium text-foreground">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 transition-colors",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
