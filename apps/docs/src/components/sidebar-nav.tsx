"use client";

import { cn } from "@dowel-ui/react";
import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useId, useState, type ReactNode } from "react";

import type { NavLink } from "~/lib/navigation";
import type { SidebarSection, SidebarTree } from "~/lib/sidebar";

/**
 * The documentation navigation.
 *
 * Guides and tools are short and always open. Components and blocks are
 * sections that fold: the one holding the current page opens on its own, the
 * rest stay closed until asked, and a filter at the top searches every
 * section at once and opens whichever have matches.
 *
 * A nav landmark of lists; the current page carries `aria-current="page"`,
 * and each fold is a button with `aria-expanded` controlling its list.
 */
export function SidebarNav({
  tree,
  onNavigate,
  className,
}: {
  tree: SidebarTree;
  /** Called after a link is followed — the mobile drawer closes on it. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const words = deferred.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtering = words.length > 0;

  const matches = (link: NavLink) =>
    words.every((word) => `${link.title} ${link.href}`.toLowerCase().includes(word));

  const filterSection = (section: SidebarSection): SidebarSection => ({
    ...section,
    items: filtering ? section.items.filter(matches) : section.items,
  });

  const guides = filtering ? tree.guides.filter(matches) : tree.guides;
  const tools = filtering ? tree.tools.filter(matches) : tree.tools;
  const components = tree.components.map(filterSection).filter((s) => s.items.length > 0);
  const blocks = tree.blocks.map(filterSection).filter((s) => s.items.length > 0);
  const nothing = guides.length + tools.length + components.length + blocks.length === 0;

  return (
    <nav
      aria-label="Documentation"
      className={cn("flex flex-col gap-7 text-[0.8125rem]", className)}
    >
      <label className="relative block">
        <span className="sr-only">Filter the navigation</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder="Filter…"
          className={cn(
            "h-8 w-full rounded-lg border border-[var(--hairline)] bg-[var(--pane)] ps-8 pe-8 text-[0.8125rem]",
            "transition-[border-color,box-shadow] duration-[var(--duration-fast)] outline-none placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear the filter"
            onClick={() => {
              setQuery("");
            }}
            className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        ) : null}
      </label>

      {nothing ? (
        <p className="px-2 text-muted-foreground" role="status">
          Nothing in the navigation matches “{deferred.trim()}”.
        </p>
      ) : null}

      {guides.length > 0 ? (
        <Group label="Get started">
          <Links items={guides} pathname={pathname} onNavigate={onNavigate} />
        </Group>
      ) : null}

      {tools.length > 0 ? (
        <Group label="Tools">
          <Links items={tools} pathname={pathname} onNavigate={onNavigate} />
        </Group>
      ) : null}

      {components.length > 0 ? (
        <Group label="Components" href="/docs/components" onNavigate={onNavigate}>
          {components.map((section) => (
            <Fold
              key={section.id}
              section={section}
              pathname={pathname}
              forceOpen={filtering}
              onNavigate={onNavigate}
            />
          ))}
        </Group>
      ) : null}

      {blocks.length > 0 ? (
        <Group label="Blocks" href="/docs/blocks" onNavigate={onNavigate}>
          {blocks.map((section) => (
            <Fold
              key={section.id}
              section={section}
              pathname={pathname}
              forceOpen={filtering}
              onNavigate={onNavigate}
            />
          ))}
        </Group>
      ) : null}
    </nav>
  );
}

function Group({
  label,
  href,
  onNavigate,
  children,
}: {
  label: string;
  href?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            className="rounded text-[0.6875rem] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            Browse all
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Links({
  items,
  pathname,
  onNavigate,
  nested = false,
}: {
  items: (NavLink & { pro?: boolean })[];
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-px",
        nested && "ms-3.5 border-s border-[var(--hairline)] ps-1.5",
      )}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-[var(--duration-fast)]",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                active
                  ? "bg-[var(--pane-raised)] font-medium text-foreground shadow-[inset_0_0_0_1px_var(--hairline)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -left-px h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--cosmic-blue)] shadow-[0_0_8px_var(--cosmic-blue)]"
                />
              ) : null}
              <span className="truncate">{item.title}</span>
              {item.pro ? (
                <span className="ms-auto rounded border border-[var(--hairline-strong)] px-1 font-mono text-[0.5625rem] tracking-wider text-muted-foreground uppercase">
                  Pro
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Fold({
  section,
  pathname,
  forceOpen,
  onNavigate,
}: {
  section: SidebarSection;
  pathname: string;
  forceOpen: boolean;
  onNavigate?: () => void;
}) {
  const containsCurrent = section.items.some((item) => item.href === pathname);
  // Undefined until toggled, so a navigation into this section opens it
  // without overriding a fold the reader closed on purpose elsewhere.
  const [toggled, setToggled] = useState<boolean | undefined>(undefined);
  const open = forceOpen || (toggled ?? containsCurrent);
  const listId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setToggled(!open);
        }}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/55",
          containsCurrent ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            open && "rotate-90",
          )}
        />
        <span className="flex-1 truncate">{section.label}</span>
        <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">
          {section.items.length}
        </span>
      </button>
      {/* Rows animate from 0fr to 1fr, so the fold opens to its real height
          without measuring it. Closed content is inert, not just clipped. */}
      <div
        id={listId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-0.5 pb-1.5">
            <Links items={section.items} pathname={pathname} onNavigate={onNavigate} nested />
          </div>
        </div>
      </div>
    </div>
  );
}
