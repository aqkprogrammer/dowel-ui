"use client";

import { cn } from "@dowel-ui/react";
import { Code2, Eye, Layers, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import type { ProPreviewStory } from "~/lib/pro-previews.generated";

import { PartsOverlay, partColour, useParts, type PartSpec } from "./parts-overlay";
import { CodePanel } from "./site/code-panel";
import { FilterChips } from "./site/filter-chips";
import { StoryPreview, getStoryNames } from "./story-preview";

/**
 * Prerendered markup, presented as what it is: a picture.
 *
 * `inert` because everything in here looks operable and none of it is — a
 * sidebar that does not open is a worse answer than one that is plainly not
 * offering to. It also takes the whole subtree out of the tab order and out of
 * the accessibility tree, which is what makes the `role="img"` above it honest
 * rather than a label sitting on top of a hundred unreachable controls.
 */
function Still({ html, label }: { html: string; label: string }) {
  return (
    <div role="img" aria-label={label}>
      <div inert dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * A component example: what it looks like, and the code behind it.
 *
 * The rendered result is what someone is here to see first, so it opens on
 * the preview with the code one switch away, and the examples — every story
 * the tests run — are chips across the top. The switch is a pair of toggle
 * buttons rather than tabs because there is one stage that changes what it
 * shows, not two panels.
 */
export interface PreviewProps {
  component: string;
  /** Source shown in the Code view. */
  source?: string;
  /** Title of the code view: the installed path. */
  sourceTitle?: string;
  /**
   * Markup rendered at build time, shown instead of a live example.
   *
   * How a licensed block is previewed. Rendering one live would mean importing
   * it into a client component, and a client component's imports are a chunk
   * the browser downloads — which published the whole paid catalogue from
   * pages that merely happened to show a preview.
   */
  prerendered?: ProPreviewStory[];
  /** What that markup shows, for anyone who cannot see it. */
  prerenderedLabel?: string;
  /** Where the playground opens on this component, if it can. */
  playgroundHref?: string;
  /** Taller stage, for whole screens. */
  size?: "component" | "block";
  /**
   * The components this preview is built from, with the slot names each
   * declares. Given, the toolbar offers a "Parts" view that finds and labels
   * them in the rendered screen.
   */
  parts?: PartSpec[];
  className?: string;
  children?: ReactNode;
}

const NO_PARTS: PartSpec[] = [];

function storyLabel(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function Preview({
  component,
  source,
  sourceTitle,
  prerendered,
  prerenderedLabel,
  playgroundHref,
  size = "component",
  parts: partSpecs,
  className,
  children,
}: PreviewProps) {
  const stories = prerendered
    ? prerendered.map((entry) => entry.name)
    : getStoryNames(component);
  const [story, setStory] = useState(stories[0] ?? "");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [partsOn, setPartsOn] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const specs = partSpecs ?? NO_PARTS;
  const showingParts = partsOn && view === "preview" && specs.length > 0;
  const found = useParts(stage, specs, showingParts);
  const lit = focus ?? pinned;

  if (stories.length === 0 && !children) return null;

  const counts = new Map<string, number>();
  for (const part of found) counts.set(part.name, (counts.get(part.name) ?? 0) + 1);

  const still = prerendered?.find((entry) => entry.name === story) ?? prerendered?.[0];
  const viewButton = (value: "preview" | "code", label: string, Icon: typeof Eye) => (
    <button
      type="button"
      aria-pressed={view === value}
      disabled={value === "code" && !source}
      onClick={() => {
        setView(value);
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-40",
        view === value
          ? "bg-[var(--pane-raised)] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "not-prose overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--pane)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--hairline)] px-2.5 py-2">
        <div
          role="group"
          aria-label="View"
          className="flex items-center gap-0.5 rounded-lg border border-[var(--hairline)] bg-background/50 p-0.5"
        >
          {viewButton("preview", "Preview", Eye)}
          {viewButton("code", "Code", Code2)}
        </div>

        {stories.length > 1 && view === "preview" ? (
          <FilterChips
            label="Examples"
            chips={stories.map((name) => ({ id: name, label: storyLabel(name) }))}
            value={story}
            onChange={setStory}
            className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 [&_button]:h-7 [&_button]:text-xs"
          />
        ) : (
          <span className="flex-1" />
        )}

        {specs.length > 0 && view === "preview" ? (
          <button
            type="button"
            aria-pressed={partsOn}
            onClick={() => {
              setPartsOn((value) => !value);
              setPinned(null);
              setFocus(null);
            }}
            className={cn(
              "ms-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
              partsOn
                ? "bg-[var(--pane-raised)] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers aria-hidden="true" className="size-3.5" />
            Parts
          </button>
        ) : null}

        {playgroundHref ? (
          <Link
            href={playgroundHref}
            className="ms-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55"
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" />
            Playground
          </Link>
        ) : null}
      </div>

      {showingParts ? (
        // The legend is the accessible version of the overlay: each part, its
        // colour, and how many of it the current example shows.
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--hairline)] px-3 py-2">
          <span className="me-1 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Built from
          </span>
          {specs.map((spec, index) => {
            const count = counts.get(spec.name) ?? 0;
            return (
              <button
                key={spec.name}
                type="button"
                aria-pressed={pinned === spec.name}
                disabled={count === 0}
                onPointerEnter={() => {
                  setFocus(spec.name);
                }}
                onPointerLeave={() => {
                  setFocus(null);
                }}
                onFocus={() => {
                  setFocus(spec.name);
                }}
                onBlur={() => {
                  setFocus(null);
                }}
                onClick={() => {
                  setPinned((current) => (current === spec.name ? null : spec.name));
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/55",
                  "disabled:cursor-default disabled:opacity-45",
                  lit === spec.name
                    ? "border-[var(--hairline-strong)] bg-[var(--pane-raised)] text-foreground"
                    : "border-[var(--hairline)] text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: partColour(index) }}
                />
                {spec.title}
                <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                  {count === 0 ? "not shown" : `×${String(count)}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "preview" ? (
        <>
          {/* The surface scrolls its own overflow rather than widening the
              page. A block is a full application surface and its intrinsic
              width can exceed the column on a narrow screen. `min-w-min` lets
              the inner grid grow to the content's own width so the scrollbar
              lands here, while still filling — and centring within — the
              column when content is small. */}
          <div
            // Reachable by keyboard when a wide block overflows it.
            tabIndex={0}
            role="region"
            aria-label={`${component} preview`}
            className="stage-surface overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-inset"
          >
            <div
              className={cn(
                "grid min-w-min place-items-center [perspective:2000px]",
                size === "block" ? "min-h-[28rem] p-4 sm:p-8" : "min-h-[22rem] p-8 sm:p-12",
                showingParts && "py-10 sm:py-14",
              )}
            >
              {/* Tilted back in Parts view, so the boxes float above the
                  screen they were found in. The overlay measures in this
                  element's own layout, which the tilt does not change. */}
              <div
                ref={stage}
                className={cn(
                  "relative [transform-style:preserve-3d]",
                  "transition-transform duration-700 ease-[var(--ease-out-quint)]",
                  showingParts &&
                    "motion-safe:[transform:rotateX(16deg)_rotateZ(-3deg)_scale(0.92)]",
                )}
              >
                {children ??
                  (still ? (
                    <Still html={still.html} label={prerenderedLabel ?? component} />
                  ) : (
                    <StoryPreview component={component} story={story} />
                  ))}
                {showingParts ? <PartsOverlay parts={found} specs={specs} focus={lit} /> : null}
              </div>
            </div>
          </div>
          {still ? (
            <p className="border-t border-[var(--hairline)] px-4 py-2.5 text-xs text-muted-foreground">
              A still, rendered at build time from the same story the tests run. The block
              itself is interactive; the copy that runs is the one the CLI installs.
            </p>
          ) : null}
        </>
      ) : source ? (
        <CodePanel
          code={source}
          title={sourceTitle ?? `${component}.tsx`}
          collapseAfter={32}
          lineNumbers
          className="rounded-none border-0"
        />
      ) : null}
    </div>
  );
}
