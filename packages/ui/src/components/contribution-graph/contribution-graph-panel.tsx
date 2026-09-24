"use client";

// Original design (pattern inspired by Rare UI GitHub activity; no code referenced).
import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import { ContributionGraphContext } from "./contribution-graph";

/*
 * A footer for ContributionGraph that ranks where the activity went. Collapsed
 * it is one line — a small stack of avatars, a label and a chevron. Opened, a
 * sheet rises out of the footer over the grid and the ranked rows follow it in,
 * one after another, each with a bar behind it as long as its share of the
 * busiest row.
 *
 * Everything moves with transform and opacity. The sheet is clipped at the
 * footer's top edge and slides up from below it, on an overshooting ease; it is
 * a little taller than the clip, so the overshoot never opens a gap above the
 * footer. The clip is absolutely positioned over the graph, so the only
 * measurement is where the footer starts — kept current with a ResizeObserver.
 * Closing is shorter and has no stagger: the reader is already moving on.
 *
 * The chevron is a disclosure button (aria-expanded, aria-controls) named by
 * the footer label, and the list is named by it too. While the sheet is open
 * the grid and legend under it are inert, so focus can never land on a day
 * hidden under the sheet; while it is closed, the sheet is inert and invisible.
 * Escape on the chevron or a row's link closes it and returns focus to the
 * chevron.
 */

export interface ContributionGraphPanelItem {
  /** The row's text, and the source of its fallback initial. */
  name: string;
  count: number;
  /** Makes the name a link. */
  href?: string;
  /** Image URL for the row's avatar and the footer stack. */
  avatar?: string;
}

export interface ContributionGraphPanelProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children"
> {
  /** The rows. Ranked by count, busiest first; ties keep their order. */
  items: ContributionGraphPanelItem[];
  /** Footer text beside the avatars. Also names the toggle and the list. */
  label?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Each row's count as text for screen readers. Defaults to the graph's `formatCount`. */
  formatCount?: (count: number) => string;
  /** How many avatars the footer stacks. */
  stack?: number;
}

/*
 * Open-state styles hang off the panel's `data-state` through a named group, so
 * a consumer's own `group/panel` cannot collide. Written out in full: Tailwind
 * only generates classes it can read literally in the source.
 */
const sheetClass = cn(
  "pointer-events-auto absolute inset-x-0 top-0 -bottom-6 flex flex-col bg-card pb-6 text-card-foreground",
  "shadow-[0_-1px_0_var(--color-border)]",
  "invisible translate-y-full",
  "transition-[translate,visibility] duration-[var(--duration-normal)] ease-[var(--ease-in-out-quint)]",
  "group-data-[state=open]/contribution-graph-panel:visible group-data-[state=open]/contribution-graph-panel:translate-y-0",
  "group-data-[state=open]/contribution-graph-panel:duration-[var(--duration-slow)] group-data-[state=open]/contribution-graph-panel:ease-[var(--ease-overshoot)]",
  // Visibility only waits on the way out; opening, the rows are reachable at once.
  "group-data-[state=open]/contribution-graph-panel:transition-[translate]",
);

const rowClass = cn(
  "relative isolate flex h-8 shrink-0 items-center gap-2 rounded-md px-2",
  "translate-y-1.5 opacity-0",
  "transition-[opacity,translate] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "group-data-[state=open]/contribution-graph-panel:translate-y-0 group-data-[state=open]/contribution-graph-panel:opacity-100 group-data-[state=open]/contribution-graph-panel:duration-[var(--duration-slow)]",
  "group-data-[state=open]/contribution-graph-panel:delay-[calc((60ms_+_var(--contribution-graph-row)_*_45ms)_*_var(--motion-scale,1))]",
);

const barClass = cn(
  "absolute inset-0 -z-10 origin-left rounded-[inherit] rtl:origin-right",
  "bg-[color-mix(in_oklab,var(--contribution-graph-accent,var(--color-primary))_16%,transparent)]",
  "scale-x-0 transition-[scale] duration-[var(--duration-fast)] ease-[var(--ease-out-quint)]",
  "group-data-[state=open]/contribution-graph-panel:scale-x-[var(--contribution-graph-ratio)] group-data-[state=open]/contribution-graph-panel:duration-[var(--duration-slower)]",
  "group-data-[state=open]/contribution-graph-panel:delay-[calc((120ms_+_var(--contribution-graph-row)_*_45ms)_*_var(--motion-scale,1))]",
);

function Mark({
  item,
  className,
  style,
}: {
  item: ContributionGraphPanelItem;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Avatar
      aria-hidden="true"
      className={cn("size-5 text-[0.625rem]", className)}
      style={style}
    >
      {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
      <AvatarFallback>{item.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/** A footer for ContributionGraph whose sheet rises over the grid to rank the busiest projects. */
export function ContributionGraphPanel({
  className,
  items,
  label = "Top projects",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  formatCount,
  stack = 3,
  ...props
}: ContributionGraphPanelProps) {
  const graph = useContext(ContributionGraphContext);
  const format = formatCount ?? graph.formatCount;
  const labelId = useId();
  const sheetId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isOpen = openProp ?? uncontrolled;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const ranked = useMemo(() => [...items].sort((a, b) => b.count - a.count), [items]);
  const busiest = Math.max(0, ranked[0]?.count ?? 0);
  const number = useMemo(() => new Intl.NumberFormat(graph.locales), [graph.locales]);

  const { setCovered } = graph;
  useEffect(() => {
    setCovered(isOpen);
    return () => {
      setCovered(false);
    };
  }, [isOpen, setCovered]);

  // The sheet covers the graph from its top edge down to the footer. Only the
  // footer's position is measured; the sheet's own size is left to CSS.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const footer = footerRef.current;
    const root = footer?.closest<HTMLElement>('[data-slot="contribution-graph"]');
    if (!sheet || !footer || !root) return;
    const place = () => {
      const box = root.getBoundingClientRect();
      const inset =
        box.top + root.clientTop + root.clientHeight - footer.getBoundingClientRect().top;
      sheet.style.bottom = `${String(Math.max(0, inset))}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    observer.observe(footer);
    return () => {
      observer.disconnect();
    };
  }, []);

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  }

  // On each control rather than the panel: the panel itself is not interactive.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.key !== "Escape" || !isOpen) return;
    event.preventDefault();
    setOpen(false);
    toggleRef.current?.focus();
  }

  return (
    <div
      data-slot="contribution-graph-panel"
      data-state={isOpen ? "open" : "closed"}
      className={cn("group/contribution-graph-panel rounded-[inherit]", className)}
      {...props}
    >
      <div
        ref={sheetRef}
        id={sheetId}
        data-slot="contribution-graph-panel-sheet"
        inert={!isOpen}
        className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-10 overflow-hidden rounded-t-[inherit]"
      >
        <div className={sheetClass}>
          <ol
            aria-labelledby={labelId}
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5"
          >
            {ranked.map((item, index) => (
              <li
                key={`${item.name}-${String(index)}`}
                data-slot="contribution-graph-panel-row"
                className={rowClass}
                style={
                  {
                    "--contribution-graph-row": index,
                    "--contribution-graph-ratio":
                      busiest > 0 ? Math.max(0, item.count) / busiest : 0,
                  } as CSSProperties
                }
              >
                <span
                  aria-hidden="true"
                  data-slot="contribution-graph-panel-bar"
                  className={barClass}
                />
                <Mark item={item} />
                {item.href ? (
                  <a
                    href={item.href}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-sm hover:underline",
                      focusRing,
                    )}
                    onKeyDown={handleKeyDown}
                  >
                    {item.name}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                )}
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  <span aria-hidden="true">{number.format(item.count)}</span>
                  <span className="sr-only">{format(item.count)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div
        ref={footerRef}
        data-slot="contribution-graph-panel-footer"
        className="flex items-center gap-2 border-t border-border pt-2"
      >
        {ranked.length > 0 && stack > 0 ? (
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {ranked.slice(0, stack).map((item, index) => (
              <Mark
                key={`${item.name}-${String(index)}`}
                item={item}
                className={cn("ring-2 ring-background", index > 0 && "-ms-1.5")}
                style={{ zIndex: stack - index }}
              />
            ))}
          </span>
        ) : null}
        <span id={labelId} className="min-w-0 flex-1 truncate text-muted-foreground">
          {label}
        </span>
        <Button
          ref={toggleRef}
          variant="ghost"
          size="icon-sm"
          aria-expanded={isOpen}
          aria-controls={sheetId}
          aria-labelledby={labelId}
          data-slot="contribution-graph-panel-toggle"
          className="size-7 text-muted-foreground"
          onKeyDown={handleKeyDown}
          onClick={() => {
            setOpen(!isOpen);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "transition-[rotate] duration-[var(--duration-normal)] ease-[var(--ease-overshoot)]",
              "group-data-[state=open]/contribution-graph-panel:rotate-180",
            )}
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
