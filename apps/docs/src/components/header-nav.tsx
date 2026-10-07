"use client";

import { cn } from "@dowel-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV, primaryFor } from "~/lib/navigation";

/**
 * The primary navigation. Client-side only for the active state: the section
 * you are in is lit, and named as the current page's section for assistive
 * technology too.
 */
export function HeaderNav() {
  const pathname = usePathname();
  const current = primaryFor(pathname);

  return (
    <nav aria-label="Main" className="ms-3 hidden lg:block">
      <ul className="flex items-center gap-0.5">
        {PRIMARY_NAV.map((link) => {
          const active = current === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? (pathname === link.href ? "page" : "true") : undefined}
                className={cn(
                  "relative block rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-[var(--duration-fast)] outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/55",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.title}
                {/* A lit point under the current section — the field's light,
                    at the size of a full stop. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -bottom-[0.6875rem] left-1/2 h-px w-6 -translate-x-1/2 rounded-full bg-[var(--cosmic-blue)] shadow-[0_0_10px_1px_var(--cosmic-blue)] transition-opacity duration-[var(--duration-normal)]",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
