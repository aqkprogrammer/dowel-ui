"use client";

import { cn } from "@dowel-ui/react";
import { CopyButton } from "@dowel-ui/react/copy-button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ViewTransition, type CSSProperties, type PointerEvent } from "react";

import { categoryMeta } from "~/lib/category-meta";
import { branding } from "~/lib/branding";

import { usePackageRunner } from "../install-command";
import { LiveStage } from "../live-stage";
import { StoryPreview } from "../story-preview";

export interface CardItem {
  name: string;
  title: string;
  description: string;
  category: string;
  status: string;
  /** Components this one imports, for the map's lines. */
  uses?: string[];
}

export type CardSize = "hero" | "wide" | "tall" | "base";

/**
 * Components whose stories cannot be shrunk into a card.
 *
 * Session Expiry is a modal, and every story of it opens one — over the whole
 * index, not the card. Scroll Reveal Text is padded by a viewport and a half
 * so there is something to scroll through, which scales it to nothing. Both
 * are shown on their own pages, where there is room for what they do.
 */
const NO_THUMBNAIL = new Set(["session-expiry", "scroll-reveal-text"]);

const STATUS_LABEL: Record<string, string> = {
  experimental: "Experimental",
  beta: "Beta",
  deprecated: "Deprecated",
};

/**
 * A cursor-following wash of light over the hovered card. Written straight to
 * the element's style: a state update per pointer move would re-render the
 * card, and its live preview with it, sixty times a second.
 */
function trackPointer(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--spot-x", `${String(event.clientX - rect.left)}px`);
  event.currentTarget.style.setProperty("--spot-y", `${String(event.clientY - rect.top)}px`);
}

function Placeholder({ category, still = false }: { category: string; still?: boolean }) {
  const Icon = categoryMeta(category).icon;
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl border border-[var(--hairline)] bg-background/70 text-muted-foreground",
            !still && "motion-safe:animate-pulse",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {still ? (
          <span className="text-[0.6875rem] text-muted-foreground">Open to see it live</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One component in a gallery: what it looks like, live, then its name and
 * what it is for, with a way to open it and a way to install it.
 *
 * The preview is a sibling of the link, not inside it: stories render their
 * own links and buttons, and interactive content inside an <a> is invalid
 * HTML however inert it is. The link reaches the whole card through its
 * ::after; the copy button sits above that layer so it stays its own target.
 */
export function ComponentCard({
  item,
  label,
  index = 0,
  size = "base",
  story,
  showCategory = true,
}: {
  item: CardItem;
  label: string;
  index?: number;
  size?: CardSize;
  story?: string;
  showCategory?: boolean;
}) {
  const { prefix } = usePackageRunner();
  const status = STATUS_LABEL[item.status];
  const Icon = categoryMeta(item.category).icon;
  const featured = size !== "base";
  const command = `${prefix} ${branding.cliPackage} add ${item.name}`;

  return (
    <li
      className={cn(
        "docs-card-in min-w-0",
        size === "hero" && "sm:col-span-2 sm:row-span-2",
        size === "wide" && "sm:col-span-2",
        size === "tall" && "sm:row-span-2",
      )}
      // Staggered, but capped: the fortieth card should not wait a second and
      // a half for its turn.
      style={{ "--card-delay": `${String(Math.min(index, 12) * 30)}ms` } as CSSProperties}
    >
      <div
        onPointerMove={trackPointer}
        className={cn(
          "group/card lift relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]",
          "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/55 has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background",
        )}
      >
        {/* Named for the morph: opening the component carries this preview
            into the page's own, and the title into its heading. */}
        <ViewTransition name={`preview-${item.name}`} share="morph" default="none">
          <div
            className={cn(
              "stage-surface relative border-b border-[var(--hairline)]",
              // In the bento the row height is fixed and the preview takes what
              // the text leaves; stacked in one column, rows size to content.
              featured ? "h-48 sm:h-auto sm:min-h-0 sm:flex-1" : "h-48",
            )}
          >
            {NO_THUMBNAIL.has(item.name) ? (
              <Placeholder category={item.category} still />
            ) : (
              <LiveStage
                className="absolute inset-0"
                stageWidth={size === "hero" ? 520 : 440}
                maxScale={size === "hero" ? 1.1 : 1}
                placeholder={<Placeholder category={item.category} />}
              >
                <StoryPreview component={item.name} story={story} />
              </LiveStage>
            )}

            {status ? (
              <span className="absolute top-3 right-3 rounded-full border border-[var(--hairline-strong)] bg-background/80 px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-[var(--cosmic-orange)] uppercase backdrop-blur-sm">
                {status}
              </span>
            ) : null}
          </div>
        </ViewTransition>

        <div className="flex flex-1 flex-col gap-1 p-4 pb-3">
          <div className="flex items-center gap-2">
            <ViewTransition name={`title-${item.name}`} share="morph-text" default="none">
              <h3 className="truncate text-sm font-medium tracking-tight">
                <Link
                  href={`/docs/components/${item.name}`}
                  className="outline-none after:absolute after:inset-0 after:z-20"
                >
                  {item.title}
                </Link>
              </h3>
            </ViewTransition>
            {showCategory ? (
              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                <Icon className="size-3" aria-hidden="true" />
                {label}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "text-xs text-pretty text-muted-foreground",
              size === "hero" ? "line-clamp-3 sm:text-sm" : "line-clamp-2",
            )}
          >
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover/card:text-foreground">
            View
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform duration-[var(--duration-normal)] group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
            />
          </span>
          <CopyButton
            value={command}
            variant="ghost"
            size="sm"
            tone="success"
            copiedLabel="Copied"
            // Contains the visible text, so a voice user can say what they see.
            aria-label={`Copy install command: add ${item.name}`}
            className="relative z-30 h-7 gap-1.5 px-2 font-mono text-[0.6875rem] text-muted-foreground hover:text-foreground [&_svg]:size-3"
          >
            add {item.name.length > 18 ? `${item.name.slice(0, 16)}…` : item.name}
          </CopyButton>
        </div>

        {/* A cursor-following wash of light. Over everything but the link, and
            too faint to change how the text reads. */}
        <span
          aria-hidden="true"
          className="spotlight pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-[var(--duration-slow)] group-hover/card:opacity-100"
        />
      </div>
    </li>
  );
}
