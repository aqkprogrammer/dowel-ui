"use client";

import { cn } from "@dowel-ui/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@dowel-ui/react/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { branding } from "~/lib/branding";
import { PRIMARY_NAV, primaryFor } from "~/lib/navigation";
import type { SidebarTree } from "~/lib/sidebar";

import { BrandMark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";

/**
 * Navigation below the desktop breakpoint.
 *
 * Before this there was none: the header's links and the sidebar both hid
 * under `lg`, and a phone reader could reach a page only through search. The
 * drawer holds the primary sections as large targets, then the same sidebar
 * the docs use — folds, filter and all — and closes itself on any navigation.
 */
export function MobileNav({ tree }: { tree: SidebarTree }) {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();
  const current = primaryFor(pathname);
  const close = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="-ms-1.5 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55 lg:hidden"
        >
          <Menu aria-hidden="true" className="size-[1.125rem]" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(22rem,88vw)] max-w-none gap-0 overflow-y-auto border-[var(--hairline)] p-0 *:shrink-0 [&_[data-slot=sheet-close]]:top-3.5 [&_[data-slot=sheet-close]]:z-20"
        // Focus the first section rather than the filter field: on a phone,
        // focusing a text field on open throws up the keyboard over the menu.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          first.current?.focus();
        }}
      >
        <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-[var(--hairline)] bg-[var(--glass)] px-4 backdrop-blur-xl">
          <BrandMark size={20} />
          <SheetTitle className="text-[0.9375rem]">{branding.libraryName}</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </div>

        <ul className="grid grid-cols-2 gap-1.5 p-4">
          {PRIMARY_NAV.map((link, index) => (
            <li key={link.href}>
              <Link
                ref={index === 0 ? first : undefined}
                href={link.href}
                onClick={close}
                aria-current={current === link.href ? "true" : undefined}
                className={cn(
                  "block rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                  current === link.href
                    ? "border-[var(--hairline-strong)] bg-[var(--pane-raised)] text-foreground"
                    : "border-[var(--hairline)] text-muted-foreground hover:text-foreground",
                )}
              >
                {link.title}
              </Link>
            </li>
          ))}
        </ul>

        <div className="rule-fade mx-4" />

        <SidebarNav tree={tree} onNavigate={close} className="p-4 pb-10" />
      </SheetContent>
    </Sheet>
  );
}
